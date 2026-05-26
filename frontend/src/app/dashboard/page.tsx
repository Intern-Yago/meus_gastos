'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Target, CreditCard, Repeat, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

interface Account {
  id: number;
  name: string;
  is_default: boolean;
  color: string;
}

interface ChartData {
  name: string;
  value: number;
}

interface Transaction {
  id: number;
  amount: number;
  amount_paid: number;
  description: string;
  category_id: number;
  date: string;
  payment_method: string;
  is_fixed_expense: boolean;
  is_recurrent: boolean;
  due_day?: number;
  is_paid: boolean;
}

interface DashboardSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  net_worth: number;
  projected_balance: number;
  active_subscriptions: Transaction[];
  assets_total: number;
  liabilities_total: number;
  prev_income: number;
  prev_expense: number;
  income_change: number;
  expense_change: number;
  expenses_by_category: ChartData[];
  expenses_by_payment_method: ChartData[];
  fixed_expenses: number;
  variable_expenses: number;
  recurring_expenses: number;
  investments: number;
  credit_expenses: number;
  debit_expenses: number;
  income_commitment_pct: number;
  pending_bills: Transaction[];
  budgets: {
    category: string;
    limit: number;
    spent: number;
    percentage: number;
  }[];
}


export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const accParam = accountId ? `&account_id=${accountId}` : '';
      const res = await api.get(`/dashboard/summary?month=${month}&year=${year}${accParam}`);
      setSummary(res.data);
    } catch (err) {
      console.error('Erro ao buscar resumo do dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [month, year, accountId]);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts/');
      setAccounts(res.data);
    } catch (err) {}
  };

  const fetchReport = useCallback(async () => {
    setIsReportLoading(true);
    try {
      const accParam = accountId ? `&account_id=${accountId}` : '';
      const res = await api.get(`/dashboard/report?month=${month}&year=${year}${accParam}`);
      setReport(res.data.report);
    } catch (err) {
      console.error('Erro ao buscar relatório IA:', err);
      setReport('Não foi possível gerar o relatório no momento.');
    } finally {
      setIsReportLoading(false);
    }
  }, [month, year, accountId]);

  useEffect(() => {
    fetchData();
    fetchAccounts();
  }, [fetchData]);

  const handleTogglePaid = async (tx: Transaction) => {
    try {
      await api.put(`/transactions/${tx.id}`, { ...tx, is_paid: !tx.is_paid });
      fetchData();
    } catch (err) {
      console.error('Erro ao atualizar status de pagamento:', err);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard Mensal</h1>
          
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
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
            <div className="w-px h-4 bg-gray-200" />
            <select 
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-transparent border-none rounded-xl px-3 py-1.5 text-sm font-black text-gray-900 focus:ring-0 cursor-pointer"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="w-px h-4 bg-gray-200" />
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-transparent border-none rounded-xl px-3 py-1.5 text-sm font-black text-gray-900 focus:ring-0 cursor-pointer"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 font-medium italic">Sincronizando suas finanças...</p>
          </div>
        ) : summary ? (
          <>
            {/* Contas a Pagar - Destaque */}
            {summary.pending_bills.length > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-[2rem] p-6 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500 p-2 rounded-xl text-white">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-orange-900 uppercase tracking-tight">Contas a Pagar</h2>
                      <p className="text-xs text-orange-700 font-medium">Você tem {summary.pending_bills.length} pendências para este mês</p>
                    </div>
                  </div>
                  <Link href="/transactions" className="text-xs font-black text-orange-600 hover:underline uppercase tracking-widest">Ver Todas</Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary.pending_bills.slice(0, 3).map((bill) => (
                    <div key={bill.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex flex-col group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all">
                            <Clock size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{bill.description}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase">
                              Vence em {new Intl.DateTimeFormat('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit'
                              }).format(new Date(bill.date))}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">{formatCurrency(bill.amount)}</p>
                          {bill.amount_paid > 0 && (
                            <p className="text-[10px] text-green-600 font-bold">Faltam {formatCurrency(bill.amount - bill.amount_paid)}</p>
                          )}
                        </div>
                      </div>
                      
                      {bill.amount_paid > 0 && (
                        <div className="w-full bg-gray-100 h-1 rounded-full mb-3 overflow-hidden">
                          <div 
                            className="bg-orange-500 h-full transition-all" 
                            style={{ width: `${Math.min((bill.amount_paid / bill.amount) * 100, 100)}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleTogglePaid(bill)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white rounded-lg text-xs font-black transition-all"
                        >
                          <CheckCircle2 size={16} />
                          QUITAR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patrimônio Líquido - NOVO WIDGET SUPERIOR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col justify-between group overflow-hidden relative">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Patrimônio Líquido Real</h3>
                    <p className={`text-5xl font-black tracking-tighter ${summary.net_worth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {formatCurrency(summary.net_worth)}
                    </p>
                    <div className="flex items-center gap-4 mt-6">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Ativos Totais</p>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(summary.assets_total)}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-100"></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Passivos / Dívidas</p>
                        <p className="text-sm font-bold text-red-500">{formatCurrency(summary.liabilities_total)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 max-w-xs space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span className="text-gray-400">Saldo Projetado (Fim do Mês)</span>
                        <span className={summary.projected_balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(summary.projected_balance)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${summary.projected_balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                          style={{ width: `${Math.max(0, Math.min(100, (summary.projected_balance / (summary.total_income || 1)) * 100))}%` }}></div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
                      "Projeção baseada em todas as suas contas fixas e faturas pendentes até o dia 30."
                    </p>
                  </div>
                </div>
              </div>

              {/* Orçamentos - MINI TERMÔMETROS */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Orçamentos</h3>
                  <Link href="/categories" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-blue-600 transition-all"><Target size={20} /></Link>
                </div>
                
                <div className="space-y-5">
                  {summary.budgets.length > 0 ? summary.budgets.slice(0, 4).map((b, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-gray-700">{b.category}</span>
                        <span className={`text-[10px] font-black ${b.percentage > 90 ? 'text-red-600' : 'text-gray-400'}`}>
                          {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${b.percentage > 90 ? 'bg-red-500' : b.percentage > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(b.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center border-2 border-dashed border-gray-50 rounded-3xl">
                      <p className="text-[10px] font-black text-gray-300 uppercase leading-relaxed">Nenhum limite definido.<br/>Crie nas Categorias!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Assinaturas e Drenos (NOVO) */}
            {summary.active_subscriptions.length > 0 && (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-500 p-2 rounded-xl text-white">
                      <Repeat size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Assinaturas Ativas</h2>
                      <p className="text-xs text-gray-400 font-medium">Detector de drenos mensais</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-indigo-600">{formatCurrency(summary.active_subscriptions.reduce((acc, s) => acc + s.amount, 0))}</p>
                    <p className="text-[9px] font-bold text-gray-300 uppercase">Total Mensal</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {summary.active_subscriptions.map((sub) => (
                    <div key={sub.id} className="bg-gray-50/50 p-4 rounded-2xl flex items-center justify-between hover:bg-indigo-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{sub.description}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase">Recorrente</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-gray-900">{formatCurrency(sub.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contas a Pagar - Destaque */}

            {/* Relatório IA */}
            <div className="bg-white rounded-[2rem] p-1 shadow-xl shadow-blue-100 border border-blue-50">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[1.8rem] p-6 md:p-10 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="space-y-1">
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">✨ Relatório Inteligente</h3>
                      <p className="text-blue-100 text-sm font-medium">Análise proativa baseada no seu padrão de consumo</p>
                    </div>
                    <button 
                      onClick={fetchReport}
                      disabled={isReportLoading}
                      className="bg-white text-blue-600 hover:bg-blue-50 transition-all px-6 py-3 rounded-2xl text-sm font-black shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {isReportLoading ? <Loader2 className="animate-spin" size={18} /> : 'Gerar Insights Agora'}
                    </button>
                  </div>
                  {report && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 leading-relaxed text-blue-50 font-medium">
                      {report.split('\n').map((line, i) => <p key={i} className="mb-3 last:mb-0">{line}</p>)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-600 rounded-full"></span> Gastos por Categoria
                </h3>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summary.expenses_by_category} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={8} dataKey="value">
                        {summary.expenses_by_category.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 bg-green-500 rounded-full"></span> Formas de Pagamento
                </h3>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.expenses_by_payment_method} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fontSize: 12, fill: '#64748b' }} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Bar dataKey="value" name="Total" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-200 italic font-bold">Nenhum dado financeiro encontrado.</div>
        )}
      </div>
    </DashboardLayout>
  );
}
