'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  ArrowUpCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar as CalendarIcon,
  MoreVertical,
  Plus,
  Loader2,
  TrendingUp,
  ArrowRight,
  X,
  CreditCard
} from 'lucide-react';

interface Account {
  id: number;
  name: string;
  is_default: boolean;
  color: string;
}

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  category?: { name: string; color: string; icon: string };
  account?: { name: string };
  is_paid: boolean;
}

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txRes, accRes] = await Promise.all([
        api.get('/transactions/?type=income&size=1000'), // Pega uma quantidade maior para o resumo
        api.get('/accounts/')
      ]);
      
      // Ajuste para lidar com a nova resposta paginada {items, total, ...}
      const txData = Array.isArray(txRes.data) ? txRes.data : (txRes.data.items || []);
      const unpaid = txData.filter((t: Transaction) => !t.is_paid);
      setReceivables(unpaid);
      
      const accData = Array.isArray(accRes.data) ? accRes.data : [];
      setAccounts(accData);
      
      const defaultAcc = accData.find((a: Account) => a.is_default);
      if (defaultAcc) setAccountId(defaultAcc.id.toString());
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsReceived = async (id: number) => {
    try {
      await api.put(`/transactions/${id}`, { is_paid: true });
      fetchData();
      showToast('success', 'Recebimento confirmado com sucesso!');
    } catch (err) {
      console.error('Erro ao confirmar recebimento:', err);
      showToast('error', 'Erro ao confirmar recebimento');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/transactions/', {
        amount: parseFloat(amount),
        description,
        date: new Date(date).toISOString(),
        account_id: parseInt(accountId),
        type: 'income',
        is_paid: false,
        payment_method: 'PIX' // Default para recebível
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      fetchData();
      showToast('success', 'Recebível cadastrado com sucesso!');
    } catch (err) {
      showToast('error', 'Erro ao cadastrar recebível');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalLate = receivables
    .filter(t => new Date(t.date) < new Date())
    .reduce((acc, t) => acc + t.amount, 0);

  const totalUpcoming = receivables
    .filter(t => new Date(t.date) >= new Date())
    .reduce((acc, t) => acc + t.amount, 0);

  const filteredReceivables = receivables.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Contas a Receber</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Entradas e Cobranças</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center cursor-pointer gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95"
          >
            <Plus size={18} /> Novo Recebível
          </button>
        </div>

        {/* Resumo de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 text-orange-600 p-2 rounded-xl"><AlertCircle size={20} /></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Em Atraso</span>
            </div>
            <p className="text-2xl font-black text-orange-600">{formatCurrency(totalLate)}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Clock size={20} /></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aguardando</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{formatCurrency(totalUpcoming)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-700 p-6 rounded-[2rem] text-white shadow-xl shadow-green-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 p-2 rounded-xl"><TrendingUp size={20} /></div>
              <span className="text-[10px] font-black text-green-100 uppercase tracking-widest">Total Previsto</span>
            </div>
            <p className="text-2xl font-black">{formatCurrency(totalLate + totalUpcoming)}</p>
          </div>
        </div>

        {/* Toolbar de Busca */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar recebível por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 transition-all"
            />
          </div>
          <button className="flex items-center cursor-pointer justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs uppercase hover:bg-gray-100 transition-all">
            <Filter size={16} /> Filtros
          </button>
        </div>

        {/* Lista de Recebíveis */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="animate-spin text-green-600" size={32} />
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Carregando Silo de Entradas...</p>
          </div>
        ) : filteredReceivables.length > 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Data</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria / Conta</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredReceivables.map((tx) => {
                    const isLate = new Date(tx.date) < new Date();
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLate ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                              <CalendarIcon size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(tx.date))}
                              </p>
                              <span className={`text-[10px] font-black uppercase ${isLate ? 'text-orange-600' : 'text-gray-400'}`}>
                                {isLate ? 'Vencido' : 'Agendado'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-gray-900">{tx.description}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.category?.color || '#cbd5e1' }}></div>
                            <span className="text-xs font-bold text-gray-600">{tx.category?.name || 'Geral'}</span>
                          </div>
                          <p className="text-[10px] font-medium text-gray-400">{tx.account?.name || 'Sem Conta'}</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <p className="text-base font-black text-gray-900">{formatCurrency(tx.amount)}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleMarkAsReceived(tx.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                            >
                              <CheckCircle2 size={14} /> Recebido
                            </button>
                            <button className="p-2 text-gray-300 hover:text-gray-600 transition-all cursor-pointer">
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-100 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto"><ArrowUpCircle size={32} /></div>
            <p className="text-gray-400 font-bold italic uppercase text-xs tracking-widest">Nenhuma entrada futura encontrada.</p>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-green-600 font-black text-[10px] uppercase tracking-widest hover:underline cursor-pointer"
            >
                Registrar Primeiro Recebível
            </button>
          </div>
        )}

        {/* MODAL DE CADASTRO RÁPIDO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Novo Recebível</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Lançamento de Entrada Futura</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl cursor-pointer"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Valor</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input type="number" step="0.01" required className="w-full bg-gray-50 border-none rounded-2xl pl-10 pr-4 py-4 text-gray-900 font-black text-xl focus:ring-2 focus:ring-green-500 shadow-inner outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Data Prevista</label>
                  <input type="date" required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-black focus:ring-2 focus:ring-green-500 shadow-inner outline-none" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Descrição</label>
                  <input type="text" required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-green-500 shadow-inner outline-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Venda de Consultoria" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Conta de Destino</label>
                  <select required className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-green-500 shadow-inner outline-none appearance-none cursor-pointer" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    {accounts.map(acc => <option key={acc.id} value={acc.id} className="cursor-pointer">{acc.name}</option>)}
                  </select>
                </div>

                <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 mt-4 uppercase cursor-pointer">Confirmar Agendamento</button>
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
