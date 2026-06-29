'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowLeft, 
  Loader2, 
  Building2, 
  Calendar, 
  CreditCard,
  Target,
  ArrowRight,
  PieChart as PieChartIcon,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Wallet,
  LayoutGrid,
  Pencil,
  Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface ProjectItem {
    id: number;
    name: string;
    allocated: number;
    spent: number;
    remaining: number;
    type: string;
}

interface ProjectSummary {
  id: number;
  name: string;
  type: string;
  total_budget: number;
  revenue: number;
  costs: number;
  profit: number;
  profit_margin: number;
  transactions: any[];
  items: ProjectItem[];
}

interface Account {
    id: number;
    name: string;
    is_default: boolean;
}

export default function BusinessDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toast and Confirmation states
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Modal Registration State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [projectItemId, setProjectItemId] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');

  // Modal Item State (Categorias)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAllocation, setNewItemAllocation] = useState('');
  const [newItemType, setNewItemType] = useState<'income' | 'expense'>('expense');
  const [isSavingItem, setIsSavingItem] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!summary) setIsLoading(true);
    try {
      const [sRes, accRes] = await Promise.all([
        api.get(`/projects/${id}/summary`),
        api.get('/accounts/')
      ]);
      setSummary(sRes.data);
      setAccounts(accRes.data);
      
      const defaultAcc = accRes.data.find((a: Account) => a.is_default);
      if (defaultAcc) setAccountId(defaultAcc.id.toString());
    } catch (err) {
      console.error('Erro ao buscar DRE do negócio');
    } finally {
      setIsLoading(false);
    }
  }, [id, summary]);

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/transactions/', {
        amount: parseFloat(amount),
        description,
        date: new Date(date).toISOString(),
        account_id: parseInt(accountId),
        project_id: parseInt(id as string),
        project_item_id: projectItemId ? parseInt(projectItemId) : null,
        type: txType,
        is_paid: true,
        payment_method: 'OTHERS'
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setProjectItemId('');
      showToast('success', 'Movimentação registrada com sucesso!');
      fetchSummary();
    } catch (err) {
      showToast('error', 'Erro ao registrar movimentação');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingItem(true);
    try {
        const payload = {
            name: newItemName,
            budget_allocation: parseFloat(newItemAllocation) || 0,
            type: newItemType
        };

        if (editingItemId) {
            await api.put(`/projects/items/${editingItemId}`, payload);
            showToast('success', 'Categoria atualizada com sucesso!');
        } else {
            await api.post(`/projects/${id}/items`, payload);
            showToast('success', 'Categoria criada com sucesso!');
        }
        
        setIsItemModalOpen(false);
        setNewItemName('');
        setNewItemAllocation('');
        setEditingItemId(null);
        fetchSummary();
    } catch (err) {
        showToast('error', 'Erro ao salvar categoria do negócio');
    } finally {
        setIsSavingItem(false);
    }
  };

  const handleOpenEditItem = (item: ProjectItem) => {
    setEditingItemId(item.id);
    setNewItemName(item.name);
    setNewItemAllocation(item.allocated.toString());
    setNewItemType(item.type as 'income' | 'expense');
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
        await api.delete(`/projects/items/${itemId}`);
        showToast('success', 'Categoria de negócio excluída!');
        fetchSummary();
    } catch (err) {
        showToast('error', 'Erro ao excluir categoria');
    } finally {
        setItemToDelete(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const chartData = [
    { name: 'Receita', value: summary?.revenue || 0, color: '#10b981' },
    { name: 'Custos', value: summary?.costs || 0, color: '#ef4444' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/business')} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{summary?.name || 'Carregando...'}</h1>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Demonstrativo de Resultados (DRE)</p>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 cursor-pointer"
          >
            <Plus size={18} /> Novo Lançamento
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="text-gray-400 font-bold uppercase text-[10px]">Gerando DRE...</p>
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card Principal de Performance */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Receita Total</p>
                  <h3 className="text-3xl font-black text-green-600">{formatCurrency(summary.revenue)}</h3>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Custos Totais</p>
                  <h3 className="text-3xl font-black text-red-600">{formatCurrency(summary.costs)}</h3>
                </div>
                <div className={`p-8 rounded-[2.5rem] shadow-xl ${summary.profit >= 0 ? 'bg-gray-900 text-white shadow-gray-200' : 'bg-red-600 text-white shadow-red-100'}`}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 opacity-60">Resultado Líquido</p>
                  <h3 className="text-3xl font-black">{formatCurrency(summary.profit)}</h3>
                </div>
              </div>

              {/* Seção de Categorias do Negócio (Teto de Gastos) */}
              <div className="bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Categorias Business</h3>
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl"><Target size={20} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Botão de Adicionar Categoria */}
                    <button 
                        onClick={() => { setEditingItemId(null); setNewItemName(''); setNewItemAllocation(''); setNewItemType('expense'); setIsItemModalOpen(true); }}
                        className="p-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all group cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                            <Plus size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Nova Categoria Business</span>
                    </button>

                    {summary.items.map((item) => {
                        const progress = item.allocated > 0 ? (item.spent / item.allocated) * 100 : 0;
                        const isIncome = item.type === 'income';
                        
                        return (
                            <div key={item.id} className="p-6 bg-gray-50 rounded-[2rem] border border-transparent hover:border-emerald-200 transition-all group relative overflow-hidden">
                                {itemToDelete === item.id && (
                                  <div className="absolute inset-0 bg-gray-950/95 z-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
                                    <p className="text-white font-black text-sm mb-1">Excluir Categoria?</p>
                                    <p className="text-gray-400 text-[10px] mb-3 leading-tight">Os lançamentos perderão esta categoria.</p>
                                    <div className="flex gap-2 w-full">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setItemToDelete(null); }}
                                        className="flex-1 py-1.5 bg-gray-800 text-white font-bold rounded-lg text-[10px] hover:bg-gray-700 cursor-pointer"
                                      >
                                        NÃO
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                        className="flex-1 py-1.5 bg-red-600 text-white font-black rounded-lg text-[10px] hover:bg-red-700 cursor-pointer"
                                      >
                                        EXCLUIR
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{item.name}</span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isIncome ? 'text-green-500' : 'text-red-500'}`}>{isIncome ? 'RECEITA' : 'CUSTO'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleOpenEditItem(item)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer"><Pencil size={14} /></button>
                                        <button onClick={() => setItemToDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer"><Trash2 size={14} /></button>
                                        {!isIncome && item.allocated > 0 && (
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${progress > 90 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{Math.round(progress)}%</span>
                                        )}
                                    </div>
                                </div>
                                
                                {!isIncome && item.allocated > 0 && (
                                    <div className="w-full bg-white h-2 rounded-full overflow-hidden mb-3">
                                        <div className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                                    </div>
                                )}

                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-gray-400">{isIncome ? 'Entrada' : 'Gasto'}: {formatCurrency(item.spent)}</span>
                                    {item.allocated > 0 && !isIncome && (
                                        <span className="text-emerald-600">Teto: {formatCurrency(item.allocated)}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
              </div>

              {/* Transações Recentes do Negócio */}
              <div className="bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Movimentações do Silo</h3>
                    <button 
                        onClick={() => router.push(`/transactions?project_id=${id}`)}
                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer"
                    >
                        Ver Todas <ArrowRight size={12} />
                    </button>
                </div>
                <div className="space-y-4">
                    {summary.transactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {tx.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{tx.description}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <p className={`text-sm font-black ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                            </p>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Sidebar de Métricas */}
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-50">
                        <DollarSign size={40} />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Margem de Lucro</p>
                    <h3 className="text-4xl font-black text-gray-900 mb-2">{summary.profit_margin.toFixed(1)}%</h3>
                    <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden mt-4">
                        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, summary.profit_margin))}%` }} />
                    </div>
                </div>

                <div className="bg-emerald-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                    <Building2 size={32} className="mb-6 opacity-60 relative z-10" />
                    <h4 className="text-lg font-black tracking-tight mb-2 uppercase relative z-10">Gestão Business</h4>
                    <p className="text-xs font-medium text-emerald-100/80 leading-relaxed relative z-10">
                        O DRE do Silo Business consolida faturamento e custos vinculados. Mantenha os lançamentos em dia para uma visão precisa do seu lucro líquido.
                    </p>
                </div>
            </div>

          </div>
        ) : null}

        {/* MODAL: NOVO LANÇAMENTO BUSINESS */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/30">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Lançamento Business</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Registrar movimentação na unidade</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all cursor-pointer">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleSubmitTransaction} className="p-8 space-y-6">
                {/* Tipo de Transação */}
                <div className="flex p-1 bg-gray-100 rounded-[1.2rem] gap-1">
                  <button type="button" onClick={() => setTxType('expense')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all cursor-pointer ${txType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><TrendingDown size={16} /> CUSTO</button>
                  <button type="button" onClick={() => setTxType('income')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all cursor-pointer ${txType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><TrendingUp size={16} /> RECEITA</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Valor</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                      <input type="number" step="0.01" required className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-4 py-4 text-gray-900 font-black text-xl focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Data</label>
                    <input type="date" required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-black focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Descrição</label>
                  <input type="text" required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Venda de produto, Aluguel de loja..." />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Categoria do Negócio</label>
                  <select required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none appearance-none cursor-pointer" value={projectItemId} onChange={e => setProjectItemId(e.target.value)}>
                    <option value="">Geral / Sem Categoria</option>
                    {summary?.items.filter(item => item.type === txType).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Conta Bancária</label>
                  <select required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none appearance-none cursor-pointer" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>

                <button type="submit" className="w-full bg-emerald-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-emerald-100 active:scale-95 mt-4 uppercase cursor-pointer">Confirmar Registro</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: GERENCIAR CATEGORIA/TETO BUSINESS */}
        {isItemModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
              <button onClick={() => setIsItemModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-2xl cursor-pointer"><X size={20} /></button>
              <div className="p-8 border-b border-gray-100 bg-emerald-50/20">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{editingItemId ? 'Editar Categoria' : 'Nova Categoria Business'}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{summary?.name}</p>
              </div>
              <form onSubmit={handleSaveItem} className="p-8 space-y-6">
                
                {/* Tipo de Categoria (Direcional) */}
                <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
                  <button type="button" onClick={() => setNewItemType('expense')} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all cursor-pointer ${newItemType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>CUSTO</button>
                  <button type="button" onClick={() => setNewItemType('income')} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all cursor-pointer ${newItemType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>RECEITA</button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome da Categoria</label>
                  <input type="text" required autoFocus className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ex: Vendas, Aluguel, Impostos..." />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Teto de Gasto (Opcional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                    <input type="number" step="0.01" className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner" value={newItemAllocation} onChange={e => setNewItemAllocation(e.target.value)} placeholder="0,00" />
                  </div>
                  <p className="text-[9px] text-gray-400 font-medium italic ml-1">Deixe 0 se não quiser definir um limite.</p>
                </div>

                <button type="submit" disabled={isSavingItem} className={`w-full text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer ${newItemType === 'income' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-emerald-900 hover:bg-black shadow-emerald-100'}`}>
                  {isSavingItem ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'SALVAR CATEGORIA'}
                </button>
              </form>
            </div>
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
