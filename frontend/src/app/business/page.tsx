'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  LayoutGrid, 
  ArrowRight, 
  TrendingUp, 
  Wallet, 
  Percent, 
  DollarSign, 
  X, 
  Camera, 
  CreditCard,
  Building2,
  Power,
  PowerOff,
  Filter,
  CheckCircle2,
  Loader2,
  Pencil
} from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: number;
  name: string;
  total_budget: number;
  target_date?: string;
  color: string;
  icon: string;
  status: string;
  type: string;
  is_business?: boolean;
  cnpj?: string;
  logo_path?: string;
}

interface ProjectSummary {
  id: number;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  profit_margin: number;
}

export default function BusinessPage() {
  const [businesses, setBusinesses] = useState<Project[]>([]);
  const [summaries, setSummaries] = useState<Record<number, ProjectSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'active' | 'deactivated' | ''>('active');
  
  // Toast and Confirmation states
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [businessToToggle, setBusinessToToggle] = useState<Project | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [budget, setTotalBudget] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : '';
      const res = await api.get(`/projects/?is_business=true${statusParam}`); 
      setBusinesses(res.data);
      
      const summariesMap: Record<number, ProjectSummary> = {};
      await Promise.all(res.data.map(async (p: Project) => {
        try {
          const sRes = await api.get(`/projects/${p.id}/summary`);
          summariesMap[p.id] = sRes.data;
        } catch (e) {}
      }));
      setSummaries(summariesMap);
    } catch (err) {
      console.error('Erro ao buscar negócios');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        total_budget: parseFloat(budget) || 0,
        type: 'business',
        is_business: true,
        cnpj,
        status: 'active'
      };

      let res;
      if (editingId) {
        res = await api.put(`/projects/${editingId}`, payload);
        showToast('success', 'Unidade atualizada com sucesso!');
      } else {
        res = await api.post('/projects/', payload);
        showToast('success', 'Unidade criada com sucesso!');
      }

      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        try {
            const upRes = await api.post('/files/upload-receipt', formData);
            await api.put(`/projects/${res.data.id}`, { logo_path: upRes.data.file_path });
        } catch (uploadErr) {
            console.error('Erro no upload da logo:', uploadErr);
        }
      }

      setIsModalOpen(false);
      resetForm();
      fetchBusinesses();
    } catch (err) {
      showToast('error', 'Erro ao salvar unidade');
    }
  };

  const resetForm = () => {
      setEditingId(null);
      setName('');
      setTotalBudget('');
      setCnpj('');
      setLogoFile(null);
      setLogoPreview(null);
  };

  const handleOpenEdit = (biz: Project) => {
      setEditingId(biz.id);
      setName(biz.name);
      setTotalBudget(biz.total_budget.toString());
      setCnpj(biz.cnpj || '');
      const token = localStorage.getItem('token');
      setLogoPreview(biz.logo_path ? `${api.defaults.baseURL}/files/download?path=${biz.logo_path}${token ? `&token=${token}` : ''}` : null);
      setIsModalOpen(true);
  };

  const handleToggleStatus = async (biz: Project) => {
    const newStatus = biz.status === 'active' ? 'deactivated' : 'active';
    try {
        await api.put(`/projects/${biz.id}`, { status: newStatus });
        showToast('success', `Unidade ${newStatus === 'active' ? 'reativada' : 'desativada'} com sucesso!`);
        fetchBusinesses();
    } catch (err) {
        showToast('error', 'Erro ao alterar status da unidade');
    } finally {
        setBusinessToToggle(null);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meus Negócios</h1>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest text-[10px] mt-1">Gestão de Unidades e faturamento corporativo</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                    <Filter size={16} className="text-gray-400" />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-transparent border-none rounded-xl text-sm font-black text-gray-900 focus:ring-0 cursor-pointer p-0 pr-6"
                    >
                        <option value="active">Ativos</option>
                        <option value="deactivated">Desativados</option>
                        <option value="">Todos</option>
                    </select>
                </div>
             </div>

             <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-gray-200 active:scale-95 transition-all flex items-center gap-3 text-xs tracking-widest hover:bg-black cursor-pointer"
              >
                <Plus size={20} /> CADASTRAR UNIDADE
              </button>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/30">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editingId ? 'Editar Unidade' : 'Nova Unidade'}</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Silo de Inteligência Business</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all cursor-pointer"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-center mb-4">
                    <label className="relative group cursor-pointer">
                        <div className="w-24 h-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 group-hover:border-emerald-400 group-hover:text-emerald-500 transition-all overflow-hidden">
                            {logoFile ? (
                                <img loading="lazy" 
 src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" alt="Logo Preview" />
                            ) : logoPreview ? (
                                <img loading="lazy" 
 src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                            ) : (
                                <>
                                    <Camera size={24} />
                                    <span className="text-[8px] font-black uppercase mt-1">Logo</span>
                                </>
                            )}
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                    </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome Fantasia</label>
                  <input type="text" required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Filial Centro, Loja Online..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">CNPJ (Opcional)</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Investimento Inicial</label>
                        <input type="number" step="0.01" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-black focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none" value={budget} onChange={e => setTotalBudget(e.target.value)} placeholder="0,00" />
                    </div>
                </div>

                <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 mt-4 uppercase tracking-tight cursor-pointer">
                    {editingId ? 'Salvar Alterações' : 'Ativar Unidade'}
                </button>
              </form>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm flex flex-col items-center justify-center space-y-4 animate-pulse">
                  <div className="w-16 h-16 bg-gray-100 rounded-3xl" />
                  <div className="w-32 h-6 bg-gray-100 rounded-lg" />
                  <div className="w-full h-20 bg-gray-50 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {businesses.map((biz) => {
              const summary = summaries[biz.id];
              const isDeactivated = biz.status === 'deactivated';
              
              return (
                <div 
                  key={biz.id} 
                  className={`bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col ${isDeactivated ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                  {businessToToggle?.id === biz.id && (
                    <div className="absolute inset-0 bg-gray-950/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                      <Power size={40} className="text-amber-500 mb-4 animate-bounce" />
                      <p className="text-white font-black text-lg mb-2">
                        {biz.status === 'active' ? 'Desativar Unidade?' : 'Reativar Unidade?'}
                      </p>
                      <p className="text-gray-400 text-xs mb-6">
                        {biz.status === 'active' 
                          ? 'Desativar esta unidade ocultará novos lançamentos temporariamente.' 
                          : 'Reativar esta unidade trará de volta todas as suas funções e DRE.'}
                      </p>
                      <div className="flex gap-3 w-full">
                        <button 
                          onClick={() => setBusinessToToggle(null)}
                          className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl text-xs hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          CANCELAR
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(biz)}
                          className="flex-1 py-3 bg-amber-600 text-white font-black rounded-xl text-xs hover:bg-amber-700 transition-colors cursor-pointer"
                        >
                          CONFIRMAR
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    {biz.logo_path ? (
                        <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-lg border border-gray-100 cursor-pointer" onClick={() => handleOpenEdit(biz)}>
                            <img loading="lazy" 
 src={`${api.defaults.baseURL}/files/download?path=${biz.logo_path}${localStorage.getItem('token') ? `&token=${localStorage.getItem('token')}` : ''}`} className="w-full h-full object-cover" alt="Logo" />
                        </div>
                    ) : (
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl cursor-pointer ${isDeactivated ? 'bg-gray-400' : 'bg-blue-600'}`} onClick={() => handleOpenEdit(biz)}>
                            <Building2 size={32} />
                        </div>
                    )}
                    <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block ${isDeactivated ? 'bg-gray-100 text-gray-500' : (summary?.profit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}`}>
                            {isDeactivated ? 'DESATIVADO' : (summary?.profit >= 0 ? 'LUCRO' : 'PREJUÍZO')}
                        </div>
                        <div className="mt-2 flex justify-end gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleOpenEdit(biz)} className="p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer"><Pencil size={14} /></button>
                             <button 
                                onClick={() => setBusinessToToggle(biz)}
                                className={`p-2 rounded-xl transition-all cursor-pointer ${isDeactivated ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                             >
                                {isDeactivated ? <Power size={14} /> : <PowerOff size={14} />}
                             </button>
                        </div>
                    </div>
                  </div>

                  <h3 className={`text-2xl font-black text-gray-900 mb-6 cursor-pointer ${isDeactivated ? 'line-through text-gray-400' : ''}`} onClick={() => !isDeactivated && handleOpenEdit(biz)}>{biz.name}</h3>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp size={10} /> Faturamento</p>
                      <p className="text-sm font-black text-gray-900">{formatCurrency(summary?.revenue || 0)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Percent size={10} /> Margem</p>
                      <p className="text-sm font-black text-blue-600">{summary?.profit_margin.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className={`mb-8 p-6 rounded-[2rem] border ${isDeactivated ? 'bg-gray-50 border-gray-100' : 'bg-blue-50/50 border-blue-100'}`}>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                    <p className={`text-3xl font-black ${isDeactivated ? 'text-gray-400' : (summary?.profit >= 0 ? 'text-green-600' : 'text-red-600')}`}>
                      {formatCurrency(summary?.profit || 0)}
                    </p>
                  </div>

                  {!isDeactivated ? (
                      <Link 
                        href={`/business/${biz.id}`}
                        className="w-full py-4 bg-gray-900 text-white font-black rounded-[1.5rem] hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 mt-auto uppercase text-xs tracking-widest cursor-pointer"
                      >
                        Acessar DRE <ArrowRight size={18} />
                      </Link>
                  ) : (
                      <button 
                        disabled
                        className="w-full py-4 bg-gray-100 text-gray-400 font-black rounded-[1.5rem] flex items-center justify-center gap-2 mt-auto cursor-not-allowed uppercase text-[10px] tracking-widest"
                      >
                        Unidade Inativa
                      </button>
                  )}
                </div>
              );
            })}
            
            {businesses.length === 0 && (
              <div className="col-span-full py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-center">
                <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest">Nenhuma unidade de negócio encontrada.</p>
                <p className="text-xs text-gray-400 mt-2">Ajuste o filtro ou cadastre sua primeira filial acima!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-8 right-8 z-[250] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-black text-xs uppercase tracking-wider animate-in slide-in-from-bottom-5 duration-300 border ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 shadow-emerald-100' : 'bg-red-600 border-red-500 shadow-red-100'}`}>
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-4 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"><X size={16} /></button>
        </div>
      )}
    </DashboardLayout>
  );
}
