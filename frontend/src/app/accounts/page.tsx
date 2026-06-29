'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { 
  Plus, Pencil, Trash2, CheckCircle2, CreditCard, X, Palette, Star, 
  Eye, Search, Calendar, FileText, Settings, RefreshCw, Filter, Info 
} from 'lucide-react';

interface Account {
  id: number;
  name: string;
  is_default: boolean;
  color: string;
  initial_balance: number;
  has_credit_card: boolean;
  credit_limit?: number;
  closing_day?: number;
  due_day?: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Form states (Editar/Criar)
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isDefault, setIsDefault] = useState(false);
  const [initialBalance, setInitialBalance] = useState('0');
  const [hasCreditCard, setHasCreditCard] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  // Estados de Visualização Detalhada (Novas Funcionalidades)
  const [isVisualizeOpen, setIsVisualizeOpen] = useState(false);
  const [isVizLoading, setVizLoading] = useState(false);
  const [visualizingDetails, setVisualizingDetails] = useState<any | null>(null);
  
  // Filtros de Visualização
  const [vizSearch, setVizSearch] = useState("");
  const [vizMethods, setVizMethods] = useState<string[]>([]);
  const [vizStartDate, setVizStartDate] = useState("");
  const [vizEndDate, setVizEndDate] = useState("");

  // Atributos de atalho rápido no cabeçalho do visualizador
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);
  const [shortcutColor, setShortcutColor] = useState('#3b82f6');
  const [shortcutLimit, setShortcutLimit] = useState('');
  const [isSavingShortcut, setIsSavingShortcut] = useState(false);

  const colors = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Cinza', value: '#6b7280' },
    { name: 'Preto', value: '#111827' },
  ];

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounts/');
      setAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const resetForm = () => {
    setName('');
    setColor('#3b82f6');
    setIsDefault(false);
    setInitialBalance('0');
    setHasCreditCard(false);
    setCreditLimit('');
    setClosingDay('');
    setDueDay('');
    setEditingId(null);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setColor(acc.color);
    setIsDefault(acc.is_default);
    setInitialBalance(acc.initial_balance.toString());
    setHasCreditCard(acc.has_credit_card);
    setCreditLimit(acc.credit_limit?.toString() || '');
    setClosingDay(acc.closing_day?.toString() || '');
    setDueDay(acc.due_day?.toString() || '');
    setIsModalOpen(true);
  };

  // Abre a gaveta de visualização do extrato detalhado
  const handleOpenVisualize = (acc: Account) => {
    setVizSearch("");
    setVizMethods([]);
    setVizStartDate("");
    setVizEndDate("");
    setShortcutColor(acc.color);
    setShortcutLimit(acc.credit_limit?.toString() || '');
    setIsShortcutOpen(false);
    
    setVisualizingDetails({
      account: acc,
      balance: 0,
      credit_spent: 0,
      credit_available: 0,
      transactions: []
    });
    setIsVisualizeOpen(true);
    fetchVisualizingDetails(acc.id, "", [], "", "");
  };

  const fetchVisualizingDetails = async (
    id: number, 
    search: string, 
    methods: string[], 
    start: string, 
    end: string
  ) => {
    setVizLoading(true);
    try {
      let url = `/accounts/${id}/detailed?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (start) url += `start_date=${start}&`;
      if (end) url += `end_date=${end}&`;
      if (methods.length > 0) {
        methods.forEach(m => {
          url += `payment_methods=${m}&`;
        });
      }
      const res = await api.get(url);
      setVisualizingDetails(res.data);
    } catch (err) {
      console.error('Erro ao buscar extrato detalhado:', err);
    } finally {
      setVizLoading(false);
    }
  };

  // Efeito reativo para recarregar o extrato ao mudar filtros
  useEffect(() => {
    if (isVisualizeOpen && visualizingDetails?.account?.id) {
      fetchVisualizingDetails(
        visualizingDetails.account.id, 
        vizSearch, 
        vizMethods, 
        vizStartDate, 
        vizEndDate
      );
    }
  }, [vizSearch, vizMethods, vizStartDate, vizEndDate, isVisualizeOpen]);

  const handleSaveShortcut = async () => {
    if (!visualizingDetails?.account?.id) return;
    setIsSavingShortcut(true);
    try {
      const acc = visualizingDetails.account;
      const payload = {
        name: acc.name,
        color: shortcutColor,
        is_default: acc.is_default,
        initial_balance: acc.initial_balance,
        has_credit_card: acc.has_credit_card,
        credit_limit: acc.has_credit_card ? parseFloat(shortcutLimit || "0") : null,
        closing_day: acc.closing_day,
        due_day: acc.due_day
      };
      
      await api.put(`/accounts/${acc.id}`, payload);
      showToast('success', 'Configurações de conta atualizadas!');
      setIsShortcutOpen(false);
      
      // Atualiza listas
      fetchAccounts();
      fetchVisualizingDetails(acc.id, vizSearch, vizMethods, vizStartDate, vizEndDate);
    } catch (err) {
      showToast('error', 'Erro ao atualizar configurações da conta');
    } finally {
      setIsSavingShortcut(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!visualizingDetails?.account?.id) return;
    const id = visualizingDetails.account.id;
    try {
      let url = `/accounts/${id}/pdf?`;
      if (vizSearch) url += `search=${encodeURIComponent(vizSearch)}&`;
      if (vizStartDate) url += `start_date=${vizStartDate}&`;
      if (vizEndDate) url += `end_date=${vizEndDate}&`;
      if (vizMethods.length > 0) {
        vizMethods.forEach(m => {
          url += `payment_methods=${m}&`;
        });
      }
      
      // Faz o download via Blob para segurança total com JWT
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `extrato_${visualizingDetails.account.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast('error', 'Erro ao gerar extrato em PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        name, 
        color, 
        is_default: isDefault,
        initial_balance: parseFloat(initialBalance),
        has_credit_card: hasCreditCard,
        credit_limit: hasCreditCard ? parseFloat(creditLimit) : null,
        closing_day: hasCreditCard ? parseInt(closingDay) : null,
        due_day: hasCreditCard ? parseInt(dueDay) : null
      };
      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
      } else {
        await api.post('/accounts/', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchAccounts();
      showToast('success', editingId ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!');
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao salvar conta');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta conta? (Apenas contas sem transações podem ser excluídas)')) return;
    try {
      await api.delete(`/accounts/${id}`);
      fetchAccounts();
      showToast('success', 'Conta excluída com sucesso!');
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao excluir conta');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.put(`/accounts/${id}`, { is_default: true });
      fetchAccounts();
      showToast('success', 'Conta padrão definida com sucesso!');
    } catch (err) {}
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const toggleMethodFilter = (m: string) => {
    if (vizMethods.includes(m)) {
      setVizMethods(vizMethods.filter(x => x !== m));
    } else {
      setVizMethods([...vizMethods, m]);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[200] px-6 py-4.5 rounded-3xl shadow-xl flex items-center space-x-3 text-sm font-black border animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <CheckCircle2 size={18} />
            <span>{toast.text}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Minhas Contas</h1>
            <p className="text-gray-400 text-sm font-medium">Gerencie seus bancos, carteiras e consulte extratos interativos.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={20} />
            <span>ADICIONAR CONTA</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 bg-gray-100 rounded-[2.5rem] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {accounts.map((acc) => (
              <div 
                key={acc.id} 
                className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
              >
                {/* Indicador de cor lateral */}
                <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: acc.color }}></div>

                <div className="flex justify-between items-start mb-6">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: acc.color }}
                  >
                    <CreditCard size={28} />
                  </div>
                  {acc.is_default && (
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full flex items-center gap-1.5 animate-in zoom-in-50">
                      <Star size={12} fill="currentColor" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Padrão</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 mb-8">
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{acc.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Conta Bancária / Carteira</p>
                </div>

                <div className="space-y-3 mt-6 border-t border-gray-50 pt-6">
                  {/* BOTÃO VISUALIZAR EXTRATO */}
                  <button 
                    onClick={() => handleOpenVisualize(acc)}
                    className="w-full py-3 bg-blue-50/70 text-blue-600 hover:bg-blue-600 hover:text-white font-black rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye size={14} /> VISUALIZAR EXTRATO
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenEdit(acc)}
                      className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-black rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Pencil size={12} /> EDITAR
                    </button>
                    <button 
                      onClick={() => handleDelete(acc.id)}
                      className="p-2.5 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {!acc.is_default && (
                  <button 
                    onClick={() => handleSetDefault(acc.id)}
                    className="w-full mt-2 py-2 text-[10px] font-black text-gray-400 hover:text-yellow-600 uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Definir como Padrão
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL DETALHADO / DRAWER DO EXTRATO BANCÁRIO (NOVA FUNCIONALIDADE PREMIUM) */}
        {/* ========================================================================= */}
        {isVisualizeOpen && visualizingDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-[120] animate-in fade-in duration-300">
            <div className="bg-[#f8fafc] w-full max-w-4xl h-screen shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-right duration-300">
              
              {/* Botão Fechar */}
              <button 
                onClick={() => setIsVisualizeOpen(false)} 
                className="absolute top-6 right-6 p-2 bg-white border border-gray-100 text-gray-500 hover:text-gray-900 rounded-2xl transition-all z-[130] cursor-pointer shadow-sm hover:shadow-md"
                title="Fechar Extrato"
              >
                <X size={24} />
              </button>

              {/* 1. Header do Extrato com a cor da conta no fundo do ícone */}
              <div className="bg-white p-8 border-b border-gray-100 flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6 pr-20">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gray-200"
                    style={{ backgroundColor: shortcutColor }}
                  >
                    <CreditCard size={28} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">{visualizingDetails.account.name}</h2>
                      <button 
                        onClick={() => setIsShortcutOpen(!isShortcutOpen)}
                        className="p-1 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg border border-gray-100 hover:bg-gray-100 transition-all cursor-pointer"
                        title="Atalho de Configuração Rápida"
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Extrato de Conta e Fluxo de Caixa</p>
                  </div>
                </div>

                {/* PDF e Atualização rápida */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownloadPDF}
                    className="px-4 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all cursor-pointer shadow-lg shadow-blue-100 flex items-center gap-2"
                  >
                    <FileText size={14} /> GERAR EXTRATO PDF
                  </button>
                </div>
              </div>

              {/* 2. Painel Colapsável de Atalho de Configurações */}
              {isShortcutOpen && (
                <div className="bg-white px-8 py-6 border-b border-gray-100 shadow-inner grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top duration-300">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Cor do Indicador</span>
                    <div className="flex flex-wrap gap-1.5">
                      {colors.map(col => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setShortcutColor(col.value)}
                          className={`w-6 h-6 rounded-lg transition-all ${shortcutColor === col.value ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                          style={{ backgroundColor: col.value }}
                        />
                      ))}
                    </div>
                  </div>

                  {visualizingDetails.account.has_credit_card && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Limite de Cartão de Crédito</span>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={shortcutLimit}
                          onChange={(e) => setShortcutLimit(e.target.value)}
                          placeholder="0,00"
                          className="w-full pl-9 pr-3 py-2 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-300 bg-gray-50/50"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-end">
                    <button
                      onClick={handleSaveShortcut}
                      disabled={isSavingShortcut}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingShortcut ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÃO'}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Blocos de Métricas e Balanços */}
              <div className="p-8 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Saldo Corrente Líquido</span>
                  <p className="text-xl font-black text-gray-900">{formatCurrency(visualizingDetails.balance)}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Livre em Conta Hoje</p>
                </div>

                {visualizingDetails.account.has_credit_card ? (
                  <>
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Fatura Acumulada Crédito</span>
                      <p className="text-xl font-black text-red-600">{formatCurrency(visualizingDetails.credit_spent)}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Fatura Gasta do Mês Corrente</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Limite Disponível no Cartão</span>
                      <p className="text-xl font-black text-blue-600">{formatCurrency(visualizingDetails.credit_available)}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Limite Livre de R$ {visualizingDetails.account.credit_limit}</p>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <Info className="text-gray-400 flex-shrink-0" size={24} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-gray-800">Sem Cartão de Crédito Ativo</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Esta conta opera apenas no débito / saldo real de conta corrente.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Barra de Filtros de Transações (Interativa) */}
              <div className="px-8 py-3 bg-white border-t border-b border-gray-100 flex-shrink-0 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Busca por descrição */}
                <div className="relative md:col-span-4">
                  <Search className="absolute left-3 top-3 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar descrição..." 
                    value={vizSearch}
                    onChange={(e) => setVizSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-300 transition-all bg-gray-50/50"
                  />
                </div>

                {/* Filtro Multi-Escolha por Tipo */}
                <div className="md:col-span-4 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider mr-1">Forma:</span>
                  {[
                    { label: 'Débito', value: 'DEBIT' },
                    { label: 'Crédito', value: 'CREDIT_CARD' },
                    { label: 'Pix', value: 'PIX' }
                  ].map(m => {
                    const isSelected = vizMethods.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        onClick={() => toggleMethodFilter(m.value)}
                        className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-100 text-blue-700 border-blue-200' 
                            : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {/* Filtros de Datas */}
                <div className="md:col-span-4 grid grid-cols-2 gap-1.5">
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 text-gray-400" size={12} />
                    <input 
                      type="date"
                      value={vizStartDate}
                      onChange={(e) => setVizStartDate(e.target.value)}
                      className="w-full pl-8 pr-2 py-2 border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-tight focus:outline-none focus:border-blue-300 bg-gray-50/50"
                      title="Data de Início"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 text-gray-400" size={12} />
                    <input 
                      type="date"
                      value={vizEndDate}
                      onChange={(e) => setVizEndDate(e.target.value)}
                      disabled={!vizStartDate}
                      className="w-full pl-8 pr-2 py-2 border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-tight focus:outline-none focus:border-blue-300 bg-gray-50/50 disabled:opacity-50"
                      title="Data de Fim"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Tabela de Transações com Extrato Filtrado */}
              <div className="flex-1 overflow-y-auto p-8 pt-4 relative">
                {isVizLoading ? (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-50 animate-in fade-in duration-200">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest animate-pulse">Filtrando extrato ao vivo...</p>
                  </div>
                ) : null}

                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50 select-none">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Forma</th>
                        <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {visualizingDetails.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center text-gray-400 font-bold italic text-xs">
                            Nenhuma transação corresponde aos filtros informados.
                          </td>
                        </tr>
                      ) : (
                        visualizingDetails.transactions.map((t: any) => {
                          const isIncome = t.type === 'income';
                          const pm = t.payment_method;
                          let pmDesc = "Débito";
                          if (pm === "CREDIT_CARD") pmDesc = "Crédito";
                          else if (pm === "PIX") pmDesc = "Pix";
                          else if (pm === "OTHERS") pmDesc = "Outros";

                          return (
                            <tr key={t.id} className="hover:bg-gray-50/40 transition-colors">
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-gray-900">
                                  {new Date(t.date).toLocaleDateString('pt-BR')}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-gray-900">{t.description}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                  pm === 'CREDIT_CARD' 
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                                    : pm === 'PIX' 
                                      ? 'bg-teal-50 border-teal-100 text-teal-700' 
                                      : 'bg-blue-50 border-blue-100 text-blue-700'
                                }`}>
                                  {pmDesc}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-xs font-black ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                  {isIncome ? '+ ' : '- '}{formatCurrency(t.amount)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Modal Adicionar/Editar */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-2xl transition-all z-[110] cursor-pointer"
                title="Fechar"
              >
                <X size={24} />
              </button>

              <div className="p-8 border-b border-gray-100 flex-shrink-0 pr-16">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editingId ? 'Editar Conta' : 'Nova Conta'}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Configurações de Banco</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Nome do Banco / Conta</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Itaú, Nubank, Dinheiro Físico"
                    className="w-full px-5 py-3.5 border border-gray-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-300 transition-all bg-gray-50/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Saldo Inicial</label>
                  <div className="relative">
                    <span className="absolute left-5 top-3.5 text-sm text-gray-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-11 pr-5 py-3.5 border border-gray-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-300 transition-all bg-gray-50/30"
                    />
                  </div>
                </div>

                {/* Seleção de cor */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Cor da Conta no Painel</label>
                  <div className="flex flex-wrap gap-2.5">
                    {colors.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setColor(col.value)}
                        className={`w-8 h-8 rounded-xl transition-all relative ${color === col.value ? 'ring-4 ring-blue-500/20 scale-110 shadow-lg' : ''}`}
                        style={{ backgroundColor: col.value }}
                        title={col.name}
                      >
                        {color === col.value && (
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            <CheckCircle2 size={16} fill="currentColor" className="text-blue-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cartão de Crédito Ativo */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={hasCreditCard}
                      onChange={(e) => setHasCreditCard(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider block">Possui Cartão de Crédito</span>
                      <span className="text-[10px] text-gray-400 font-bold block leading-tight">Vincule limites e faturas do cartão a esta conta.</span>
                    </div>
                  </label>

                  {hasCreditCard && (
                    <div className="space-y-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-3 duration-200">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Limite do Cartão</label>
                        <div className="relative">
                          <span className="absolute left-5 top-3.5 text-sm text-gray-400 font-bold">R$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            required={hasCreditCard}
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            placeholder="0,00"
                            className="w-full pl-11 pr-5 py-3.5 border border-gray-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-300 transition-all bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Fechamento (Dia)</label>
                          <input 
                            type="number" 
                            min="1"
                            max="31"
                            required={hasCreditCard}
                            value={closingDay}
                            onChange={(e) => setClosingDay(e.target.value)}
                            placeholder="Ex: 5"
                            className="w-full px-5 py-3.5 border border-gray-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-300 transition-all bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Vencimento (Dia)</label>
                          <input 
                            type="number" 
                            min="1"
                            max="31"
                            required={hasCreditCard}
                            value={dueDay}
                            onChange={(e) => setDueDay(e.target.value)}
                            placeholder="Ex: 15"
                            className="w-full px-5 py-3.5 border border-gray-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-300 transition-all bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 select-none">
                  <input 
                    type="checkbox"
                    id="isDefaultCheck"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isDefaultCheck" className="text-xs font-black text-gray-800 uppercase tracking-wider cursor-pointer">
                    Definir como Conta Padrão
                  </label>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 cursor-pointer"
                >
                  {editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR CONTA'}
                </button>

              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
