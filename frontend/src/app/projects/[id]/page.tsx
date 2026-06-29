'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, use, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { 
  Home, ArrowLeft, Target, Calendar, Wallet, CheckCircle2, TrendingUp, TrendingDown, 
  LayoutGrid, Plus, Trash2, Pencil, X, Loader2, CreditCard, Tag, 
  ShoppingBag, Coffee, Car, Phone, Briefcase, Heart, Utensils, Zap, 
  Shield, Gift, Plane, Smartphone, Globe, Landmark, DollarSign, PiggyBank, Upload
} from 'lucide-react';
import Link from 'next/link';

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
  total_budget: number;
  total_income: number;
  total_expense: number;
  remaining_budget: number;
  percentage_spent: number;
  items: ProjectItem[];
  transactions: any[];
}

const CATEGORY_ICONS: any = {
  Tag, ShoppingBag, Coffee, Car, Home, Phone, Briefcase, Heart, Utensils, Zap, Shield, Gift, Plane, Smartphone, Globe, Landmark, DollarSign, Wallet, PiggyBank
};

function CategoryIcon({ name, size = 18 }: { name?: string, size?: number }) {
  const IconComp = CATEGORY_ICONS[name || 'Tag'] || Tag;
  return <IconComp size={size} />;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Transaction Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [projectItemId, setProjectItemId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [isPaid, setIsPaid] = useState(true);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('OTHERS');
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  
  // Item Modal States (Categorias do Projeto)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAllocation, setNewItemAllocation] = useState('');
  const [newItemType, setNewItemType] = useState<'income' | 'expense'>('expense');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get('/categories/'),
        api.get('/accounts/')
      ]);
      setCategories(catRes.data);
      setAccounts(accRes.data);
    } catch (err) {}
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!summary) setIsLoading(true);
    try {
      const res = await api.get(`/projects/${id}/summary`);
      setSummary(res.data);
    } catch (err) {
      console.error('Erro ao buscar resumo do projeto:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, summary]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${id}/transactions?skip=0&limit=20`);
      setTransactions(res.data.transactions);
    } catch (err) {}
  }, [id]);

  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchSummary();
    fetchTransactions();
  }, [id, fetchData, fetchSummary, fetchTransactions]);

  const resetTxForm = () => {
    setAmount('');
    setDescription('');
    setCategoryId('');
    setProjectItemId('');
    const defaultAcc = accounts.find(a => a.is_default);
    setAccountId(defaultAcc ? defaultAcc.id.toString() : '');
    setDate(new Date().toISOString().split('T')[0]);
    setTxType('expense');
    setIsPaid(true);
    setAmountPaid('');
    setAttachmentPath(null);
    setEditingTxId(null);
  };

  const handleSubmitTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        amount: parseFloat(amount),
        amount_paid: parseFloat(amountPaid) || 0,
        description,
        type: txType,
        account_id: accountId ? parseInt(accountId) : null,
        project_id: parseInt(id),
        project_item_id: projectItemId ? parseInt(projectItemId) : null,
        date: new Date(date).toISOString(),
        is_paid: isPaid,
        attachment_path: attachmentPath,
        payment_method: paymentMethod
      };

      if (editingTxId) await api.put(`/transactions/${editingTxId}`, payload);
      else await api.post('/transactions/', payload);
      
      setIsTxModalOpen(false);
      resetTxForm();
      fetchTransactions();
      fetchSummary();
    } catch (err) { alert('Erro ao salvar'); }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    setIsSaving(true);
    try {
      const payload = {
        name: newItemName,
        budget_allocation: parseFloat(newItemAllocation) || 0,
        type: newItemType
      };

      if (editingItemId) {
        await api.put(`/projects/items/${editingItemId}`, payload);
      } else {
        await api.post(`/projects/${id}/items`, payload);
      }
      setNewItemName('');
      setNewItemAllocation('');
      setEditingItemId(null);
      setIsItemModalOpen(false);
      fetchSummary();
    } catch (err) { alert('Erro ao salvar categoria'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Excluir este item?')) return;
    try {
      await api.delete(`/projects/items/${itemId}`);
      fetchSummary();
    } catch (err) {}
  };

  const handleOpenEditItem = (item: ProjectItem) => {
    setEditingItemId(item.id);
    setNewItemName(item.name);
    setNewItemAllocation(item.allocated.toString());
    setNewItemType(item.type as 'income' | 'expense');
    setIsItemModalOpen(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-blue-600" size={48} /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/projects" className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all shadow-sm">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{summary?.name}</h1>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest flex items-center gap-2">
                <LayoutGrid size={14} /> Painel de Controle do Projeto
              </p>
            </div>
          </div>
          <button 
            onClick={() => { resetTxForm(); setIsTxModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={20} /> LANÇAR MOVIMENTAÇÃO
          </button>
        </div>

        {/* Itens do Projeto */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span> Itens e Categorias do Projeto
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button 
              onClick={() => { setEditingItemId(null); setNewItemName(''); setNewItemAllocation(''); setNewItemType('expense'); setIsItemModalOpen(true); }}
              className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all group min-h-[160px] cursor-pointer"
            >
              <Plus size={24} />
              <span className="text-xs font-black uppercase tracking-widest">Nova Categoria / Teto</span>
            </button>

            {summary?.items.map((item) => {
              const itemProgress = item.allocated > 0 ? (item.spent / item.allocated) * 100 : 0;
              const isIncome = item.type === 'income';
              return (
                <div key={item.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <h4 className="font-bold text-gray-900 uppercase text-sm tracking-tight">{item.name}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isIncome ? 'text-green-500' : 'text-red-500'}`}>{isIncome ? 'ENTRADA' : 'SAÍDA'}</span>
                    </div>
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEditItem(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400">{isIncome ? 'Recebido' : 'Gasto'}: {formatCurrency(item.spent)}</span>
                      {item.allocated > 0 && !isIncome && <span className="text-blue-600">Teto: {formatCurrency(item.allocated)}</span>}
                    </div>
                    {item.allocated > 0 && !isIncome && (
                        <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${itemProgress > 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(itemProgress, 100)}%` }} />
                        </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Item/Teto */}
        {isItemModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
              <button onClick={() => setIsItemModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-2xl"><X size={20} /></button>
              <div className="p-8 border-b border-gray-100">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{editingItemId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              </div>
              <form onSubmit={handleSaveItem} className="p-8 space-y-6">
                <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
                  <button type="button" onClick={() => setNewItemType('expense')} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${newItemType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>SAÍDA</button>
                  <button type="button" onClick={() => setNewItemType('income')} className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${newItemType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>ENTRADA</button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome</label>
                  <input type="text" required className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ex: Passagens, Presentes..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Teto de Gasto (Opcional)</label>
                  <input type="number" step="0.01" className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" value={newItemAllocation} onChange={e => setNewItemAllocation(e.target.value)} placeholder="0,00" />
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'SALVAR'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Transação */}
        {isTxModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nova Movimentação</h2>
                <button onClick={() => setIsTxModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmitTx} className="p-8 space-y-6 overflow-y-auto">
                <div className="flex p-1 bg-gray-100 rounded-[1.2rem] gap-1">
                  <button type="button" onClick={() => setTxType('expense')} className={`flex-1 py-3 rounded-[1rem] font-black text-xs uppercase transition-all ${txType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>SAÍDA</button>
                  <button type="button" onClick={() => setTxType('income')} className={`flex-1 py-3 rounded-[1rem] font-black text-xs uppercase transition-all ${txType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>ENTRADA</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor (R$)</label>
                    <input type="number" step="0.01" required className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 font-black text-lg focus:ring-2 focus:ring-blue-500 shadow-inner" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</label>
                    <input type="date" required className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 font-black focus:ring-2 focus:ring-blue-500 shadow-inner" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                  <input type="text" required className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500 shadow-inner" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vincular a Item</label>
                  <select className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500 shadow-inner appearance-none" value={projectItemId} onChange={e => setProjectItemId(e.target.value)}>
                    <option value="">Geral</option>
                    {summary?.items.filter(item => item.type === txType).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conta Bancária</label>
                  <select required className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500 shadow-inner appearance-none" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black shadow-xl active:scale-95 transition-all">CONFIRMAR REGISTRO</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
