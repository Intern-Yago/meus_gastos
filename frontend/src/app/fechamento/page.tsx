'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { 
  AlertTriangle, CheckCircle, Calendar, Paperclip, Trash, Loader2, 
  ChevronLeft, ChevronRight, Bot, FileText, PieChart, ArrowRight,
  Upload, Sparkles, Tag, Check, Award
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  category?: { id: number; name: string } | null;
  category_id?: number | null;
  attachment_path?: string | null;
}

interface DuplicateGroup {
  amount: number;
  date: string;
  type: string;
  transactions: {
    id: number;
    description: string;
    amount: number;
    date: string;
    category: string;
  }[];
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  deadline?: string;
}

export default function MonthEndClosingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data States
  const [uncategorized, setUncategorized] = useState<Transaction[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [missingAttachments, setMissingAttachments] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // File upload state
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  
  // AI response state
  const [aiVerdict, setAiVerdict] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadStepData();
  }, [currentStep]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories/');
      setCategories(res.data);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const loadStepData = async () => {
    setIsLoading(true);
    try {
      if (currentStep === 1) {
        const res = await api.get('/transactions/closing/uncategorized');
        setUncategorized(res.data);
      } else if (currentStep === 2) {
        const res = await api.get('/transactions/closing/duplicates');
        setDuplicates(res.data);
      } else if (currentStep === 3) {
        const res = await api.get('/transactions/closing/missing-attachments');
        setMissingAttachments(res.data);
      } else if (currentStep === 4) {
        const res = await api.get('/goals');
        setGoals(res.data);
      } else if (currentStep === 6) {
        fetchAiVerdict();
      }
    } catch (err) {
      console.error('Erro ao carregar dados do fechamento:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Categorize transaction
  const handleCategoryChange = async (txId: number, categoryId: number) => {
    try {
      await api.put(`/transactions/${txId}`, { category_id: categoryId });
      setUncategorized(prev => prev.filter(tx => tx.id !== txId));
    } catch (err) {
      alert('Erro ao atualizar categoria.');
    }
  };

  // Step 2: Resolve duplicates
  const handleDeleteTransaction = async (txId: number) => {
    if (!confirm('Deseja realmente excluir esta transação duplicada?')) return;
    try {
      await api.delete(`/transactions/${txId}`);
      // Remove a transação do grupo e atualiza o estado
      setDuplicates(prev => {
        return prev.map(group => {
          return {
            ...group,
            transactions: group.transactions.filter(t => t.id !== txId)
          };
        }).filter(group => group.transactions.length > 1); // se restou só 1 ou nenhuma, remove o grupo
      });
    } catch (err) {
      alert('Erro ao excluir transação.');
    }
  };

  const handleIgnoreDuplicate = (groupIndex: number) => {
    setDuplicates(prev => prev.filter((_, idx) => idx !== groupIndex));
  };

  // Step 3: Handle Attachment upload
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const handleFileUpload = async (txId: number, file: File) => {
    setUploadingId(txId);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/files/upload-receipt', formData);
      const filePath = res.data.file_path;
      
      // Vincula o anexo à transação no banco de dados
      await api.put(`/transactions/${txId}`, { attachment_path: filePath });
      setMissingAttachments(prev => prev.filter(tx => tx.id !== txId));
    } catch (err) {
      alert('Erro ao enviar comprovante.');
    } finally {
      setUploadingId(null);
    }
  };

  // Step 6: AI Verdict
  const fetchAiVerdict = async () => {
    setIsAiLoading(true);
    try {
      const prompt = "Finora, faça uma análise executiva completa do meu fechamento de mês. Use a ferramenta get_financial_summary_tool e get_spending_summary_tool para analisar meus dados reais e me dar o veredito sofisticado, focado em melhorias de caixa.";
      const res = await api.post('/ai/chat', { 
        messages: [{ role: 'user', content: prompt }],
        save_history: false
      });
      setAiVerdict(res.data.response);
    } catch (err) {
      setAiVerdict('Erro técnico ao consultar a IA Finora para o fechamento.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDiscussInChat = async () => {
    setIsLoading(true);
    try {
      await api.post('/ai/memory', { 
        content: `Veredito do Fechamento de Mês (Junho/2026): ${aiVerdict}` 
      });
      const discussPrompt = "Quero conversar sobre o meu veredito de fechamento de mês.";
      window.location.href = `/chat?init_prompt=${encodeURIComponent(discussPrompt)}`;
    } catch (err) {
      console.error('Erro ao preparar discussão no chat:', err);
      window.location.href = '/chat';
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Categorização', desc: 'Classificar transações sem categoria' },
    { num: 2, label: 'Duplicatas', desc: 'Limpar transações repetidas' },
    { num: 3, label: 'Comprovantes', desc: 'Anexar comprovantes pendentes' },
    { num: 4, label: 'Metas', desc: 'Revisar metas de poupança' },
    { num: 5, label: 'Relatório', desc: 'Gerar PDF consolidado do mês' },
    { num: 6, label: 'Veredito IA', desc: 'Inteligência executiva Finora' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Rotina Mensal</span>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-1">Fechamento de Mês</h1>
            <p className="text-sm font-medium text-gray-400">Um ritual guiado de inteligência financeira para organizar seu fluxo de caixa.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-400">Passo</span>
            <span className="text-3xl font-black text-blue-600">{currentStep}</span>
            <span className="text-sm font-black text-gray-400">/ 6</span>
          </div>
        </div>

        {/* PROGRESS WIZARD BAR */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-50/40 overflow-x-auto">
          <div className="flex justify-between items-center min-w-[700px] gap-4">
            {steps.map((s, idx) => (
              <div key={s.num} className="flex items-center gap-2 flex-1 last:flex-initial">
                <button 
                  onClick={() => s.num < currentStep && setCurrentStep(s.num)}
                  disabled={s.num >= currentStep}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                    currentStep === s.num 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 cursor-pointer' 
                      : s.num < currentStep 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200 cursor-pointer' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {s.num < currentStep ? <Check size={16} /> : s.num}
                </button>
                <div className="text-left flex-1">
                  <p className={`text-xs font-black uppercase tracking-widest ${currentStep === s.num ? 'text-blue-600' : s.num < currentStep ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</p>
                  <p className="text-[9px] font-medium text-gray-300 truncate max-w-[120px]">{s.desc}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-[2px] w-full max-w-[40px] rounded ${s.num < currentStep ? 'bg-green-300' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CONTENT BOX */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-6 md:p-10 min-h-[400px] flex flex-col justify-between">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 space-y-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Coletando seus dados financeiros...</p>
            </div>
          ) : (
            <div className="flex-1">
              
              {/* STEP 1: CATEGORIZATION */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <Tag className="text-blue-600" size={22} /> 1. Transações sem Categoria
                    </h2>
                    <p className="text-xs font-medium text-gray-400 mt-1">Identificamos despesas sem categoria precisa ou na categoria genérica "Outros". Classifique-as abaixo para calibrar seus relatórios.</p>
                  </div>
                  
                  {uncategorized.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-green-50/50 rounded-[2rem] border border-green-100/50">
                      <CheckCircle className="text-green-500 mb-2" size={36} />
                      <h3 className="text-sm font-black text-green-800 uppercase tracking-widest">Tudo Organizado!</h3>
                      <p className="text-xs text-green-600 font-medium">Todas as suas transações recentes estão devidamente categorizadas.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto pr-2">
                      {uncategorized.map((tx) => (
                        <div key={tx.id} className="flex flex-col md:flex-row items-start md:items-center justify-between py-3 gap-3">
                          <div>
                            <p className="text-sm font-black text-gray-900">{tx.description}</p>
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 uppercase mt-0.5">
                              <Calendar size={12} /> {new Date(tx.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <span className="text-sm font-black text-red-600">R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <select 
                              onChange={(e) => handleCategoryChange(tx.id, Number(e.target.value))}
                              defaultValue=""
                              className="text-xs font-black bg-gray-50 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px]"
                            >
                              <option value="" disabled>Escolher...</option>
                              {categories.filter(c => c.type === 'expense').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DUPLICATES */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <AlertTriangle className="text-orange-500" size={22} /> 2. Possíveis Duplicatas
                    </h2>
                    <p className="text-xs font-medium text-gray-400 mt-1">Buscamos lançamentos com o mesmo valor, tipo e data nos últimos 45 dias. Revise e remova registros acidentais.</p>
                  </div>

                  {duplicates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-green-50/50 rounded-[2rem] border border-green-100/50">
                      <CheckCircle className="text-green-500 mb-2" size={36} />
                      <h3 className="text-sm font-black text-green-800 uppercase tracking-widest">Nenhuma Duplicata!</h3>
                      <p className="text-xs text-green-600 font-medium">Não encontramos transações duplicadas em seu banco.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                      {duplicates.map((group, gIdx) => (
                        <div key={gIdx} className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-center border-b pb-2 border-gray-100">
                            <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Valor: R$ {group.amount.toFixed(2)} | Data: {new Date(group.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            <button 
                              onClick={() => handleIgnoreDuplicate(gIdx)}
                              className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                            >
                              Ignorar Grupo
                            </button>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {group.transactions.map((tx) => (
                              <div key={tx.id} className="flex justify-between items-center py-2">
                                <div>
                                  <p className="text-xs font-black text-gray-800">{tx.description}</p>
                                  <p className="text-[9px] text-gray-400 font-bold uppercase">{tx.category}</p>
                                </div>
                                <button 
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  title="Excluir Transação"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: MISSING ATTACHMENTS */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <Paperclip className="text-blue-600" size={22} /> 3. Comprovantes Pendentes
                    </h2>
                    <p className="text-xs font-medium text-gray-400 mt-1">Listamos suas maiores despesas pagas recentes que não possuem comprovante anexo. Adicione-os para facilitar o envio para o contador.</p>
                  </div>

                  {missingAttachments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-green-50/50 rounded-[2rem] border border-green-100/50">
                      <CheckCircle className="text-green-500 mb-2" size={36} />
                      <h3 className="text-sm font-black text-green-800 uppercase tracking-widest">Tudo Arquivado!</h3>
                      <p className="text-xs text-green-600 font-medium">Suas transações mais relevantes já contam com comprovantes anexos.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto pr-2">
                      {missingAttachments.map((tx) => (
                        <div key={tx.id} className="flex flex-col md:flex-row items-start md:items-center justify-between py-3 gap-3">
                          <div>
                            <p className="text-sm font-black text-gray-900">{tx.description}</p>
                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 uppercase mt-0.5">
                              <Calendar size={12} /> {new Date(tx.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <span className="text-sm font-black text-red-600">R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            
                            <input 
                              type="file" 
                              className="hidden" 
                              ref={el => { fileInputRefs.current[tx.id] = el }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(tx.id, file);
                              }}
                              accept="image/*,application/pdf"
                            />
                            <button 
                              onClick={() => fileInputRefs.current[tx.id]?.click()}
                              disabled={uploadingId === tx.id}
                              className="text-xs font-black bg-blue-50 text-blue-600 rounded-xl px-3 py-2 hover:bg-blue-100 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                              {uploadingId === tx.id ? (
                                <>
                                  <Loader2 className="animate-spin" size={12} /> Enviando...
                                </>
                              ) : (
                                <>
                                  <Upload size={12} /> Anexar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: GOALS PROGRESS */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <Award className="text-blue-600" size={22} /> 4. Monitoramento de Metas
                    </h2>
                    <p className="text-xs font-medium text-gray-400 mt-1">Confira a evolução das suas metas financeiras de poupança acumuladas até este fechamento de mês.</p>
                  </div>

                  {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-[2rem] border border-gray-100">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhuma meta ativa cadastrada.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2">
                      {goals.map((g) => {
                        const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) || 0;
                        return (
                          <div key={g.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                            <div>
                              <p className="text-sm font-black text-gray-800">{g.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Progresso: {pct}%</p>
                            </div>
                            <div className="space-y-1">
                              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color || '#3b82f6' }} />
                              </div>
                              <div className="flex justify-between text-[10px] font-black text-gray-500">
                                <span>R$ {g.current_amount.toFixed(2)}</span>
                                <span>R$ {g.target_amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: REPORTS GENERATOR */}
              {currentStep === 5 && (
                <div className="space-y-6 text-center py-8">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto"><FileText size={32} /></div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">5. Emissão de Relatório</h2>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed">Chegou a hora de documentar o seu caixa. Gere o relatório completo do fechamento do mês (PDF) consolidado para auditoria e prestação de contas pro seu contador.</p>
                    
                    <div className="pt-2">
                      <a 
                        href={`/reports/financial-summary?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}&format=pdf`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-6 py-4 bg-gray-900 hover:bg-black text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
                      >
                        <FileText size={16} /> Emitir Relatório PDF
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: AI VERDICT PANEL */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <Bot className="text-blue-600 animate-pulse" size={22} /> 6. Veredito Final da Finora
                    </h2>
                    <p className="text-xs font-medium text-gray-400 mt-1">Nossa Inteligência Artificial está analisando seu balanço e histórico final do mês para traçar planos e melhorias de rentabilidade.</p>
                  </div>

                  {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="animate-spin text-blue-600" size={32} />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic animate-pulse">Finora está calculando seus insights...</p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-blue-50/30 to-gray-50/30 border border-blue-50 rounded-[2rem] p-6 space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md"><Sparkles size={16} /></div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Análise de Balanço IA</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-medium">
                        <ReactMarkdown>{aiVerdict}</ReactMarkdown>
                      </div>
                      <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button 
                          onClick={handleDiscussInChat}
                          className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1.5 uppercase tracking-widest disabled:opacity-50"
                        >
                          Conversar no Chat <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* NAVIGATION FOOTER */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-8">
            <button 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center gap-2 px-5 py-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 transition-all active:scale-95"
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            {currentStep < 6 ? (
              <button 
                onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-200 transition-all active:scale-95"
              >
                Concluir Fechamento <CheckCircle size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}