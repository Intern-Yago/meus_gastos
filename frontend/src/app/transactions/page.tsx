'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, Suspense, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Plus, Search, Filter, X, TrendingDown, TrendingUp, 
  ChevronLeft, ChevronRight, 
  CheckCircle2, Building2, Target, 
  Shield as ShieldIcon, LayoutGrid, Repeat, Trash2, 
  Edit3, Image as ImageIcon, Tag, Download,
  ExternalLink, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  color: string;
}

interface Account {
  id: number;
  name: string;
  color: string;
}

interface Project {
    id: number;
    name: string;
    is_business: boolean;
    items: {id: number, name: string}[];
    status: string;
}

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  is_paid: boolean;
  category_id: number;
  account_id: number;
  project_id?: number;
  project_item_id?: number;
  goal_id?: number;
  is_fixed_expense: boolean;
  due_day?: number;
  original_currency?: string;
  payment_method?: string;
  attachment_path?: string;
  category?: Category;
  account?: Account;
  project?: Project;
  ticker?: string;
  shares?: number;
}

function CategoryIcon({ size = 18 }: { name?: string, size?: number }) {
  return <Tag size={size} />;
}

function TransactionsContent() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<Project[]>([]);
  const [goals, setGoals] = useState<{id: number, name: string}[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [accountId, setAccountId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [projectItemId, setProjectItemId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [isPaid, setIsPaid] = useState(true);
  const [isFixed, setIsFixed] = useState(false);
  const [dueDay, setDueDay] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [paymentMethod, setPaymentMethod] = useState('OTHERS');
  const [registrationTab, setRegistrationTab] = useState<'common' | 'projects' | 'business'>('common');
  
  // Attachment states
  const [attachment, setAttachment] = useState<File | null>(null);
  const [existingAttachmentPath, setExistingAttachmentPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingAttachment, setIsEditingAttachment] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 30;

  // Filter states
  const [filterType, setFilterType] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const selectedCategoryObj = categories.find(c => c.id.toString() === categoryId);
  const isInvestmentCategory = registrationTab === 'common' && selectedCategoryObj && (
    selectedCategoryObj.name.toUpperCase().includes('INVEST') ||
    selectedCategoryObj.name.toUpperCase() === 'INVESTIMENTOS'
  );

  const fetchData = useCallback(async (targetPage: number = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
          page: targetPage.toString(),
          size: itemsPerPage.toString()
      });
      if (filterType) params.append('type', filterType);
      if (filterCategoryId) params.append('category_id', filterCategoryId);
      if (filterAccountId) params.append('account_id', filterAccountId);
      if (filterPaymentMethod) params.append('payment_method', filterPaymentMethod);
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);
      if (searchTerm.trim()) params.append('description', searchTerm.trim());

      const [txRes, catRes, accRes, projRes, goalRes] = await Promise.all([
        api.get(`/transactions/?${params.toString()}`),
        api.get('/categories/'),
        api.get('/accounts/'),
        api.get('/projects/'),
        api.get('/goals/')
      ]);

      setTransactions(txRes.data.items || []);
      setTotalPages(Math.ceil((txRes.data.total || 0) / itemsPerPage));

      const sortedCategories = (catRes.data || []).sort((a: Category, b: Category) => {
        if (a.name.toUpperCase() === 'INVESTIMENTOS') return -1;
        if (b.name.toUpperCase() === 'INVESTIMENTOS') return 1;
        return 0;
      });
      setCategories(sortedCategories);
      setAccounts(accRes.data);

      const allProjs: Project[] = projRes.data;
      setProjects(allProjs.filter(p => !p.is_business));
      setBusinesses(allProjs.filter(p => p.is_business));
      setGoals(goalRes.data);

      if (accRes.data.length > 0 && !accountId) {
          setAccountId(accRes.data[0].id.toString());
      }
    } catch (err) {
      console.error('Erro ao buscar dados');
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterCategoryId, filterAccountId, filterPaymentMethod, filterStartDate, filterEndDate, searchTerm, accountId]);

  // Capture token and parse deep-link query parameters on mount
  useEffect(() => {
    setAuthToken(localStorage.getItem('token'));

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catId = params.get('category_id');
      const payMethod = params.get('payment_method');
      const queryMonth = params.get('month');
      const queryYear = params.get('year');

      if (catId) setFilterCategoryId(catId);
      if (payMethod) setFilterPaymentMethod(payMethod);

      if (queryMonth && queryYear) {
        const m = parseInt(queryMonth);
        const y = parseInt(queryYear);
        const start = `${y}-${String(m).padStart(2, '0')}-01`;
        const end = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
        setFilterStartDate(start);
        setFilterEndDate(end);
      }
    }
  }, []);

  // Handle Search and Filter changes
  useEffect(() => {
    setCurrentPage(1); 
    const delayDebounceFn = setTimeout(() => {
        fetchData(1);
    }, searchTerm ? 400 : 0);

    return () => clearTimeout(delayDebounceFn);
  }, [filterType, filterCategoryId, filterAccountId, filterStartDate, filterEndDate, searchTerm]);

  const handlePageChange = (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
      fetchData(newPage);
  };

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
    setTicker('');
    setShares('');
    setProjectId('');
    setBusinessId('');
    setProjectItemId('');
    setGoalId('');
    setTxType('expense');
    setIsPaid(true);
    setIsFixed(false);
    setDueDay('');
    setPaymentMethod('OTHERS');
    setRegistrationTab('common');
    setAttachment(null);
    setExistingAttachmentPath(null);
    setIsEditingAttachment(true);
  };

  const handleOpenEditModal = (t: Transaction) => {
    resetForm();
    setEditingId(t.id);
    setAmount(t.amount.toString());
    setDescription(t.description);
    setDate(t.date.split('T')[0]);
    setCategoryId(t.category_id?.toString() || '');
    setTicker(t.ticker || '');
    setShares(t.shares?.toString() || '');
    setAccountId(t.account_id?.toString() || '');
    setProjectId(t.project_id?.toString() || '');
    setProjectItemId(t.project_item_id?.toString() || '');
    setGoalId(t.goal_id?.toString() || '');
    setTxType(t.type);
    setIsPaid(t.is_paid);
    setIsFixed(t.is_fixed_expense);
    setDueDay(t.due_day?.toString() || '');
    setCurrency(t.original_currency || 'BRL');
    setPaymentMethod(t.payment_method || 'OTHERS');
    setExistingAttachmentPath(t.attachment_path || null);
    setIsEditingAttachment(!t.attachment_path);
    
    if (t.project_id) {
        const isBiz = businesses.some(b => b.id === t.project_id);
        if (isBiz) {
            setRegistrationTab('business');
            setBusinessId(t.project_id.toString());
        } else {
            setRegistrationTab('projects');
            setProjectId(t.project_id.toString());
        }
    } else {
        setRegistrationTab('common');
    }
    setIsModalOpen(true);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let uploadedPath = existingAttachmentPath; 
    setIsSaving(true);
    
    if (attachment) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', attachment);
        try {
            const res = await api.post('/files/upload-receipt', formData);
            uploadedPath = res.data.file_path;
        } catch (err) {
            showToast('error', 'Erro ao enviar comprovante');
            setIsUploading(false);
            setIsSaving(false);
            return;
        } finally {
            setIsUploading(false);
        }
    }

    const selectedCategoryObj = categories.find(c => c.id.toString() === categoryId);
    const isInvestment = selectedCategoryObj && (
      selectedCategoryObj.name.toUpperCase().includes('INVEST') || 
      selectedCategoryObj.name.toUpperCase() === 'INVESTIMENTOS'
    );

    try {
      const payload = {
        amount: amount ? parseFloat(amount) : 0.0,
        description,
        date: new Date(date).toISOString(),
        category_id: registrationTab === 'common' ? (categoryId ? parseInt(categoryId) : null) : null,
        account_id: accountId ? parseInt(accountId) : null,
        project_id: registrationTab === 'projects' ? (projectId ? parseInt(projectId) : null) : (registrationTab === 'business' ? (businessId ? parseInt(businessId) : null) : null),
        project_item_id: (registrationTab !== 'common' && projectItemId) ? parseInt(projectItemId) : null,
        goal_id: registrationTab === 'common' && goalId ? parseInt(goalId) : null,
        type: txType,
        is_paid: isPaid,
        is_fixed_expense: isFixed,
        due_day: isFixed ? parseInt(dueDay) : null,
        original_currency: currency,
        payment_method: paymentMethod,
        attachment_path: uploadedPath,
        ticker: isInvestment ? (ticker ? ticker.toUpperCase().trim() : null) : null,
        shares: isInvestment ? (shares ? parseFloat(shares) : null) : null
      };

      if (editingId) {
        await api.put(`/transactions/${editingId}`, payload);
        showToast('success', 'Lançamento atualizado com sucesso!');
      } else {
        await api.post('/transactions/', payload);
        showToast('success', 'Lançamento registrado com sucesso!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData(currentPage);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao salvar transação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      await api.delete(`/transactions/${id}`);
      fetchData(currentPage);
      showToast('success', 'Lançamento excluído com sucesso!');
    } catch (err) {
      showToast('error', 'Erro ao excluir transação');
    }
  };

  const handleTogglePaid = async (t: Transaction) => {
    try {
      await api.put(`/transactions/${t.id}`, { is_paid: !t.is_paid });
      fetchData(currentPage);
    } catch (err) {}
  };

  const formatCurrency = (val: number, curr: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: curr }).format(val);
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterCategoryId('');
    setFilterAccountId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
  };

  const currentItems = registrationTab === 'projects' 
    ? projects.find(p => p.id.toString() === projectId)?.items || []
    : registrationTab === 'business' 
      ? businesses.find(b => b.id.toString() === businessId)?.items || []
      : [];

  const getDownloadUrl = (path?: string) => {
    if (!path) return '';
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    return `${api.defaults.baseURL}/files/download?path=${path}${token ? `&token=${token}` : ''}`;
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Transações</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
            <ShieldIcon size={14} className="text-blue-500" /> Registro de Atividades Financeiras
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 z-10" size={18} />
            <input 
              type="text" 
              placeholder="Buscar transação..." 
              className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className={`p-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${isFilterVisible ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-100 text-gray-400 hover:text-blue-600'}`}
          >
            <Filter size={20} />
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 z-10" size={18} />
        <input 
          type="text" 
          placeholder="Buscar transação..." 
          className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-black text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {isFilterVisible && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Início</label>
            <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Fim</label>
            <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Tipo</label>
            <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Todos</option>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Categoria</label>
            <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)}>
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Conta</label>
            <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)}>
              <option value="">Todas</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={clearFilters} className="w-full h-[42px] bg-gray-50 text-gray-400 hover:text-red-500 font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors cursor-pointer">Limpar Filtros</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vínculo</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic animate-pulse">Sincronizando Silo...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">Nenhum registro encontrado para este filtro.</td></tr>
              ) : transactions.map((t) => (
                <tr key={t.id} className={`hover:bg-blue-50/30 transition-colors group ${!t.is_paid ? 'bg-orange-50/10' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleTogglePaid(t)} className={`transition-all active:scale-90 cursor-pointer ${t.is_paid ? 'text-green-500' : 'text-orange-400 hover:text-green-400'}`}>
                      <CheckCircle2 size={22} fill={t.is_paid ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${!t.is_paid ? 'text-orange-800' : 'text-gray-900'}`}>{t.description}</span>
                      {t.is_fixed_expense && <span className="text-[9px] font-black text-purple-600 mt-0.5 tracking-tighter uppercase">Conta Fixa • Dia {t.due_day}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {t.project ? (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit border ${t.project.is_business ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                          {t.project.is_business ? <Building2 size={12} /> : <Target size={12} />}
                          <span className="text-[10px] font-black uppercase tracking-tighter">{t.project.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full w-fit">
                          <CategoryIcon name={t.category?.icon} size={14} />
                          <span className="text-xs font-black text-gray-500 uppercase tracking-tighter">{t.category?.name || 'Outros'}</span>
                        </div>
                      )}
                      {t.account && (
                        <div className="flex items-center gap-1 ml-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.account.color }}></div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{t.account.name}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black">
                    <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount, t.original_currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {deleteConfirmId === t.id ? (
                      <div className="flex items-center justify-end gap-2 animate-in zoom-in-95 duration-200">
                        <span className="text-[9px] font-black text-red-600 uppercase tracking-widest select-none">Excluir?</span>
                        <button 
                          onClick={() => { handleDeleteTransaction(t.id); setDeleteConfirmId(null); }} 
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg active:scale-90 transition-all cursor-pointer shadow-sm"
                        >
                          Sim
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(null)} 
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-[9px] uppercase tracking-wider rounded-lg active:scale-90 transition-all cursor-pointer shadow-sm"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.attachment_path && (
                            <button onClick={() => setZoomedImage(getDownloadUrl(t.attachment_path))} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer" title="Ver Comprovante">
                                <ImageIcon size={18} />
                            </button>
                        )}
                        <button onClick={() => handleOpenEditModal(t)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl hover:text-blue-600 cursor-pointer">
                          <Edit3 size={18} />
                        </button>
                        <button onClick={() => setDeleteConfirmId(t.id)} className="p-2 text-gray-400 hover:bg-red-50 rounded-xl hover:text-red-600 cursor-pointer">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Página <b>{currentPage}</b> de <b>{totalPages || 1}</b>
            </p>
            <div className="flex gap-3">
                <button 
                    disabled={currentPage === 1 || isLoading} 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-gray-800 hover:text-black font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 disabled:border-gray-100 disabled:text-gray-400"
                >
                    <ChevronLeft size={14} className="text-gray-500" /> Anterior
                </button>
                <button 
                    disabled={currentPage === totalPages || isLoading || totalPages === 0} 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-gray-800 hover:text-black font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 disabled:border-gray-100 disabled:text-gray-400"
                >
                    Próximo <ChevronRight size={14} className="text-gray-500" />
                </button>
            </div>
        </div>
      </div>

      {/* Registration/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
            
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{editingId ? 'Ajustar Registro' : 'Novo Lançamento'}</h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Silo de Inteligência Financeira</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl transition-colors cursor-pointer"><X size={28} /></button>
            </div>

            <div className="flex px-8 pt-4 bg-white border-b border-gray-100">
                <button onClick={() => { setRegistrationTab('common'); setProjectId(''); setBusinessId(''); setProjectItemId(''); }} className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest border-b-4 transition-all cursor-pointer ${registrationTab === 'common' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>INDIVIDUAL</button>
                <button onClick={() => { setRegistrationTab('projects'); setBusinessId(''); setGoalId(''); }} className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest border-b-4 transition-all cursor-pointer ${registrationTab === 'projects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>PROJETOS</button>
                <button onClick={() => { setRegistrationTab('business'); setProjectId(''); setGoalId(''); }} className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest border-b-4 transition-all cursor-pointer ${registrationTab === 'business' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>NEGÓCIOS</button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              
              {registrationTab === 'projects' && (
                  <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Selecionar Projeto</label>
                    <select required className="w-full bg-blue-50 border-none rounded-2xl px-5 py-4 text-blue-900 font-black focus:ring-2 focus:ring-blue-500 shadow-inner outline-none appearance-none cursor-pointer" value={projectId} onChange={e => { setProjectId(e.target.value); setProjectItemId(''); }}>
                        <option value="">Escolha um projeto...</option>
                        {projects.filter(p => p.status !== 'completed').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
              )}

              {registrationTab === 'business' && (
                  <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Selecionar Unidade de Negócio</label>
                    <select required className="w-full bg-emerald-50 border-none rounded-2xl px-5 py-4 text-emerald-900 font-black focus:ring-2 focus:ring-emerald-500 shadow-inner outline-none appearance-none cursor-pointer" value={businessId} onChange={e => { setBusinessId(e.target.value); setProjectItemId(''); }}>
                        <option value="">Escolha uma unidade...</option>
                        {businesses.filter(b => b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
              )}

              {registrationTab === 'common' && (
                  <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Contribuir para Meta? (Opcional)</label>
                    <select className="w-full bg-blue-50 border-none rounded-2xl px-5 py-4 text-blue-900 font-black focus:ring-2 focus:ring-blue-500 shadow-inner outline-none appearance-none cursor-pointer" value={goalId} onChange={e => setGoalId(e.target.value)}>
                        <option value="">Nenhuma meta selecionada</option>
                        {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
              )}

              <div className="flex p-1 bg-gray-100 rounded-[1.2rem] gap-1">
                <button type="button" onClick={() => setTxType('expense')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all cursor-pointer ${txType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><TrendingDown size={16} /> SAÍDA</button>
                <button type="button" onClick={() => setTxType('income')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all cursor-pointer ${txType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><TrendingUp size={16} /> ENTRADA</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Valor e Moeda</label>
                  <div className="flex bg-gray-50 rounded-[1.2rem] overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-inner transition-all h-[60px]">
                    <select 
                      className="w-20 bg-white border-r border-gray-200 px-2 font-bold text-sm text-gray-900 outline-none cursor-pointer h-full hover:bg-gray-50 transition-colors"
                      value={currency} onChange={e => setCurrency(e.target.value)}
                    >
                      <option value="BRL">R$</option>
                      <option value="USD">US$</option>
                      <option value="EUR">€</option>
                      <option value="GBP">£</option>
                    </select>
                    <input 
                      type="number" 
                      step="0.01" 
                      required={!isInvestmentCategory} 
                      className={`w-full bg-transparent border-none px-4 font-black text-lg outline-none h-full ${txType === 'income' ? 'text-green-700' : 'text-red-700'}`} 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      placeholder={isInvestmentCategory ? "Opcional (Preço de Mercado)" : "0,00"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Data</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 h-[60px] text-gray-900 font-black focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Descrição do Lançamento</label>
                <input 
                  type="text" 
                  required={!isInvestmentCategory} 
                  className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder={isInvestmentCategory ? "Opcional (Cálculo automático)" : (txType === 'income' ? 'Ex: Recebimento de Venda...' : 'Ex: Pagamento Ifood...')} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Método de Pagamento</label>
                    <select 
                      className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 shadow-inner outline-none appearance-none cursor-pointer h-[60px]"
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value)}
                    >
                      <option value="OTHERS">Outros / Dinheiro</option>
                      <option value="PIX">PIX</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                      <option value="DEBIT_CARD">Cartão de Débito</option>
                      <option value="BANK_TRANSFER">Transferência Bancária</option>
                      <option value="BOLETO">Boleto Bancário</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comprovante</label>
                        {existingAttachmentPath && (
                            <button 
                                type="button" 
                                onClick={() => setIsEditingAttachment(!isEditingAttachment)}
                                className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-tighter flex items-center gap-1 cursor-pointer"
                            >
                                <Edit3 size={10} /> {isEditingAttachment ? 'Cancelar Ajuste' : 'Substituir Arquivo'}
                            </button>
                        )}
                    </div>
                    
                    {isEditingAttachment ? (
                        <label className="flex items-center gap-3 w-full bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-[1.2rem] px-5 py-4 cursor-pointer transition-all h-[60px] animate-in fade-in duration-300 group">
                            <ImageIcon size={20} className={attachment ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'} />
                            <span className={`text-[11px] font-bold truncate ${attachment ? 'text-blue-600' : 'text-gray-400'}`}>
                                {attachment ? attachment.name : 'Anexar novo comprovante...'}
                            </span>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => setAttachment(e.target.files?.[0] || null)} />
                        </label>
                    ) : (
                        <div className="relative group h-[60px] animate-in zoom-in-95 duration-200">
                            <div 
                                onClick={() => setZoomedImage(getDownloadUrl(existingAttachmentPath!))}
                                className="w-full h-full bg-gray-900 rounded-[1.2rem] overflow-hidden cursor-zoom-in relative border border-gray-100 shadow-sm"
                            >
                                <img 
                                    src={getDownloadUrl(existingAttachmentPath!)} 
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-all duration-300" 
                                    alt="Preview"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 flex items-center justify-center gap-2 text-white pointer-events-none group-hover:scale-110 transition-transform">
                                    <ExternalLink size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Ver Comprovante</span>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setIsPaid(!isPaid)} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${isPaid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                      <span className="text-[11px] font-black uppercase tracking-widest">{isPaid ? 'Liquidado' : 'Pendente'}</span>
                      <CheckCircle2 size={22} fill={isPaid ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" onClick={() => setIsFixed(!isFixed)} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${isFixed ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                      <span className="text-[11px] font-black uppercase tracking-widest">Conta Fixa</span>
                      <Repeat size={22} />
                  </button>
              </div>

              {isFixed && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Dia do Vencimento Mensal</label>
                      <input type="number" min="1" max="31" required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-black focus:ring-2 focus:ring-purple-500 shadow-inner outline-none" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="Ex: 10" />
                  </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">
                    {registrationTab === 'common' ? 'Categoria' : 'Hierarquia do Silo'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-52 overflow-y-auto p-4 bg-gray-50 rounded-[1.5rem] shadow-inner custom-scrollbar">
                  {registrationTab === 'common' ? (
                      categories.filter(c => c.type === txType).map((c) => {
                        const isInv = c.name.toUpperCase() === 'INVESTIMENTOS';
                        const isSelected = categoryId === c.id.toString();
                        
                        let btnClasses = '';
                        if (isSelected) {
                          btnClasses = isInv
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105'
                            : (txType === 'income' ? 'bg-green-600 border-green-600 text-white shadow-lg scale-105' : 'bg-red-600 border-red-600 text-white shadow-lg scale-105');
                        } else {
                          btnClasses = isInv
                            ? 'bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100/80 hover:border-blue-300 shadow-sm'
                            : 'bg-white border-transparent text-gray-400 hover:border-gray-200 shadow-sm';
                        }

                        return (
                          <button 
                            key={c.id} 
                            type="button" 
                            onClick={() => setCategoryId(c.id.toString())} 
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border-2 cursor-pointer ${btnClasses}`}
                          >
                            <CategoryIcon size={22} />
                            <span className="text-[9px] font-black uppercase mt-2 truncate w-full text-center flex items-center gap-1 justify-center">
                              {c.name} {isInv && '✨'}
                            </span>
                          </button>
                        );
                      })
                  ) : (
                      currentItems.length > 0 ? (
                          currentItems.map((item) => (
                            <button key={item.id} type="button" onClick={() => setProjectItemId(item.id.toString())} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border-2 cursor-pointer ${projectItemId === item.id.toString() ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-white border-transparent text-gray-400 hover:border-gray-200 shadow-sm'}`}>
                                <LayoutGrid size={22} />
                                <span className="text-[9px] font-black uppercase mt-2 truncate w-full text-center">{item.name}</span>
                            </button>
                          ))
                      ) : (
                          <div className="col-span-full py-8 text-center bg-white/50 rounded-2xl">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Selecione um {registrationTab === 'business' ? 'negócio' : 'projeto'} para ver as categorias.</p>
                          </div>
                      )
                  )}
                </div>
              </div>

              {/* Campos de Ativo/Investimento Condicionais */}
              {registrationTab === 'common' && (
                (() => {
                  const selectedCategoryObj = categories.find(c => c.id.toString() === categoryId);
                  const isInvestment = selectedCategoryObj && (
                    selectedCategoryObj.name.toUpperCase().includes('INVEST') || 
                    selectedCategoryObj.name.toUpperCase() === 'INVESTIMENTOS'
                  );
                  
                  if (!isInvestment) return null;
                  
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-3xl bg-blue-50/20 border border-blue-100/50 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Código do Ativo (Ticker)</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-white border border-blue-100 rounded-[1.2rem] px-5 py-4 text-gray-900 font-black focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" 
                          value={ticker} 
                          onChange={e => setTicker(e.target.value)} 
                          placeholder="Ex: PETR4, MGLU3, BTC-USD" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Quantidade de Cotas</label>
                        <input 
                          type="number" 
                          step="any"
                          required
                          className="w-full bg-white border border-blue-100 rounded-[1.2rem] px-5 py-4 text-gray-900 font-black focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" 
                          value={shares} 
                          onChange={e => setShares(e.target.value)} 
                          placeholder="Ex: 10, 0.005" 
                        />
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Origem / Conta</label>
                <select required className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 shadow-inner outline-none appearance-none cursor-pointer h-[60px]" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isUploading || isSaving}
                className={`w-full text-white py-6 rounded-[2rem] font-black text-xl transition-all shadow-2xl active:scale-95 mt-6 uppercase tracking-widest cursor-pointer ${isUploading || isSaving ? 'bg-gray-400 cursor-not-allowed' : (registrationTab === 'business' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-gray-900 hover:bg-black shadow-gray-300')}`}
              >
                {isUploading || isSaving ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processando...</span>
                  </div>
                ) : (
                  editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Zoom Overlay */}
      {zoomedImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
              <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors cursor-pointer"><X size={48} /></button>
              <div className="max-w-4xl w-full max-h-[85vh] relative flex items-center justify-center" onClick={e => e.stopPropagation()}>
                  {zoomedImage.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={zoomedImage} className="w-full h-[80vh] rounded-3xl" />
                  ) : (
                    <img 
                        src={zoomedImage} 
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-white/5 animate-in zoom-in-95 duration-300" 
                        alt="Zoomed Receipt" 
                    />
                  )}
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
                      <a 
                        href={zoomedImage} 
                        target="_blank"
                        className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl cursor-pointer"
                      >
                        <Download size={14} /> Abrir Original
                      </a>
                  </div>
              </div>
          </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[250] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-black text-xs uppercase tracking-wider animate-in slide-in-from-bottom-5 duration-300 border ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 shadow-emerald-100' : 'bg-red-600 border-red-500 shadow-red-100'}`}>
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-4 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-96"><p className="text-gray-400 font-medium italic">Carregando...</p></div>}>
        <TransactionsContent />
      </Suspense>
    </DashboardLayout>
  );
}
