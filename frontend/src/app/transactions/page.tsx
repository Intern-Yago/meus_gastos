'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Plus, X, Pencil, Trash2, FileText, Upload, Download, Loader2, Filter, ChevronDown, Calendar, CreditCard, Tag, Bell, BellOff, CheckCircle2, Search, TrendingUp, TrendingDown, ShoppingBag, Coffee, Car, Home, Phone, Briefcase, Heart, Utensils, Zap, Shield, Gift, Plane, Smartphone, Globe, Landmark, DollarSign, Wallet, PiggyBank } from 'lucide-react';

interface ImportProgress {
  current: number;
  total: number;
  status: 'idle' | 'processing' | 'completed';
}

interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
}

const CATEGORY_ICONS: any = {
  Tag, ShoppingBag, Coffee, Car, Home, Phone, Briefcase, Heart, Utensils, Zap, Shield, Gift, Plane, Smartphone, Globe, Landmark, DollarSign, Wallet, PiggyBank
};

function CategoryIcon({ name, size = 18 }: { name?: string, size?: number }) {
  const IconComp = CATEGORY_ICONS[name || 'Tag'] || Tag;
  return <IconComp size={size} />;
}

interface Account {
  id: number;
  name: string;
  is_default: boolean;
  color: string;
}

interface Transaction {
  id: number;
  amount: number;
  amount_paid: number;
  description: string;
  category_id: number;
  account_id?: number;
  account?: Account;
  date: string;
  payment_method: string;
  is_fixed_expense: boolean;
  is_recurrent: boolean;
  installments: number;
  attachment_path?: string;
  due_day?: number;
  notify_me: boolean;
  is_paid: boolean;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Filter states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');

  // Progress state
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0, status: 'idle' });
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFixed, setIsFixed] = useState(false);
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('OTHERS');
  const [installments, setInstallments] = useState('1');
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [dueDay, setDueDay] = useState<string>(new Date().getDate().toString());
  const [notifyMe, setNotifyMe] = useState(true);
  const [isPaid, setIsPaid] = useState(true);
  const [amountPaid, setAmountPaid] = useState('');

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('expense');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const params: any = {};
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;
      if (filterType) params.type = filterType;
      if (filterCategoryId) params.category_id = filterCategoryId;
      if (filterPaymentMethod) params.payment_method = filterPaymentMethod;
      if (filterAccountId) params.account_id = filterAccountId;

      const txRes = await api.get('/transactions/', { params });
      const catRes = await api.get('/categories/');
      const accRes = await api.get('/accounts/');
      setTransactions(txRes.data);
      setCategories(catRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  }, [filterStartDate, filterEndDate, filterType, filterCategoryId, filterPaymentMethod, filterAccountId]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterType('');
    setFilterCategoryId('');
    setFilterPaymentMethod('');
    setFilterAccountId('');
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const [txType, setTxType] = useState<'income' | 'expense'>('expense');

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategoryId('');
    // Definir conta padrão ao resetar para novo registro
    const defaultAcc = accounts.find(a => a.is_default);
    setAccountId(defaultAcc ? defaultAcc.id.toString() : '');
    
    setDate(new Date().toISOString().split('T')[0]);
    setIsFixed(false);
    setIsRecurrent(false);
    setPaymentMethod('OTHERS');
    setInstallments('1');
    setAttachmentPath(null);
    setEditingId(null);
    setDueDay(new Date().getDate().toString());
    setNotifyMe(true);
    setIsPaid(true);
    setAmountPaid('');
    setTxType('expense');
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingId(tx.id);
    setAmount(tx.amount.toString());
    setAmountPaid(tx.amount_paid?.toString() || '0');
    setDescription(tx.description);
    setCategoryId(tx.category_id.toString());
    setAccountId(tx.account_id?.toString() || '');
    setDate(new Date(tx.date).toISOString().split('T')[0]);
    setIsFixed(tx.is_fixed_expense || false);
    setIsRecurrent(tx.is_recurrent || false);
    setPaymentMethod(tx.payment_method || 'OTHERS');
    setInstallments(tx.installments?.toString() || '1');
    setAttachmentPath(tx.attachment_path || null);
    setDueDay(tx.due_day?.toString() || new Date().getDate().toString());
    setNotifyMe(tx.notify_me);
    setIsPaid(tx.is_paid);
    
    const cat = categories.find(c => c.id === tx.category_id);
    setTxType(cat?.type || 'expense');
    
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/files/upload-receipt', formData);
      setAttachmentPath(res.data.file_path);
    } catch (err) { alert('Erro no upload'); }
    finally { setIsUploading(false); }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        amount: parseFloat(amount),
        amount_paid: parseFloat(amountPaid) || 0,
        description,
        category_id: parseInt(categoryId),
        account_id: accountId ? parseInt(accountId) : null,
        date: new Date(date).toISOString(),
        is_fixed_expense: isFixed,
        is_recurrent: isRecurrent,
        payment_method: paymentMethod,
        installments: parseInt(installments),
        attachment_path: attachmentPath,
        due_day: isFixed ? parseInt(dueDay) : null,
        notify_me: isFixed ? notifyMe : false,
        is_paid: isPaid
      };
      if (editingId) await api.put(`/transactions/${editingId}`, payload);
      else await api.post('/transactions/', payload);
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) { alert('Erro ao salvar'); }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Excluir?')) return;
    try { await api.delete(`/transactions/${id}`); fetchData(); } catch (err) {}
  };

  const handleTogglePaid = async (tx: Transaction) => {
    try {
      await api.put(`/transactions/${tx.id}`, { ...tx, is_paid: !tx.is_paid });
      fetchData();
    } catch (err) {}
  };

  const paymentMethods = [
    { value: 'CASH', label: 'Dinheiro' },
    { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
    { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
    { value: 'PIX', label: 'PIX' },
    { value: 'TRANSFER', label: 'Transferência' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'OTHERS', label: 'Outros' },
  ];

  const progressPercentage = importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Progress Tracker */}
        {importProgress.status !== 'idle' && (
          <div className="bg-white rounded-3xl shadow-xl border border-blue-100 overflow-hidden animate-in slide-in-from-top-4">
            <button onClick={() => setIsProgressExpanded(!isProgressExpanded)} className="w-full p-5 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Loader2 className="animate-spin" size={20} /></div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-gray-900 uppercase">Arquivos em processamento</h3>
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Sincronizando dados...</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-xs font-black text-gray-900">{progressPercentage}%</span>
                  <div className="w-24 bg-gray-100 h-1 rounded-full mt-1 overflow-hidden"><div className="bg-blue-600 h-full transition-all" style={{ width: `${progressPercentage}%` }} /></div>
                </div>
                <ChevronDown size={20} className={`text-gray-400 transition-transform ${isProgressExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Transações</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsFilterVisible(!isFilterVisible)} className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold transition-all ${isFilterVisible ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100 shadow-sm'}`}>
              <Filter size={18} />
              <span>Filtros</span>
            </button>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-blue-200 active:scale-95">
              <Plus size={18} />
              <span>Novo Registro</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {isFilterVisible && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Início</label>
              <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Fim</label>
              <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tipo</label>
              <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Todos</option>
                <option value="income">Entrada</option>
                <option value="expense">Saída</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Categoria</label>
              <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)}>
                <option value="">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Conta</label>
              <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)}>
                <option value="">Todas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}

              </select>
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="w-full h-[42px] bg-gray-50 text-gray-400 hover:text-red-500 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors">Limpar Filtros</button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">Nenhum registro encontrado.</td></tr>
                ) : transactions.map((t) => (
                  <tr key={t.id} className={`hover:bg-blue-50/30 transition-colors group ${!t.is_paid ? 'bg-orange-50/10' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => handleTogglePaid(t)} className={`transition-all active:scale-90 ${t.is_paid ? 'text-green-500' : 'text-orange-400 hover:text-green-400'}`}>
                        <CheckCircle2 size={22} fill={t.is_paid ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${!t.is_paid ? 'text-orange-800' : 'text-gray-900'}`}>{t.description}</span>
                          {t.notify_me && <Bell size={12} className="text-blue-500" />}
                        </div>
                        {t.is_fixed_expense && <span className="text-[9px] font-black text-purple-600 mt-0.5 tracking-tighter">CONTA FIXA • DIA {t.due_day}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full w-fit">
                          <CategoryIcon name={categories.find(c => c.id === t.category_id)?.icon} size={14} />
                          <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">{categories.find(c => c.id === t.category_id)?.name || 'Outros'}</span>
                        </div>
                        {t.account && (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.account.color }}></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{t.account.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className={`text-sm font-black ${categories.find(c => c.id === t.category_id)?.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {!t.is_paid && (
                          <button 
                            onClick={() => handleOpenEditModal(t)} 
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg"
                            title="Pagar Parcial"
                          >
                            <CreditCard size={16} />
                          </button>
                        )}
                        <button onClick={() => handleOpenEditModal(t)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteTransaction(t.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Transação */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editingId ? 'Editar Registro' : 'Novo Registro'}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Gestão Financeira</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmitTransaction} className="p-8 space-y-6 overflow-y-auto">
                {/* Seletor de Tipo Visual */}
                <div className="flex p-1 bg-gray-100 rounded-[1.2rem] gap-1">
                  <button 
                    type="button"
                    onClick={() => { setTxType('expense'); setCategoryId(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all ${txType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <TrendingDown size={16} /> SAÍDA
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setTxType('income'); setCategoryId(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all ${txType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <TrendingUp size={16} /> ENTRADA
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest text-nowrap">Valor do Lançamento</label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm ${txType === 'income' ? 'text-green-500' : 'text-red-500'}`}>R$</span>
                      <input type="number" step="0.01" required className={`w-full bg-gray-50 border-none rounded-[1.2rem] pl-10 pr-4 py-4 font-black text-lg focus:ring-2 outline-none shadow-inner ${txType === 'income' ? 'text-green-700 focus:ring-green-500' : 'text-red-700 focus:ring-red-500'}`} value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Data</label>
                    <input type="date" required className="w-full bg-gray-50 border-none rounded-[1.2rem] px-4 py-4 text-gray-900 font-black focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Descrição</label>
                  <input type="text" required className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" value={description} onChange={e => setDescription(e.target.value)} placeholder={txType === 'income' ? 'Ex: Salário, Venda...' : 'Ex: Ifood, Aluguel...'} />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Selecione uma Categoria</label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-52 overflow-y-auto p-3 bg-gray-50 rounded-[1.5rem] shadow-inner">
                    {categories.filter(c => c.type === txType).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id.toString())}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 ${categoryId === c.id.toString() ? (txType === 'income' ? 'bg-green-600 border-green-600 text-white shadow-lg scale-105' : 'bg-red-600 border-red-600 text-white shadow-lg scale-105') : 'bg-white border-transparent text-gray-400 hover:border-gray-200'}`}
                      >
                        <CategoryIcon name={c.icon} size={20} />
                        <span className="text-[9px] font-black uppercase mt-2 truncate w-full text-center">{c.name}</span>
                      </button>
                    ))}
                    {categories.filter(c => c.type === txType).length === 0 && (
                      <div className="col-span-full py-8 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Nenhuma categoria de {txType === 'income' ? 'entrada' : 'saída'} cadastrada.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Conta Bancária</label>
                  <select required className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-inner appearance-none" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Comprovante / Anexo</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-[1.2rem] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${attachmentPath ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                    {isUploading ? (
                      <Loader2 className="animate-spin text-blue-500" />
                    ) : attachmentPath ? (
                      <>
                        <CheckCircle2 className="text-green-500" />
                        <span className="text-xs font-bold text-green-700">Arquivo anexado com sucesso</span>
                      </>
                    ) : (
                      <>
                        <Upload className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Clique para subir imagem ou PDF</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 py-2 border-y border-gray-100">
                  <label className={`flex-1 flex items-center justify-center space-x-3 p-4 rounded-2xl cursor-pointer transition-all border ${isFixed ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>
                    <input type="checkbox" className="hidden" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} />
                    <ShieldCheck size={20} />
                    <span className="text-sm font-black uppercase tracking-tight">Conta Fixa</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center space-x-3 p-4 rounded-2xl cursor-pointer transition-all border ${isPaid ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-100' : 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100'}`}>
                    <input type="checkbox" className="hidden" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-black uppercase tracking-tight">{isPaid ? 'Já Pago' : 'Pendente'}</span>
                  </label>
                </div>

                {isFixed && (
                  <div className="p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 space-y-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1.5"><label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Dia do Vencimento (Mensal)</label><input type="number" min="1" max="31" className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-gray-900 font-black shadow-sm focus:ring-1 focus:ring-blue-300" value={dueDay} onChange={e => setDueDay(e.target.value)} /></div>
                      <div className="flex-1 pt-4"><label className="flex items-center gap-3 cursor-pointer group"><div className={`w-10 h-6 rounded-full transition-colors relative ${notifyMe ? 'bg-blue-600' : 'bg-gray-300'}`} onClick={() => setNotifyMe(!notifyMe)}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifyMe ? 'translate-x-4' : ''}`} /></div><span className="text-[10px] font-black text-blue-700 uppercase">Aviso por E-mail</span></label></div>
                    </div>
                  </div>
                )}

                {!isPaid && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-orange-400 uppercase ml-1 tracking-widest">Valor Já Pago (Parcial)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="w-full bg-orange-50/50 border-none rounded-[1.2rem] pl-10 pr-4 py-4 text-gray-900 font-black text-lg focus:ring-2 focus:ring-orange-500 outline-none shadow-inner" 
                        value={amountPaid} 
                        onChange={e => setAmountPaid(e.target.value)} 
                        placeholder="Quanto já pagou?"
                      />
                    </div>
                    {parseFloat(amount) > 0 && (
                      <div className="px-2">
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                          <span className="text-gray-400">Progresso</span>
                          <span className="text-orange-600">{Math.round((parseFloat(amountPaid || '0') / parseFloat(amount)) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full transition-all" style={{ width: `${Math.min((parseFloat(amountPaid || '0') / parseFloat(amount)) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 mt-4">FINALIZAR LANÇAMENTO</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
function ShieldCheck({ size }: { size: number }) {
    return <CreditCard size={size} />;
}
