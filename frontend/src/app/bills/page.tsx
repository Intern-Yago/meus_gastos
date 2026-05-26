'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AlertCircle, CheckCircle2, Clock, Calendar, Wallet, ArrowRight, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  date: string;
  due_day: number;
  is_paid: boolean;
  account?: Account;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Transaction | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const accParam = accountId ? `&account_id=${accountId}` : '';
      const res = await api.get(`/transactions/?type=expense&is_paid=false${accParam}`);
      setBills(res.data.filter((t: any) => !t.is_paid));
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts/');
      setAccounts(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchBills();
    fetchAccounts();
  }, [accountId]);

  const handleMarkAsPaid = async (id: number) => {
    try {
      const res = await api.get(`/transactions/${id}`);
      await api.put(`/transactions/${id}`, { ...res.data, is_paid: true, amount_paid: res.data.amount });
      fetchBills();
    } catch (err) {
      console.error('Erro ao pagar conta:', err);
    }
  };

  const handlePartialPayment = async () => {
    if (!selectedBill || !partialAmount) return;
    try {
      const newAmountPaid = (selectedBill.amount_paid || 0) + parseFloat(partialAmount);
      await api.put(`/transactions/${selectedBill.id}`, { 
        ...selectedBill, 
        amount_paid: newAmountPaid,
        is_paid: newAmountPaid >= selectedBill.amount
      });
      setIsModalOpen(false);
      setPartialAmount('');
      setSelectedBill(null);
      fetchBills();
    } catch (err) {
      console.error('Erro no pagamento parcial:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Contas a Pagar</h1>
            <p className="text-gray-400 text-sm font-medium">Gestão proativa de faturas e compromissos fixos.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <CreditCard size={16} className="text-gray-400" />
              <select 
                value={accountId} 
                onChange={(e) => setAccountId(e.target.value)}
                className="bg-transparent border-none rounded-xl text-sm font-black text-gray-900 focus:ring-0 cursor-pointer p-0"
              >
                <option value="">Todas as Contas</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            <p className="text-gray-400 font-bold animate-pulse uppercase text-xs tracking-widest">Sincronizando Pendências...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Tudo em dia!</h2>
              <p className="text-gray-500 leading-relaxed">Você não possui nenhuma conta fixa pendente para este mês. Bom trabalho!</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 text-blue-600 font-black uppercase text-xs tracking-widest hover:underline"
              >
                Voltar ao Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Resumo Rápido */}
            <div className="bg-orange-600 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-orange-200">
              <div className="flex items-center gap-6 text-center md:text-left">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Calendar size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Total Pendente</h3>
                  <p className="text-orange-100 font-medium">Você tem {bills.length} contas aguardando pagamento</p>
                </div>
              </div>
              <div className="text-4xl font-black tracking-tighter">
                {formatCurrency(bills.reduce((acc, b) => acc + (b.amount - (b.amount_paid || 0)), 0))}
              </div>
            </div>

            {/* Lista de Contas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {bills.map((bill) => (
                <div key={bill.id} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                      <Clock size={24} />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vencimento</span>
                      <p className="text-lg font-black text-gray-900">
                        {new Intl.DateTimeFormat('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }).format(new Date(bill.date)).replace(',', ' às')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 mb-6">
                    <h4 className="text-lg font-bold text-gray-800 line-clamp-1">{bill.description}</h4>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-black text-orange-600">{formatCurrency(bill.amount)}</p>
                      {bill.amount_paid > 0 && (
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Faltam {formatCurrency(bill.amount - bill.amount_paid)}</p>
                      )}
                    </div>
                  </div>

                  {bill.amount_paid > 0 && (
                    <div className="mb-6 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span className="text-gray-400">Progresso</span>
                        <span className="text-orange-600">{Math.round((bill.amount_paid / bill.amount) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full transition-all" style={{ width: `${(bill.amount_paid / bill.amount) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setSelectedBill(bill); setIsModalOpen(true); }}
                      className="py-4 bg-orange-50 text-orange-600 font-black rounded-2xl hover:bg-orange-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Wallet size={18} />
                      <span className="text-xs uppercase">PARCIAL</span>
                    </button>
                    <button 
                      onClick={() => handleMarkAsPaid(bill.id)}
                      className="py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-gray-100"
                    >
                      <CheckCircle2 size={18} />
                      <span className="text-xs uppercase tracking-tight text-nowrap">QUITAR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal de Pagamento Parcial */}
            {isModalOpen && selectedBill && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">Pagar Parcial</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedBill.description}</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl">
                      <ArrowRight className="rotate-180" size={24} />
                    </button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Quanto você está pagando agora?</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          autoFocus
                          className="w-full bg-gray-50 border-none rounded-[1.2rem] pl-10 pr-4 py-4 text-gray-900 font-black text-lg focus:ring-2 focus:ring-orange-500 outline-none shadow-inner" 
                          value={partialAmount} 
                          onChange={e => setPartialAmount(e.target.value)} 
                          placeholder="0,00"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium px-1 italic">
                        Restante total da conta: {formatCurrency(selectedBill.amount - selectedBill.amount_paid)}
                      </p>
                    </div>

                    <button 
                      onClick={handlePartialPayment}
                      className="w-full bg-orange-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 active:scale-95"
                    >
                      CONFIRMAR PAGAMENTO
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex gap-4 items-start mt-8">
              <AlertCircle className="text-blue-500 flex-shrink-0" size={24} />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Dica Finora</h4>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">As contas mostradas aqui são aquelas marcadas como <b>Fixas</b> no momento do registro. Você pode configurar lembretes por e-mail para cada uma delas pedindo para a IA!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
