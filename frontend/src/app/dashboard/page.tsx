'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  CreditCard, 
  Repeat, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Download, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface Account {
  id: number;
  name: string;
  is_default: boolean;
  color: string;
}

interface ChartData {
  id?: number;
  name: string;
  value: number;
}

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  is_paid: boolean;
}

interface PendingSummary {
    late: any[];
    on_time: any[];
    total_late: number;
    total_on_time: number;
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
  accounts_payable: PendingSummary;
  accounts_receivable: PendingSummary;
  budgets: {
    category: string;
    limit: number;
    spent: number;
    percentage: number;
  }[];
  credit_cards?: any[];
  dinheiro_livre_real: number;
  das_provisao: number;
  goals_reserva: number;
  entradas_previstas_mes: number;
  contas_previstas_mes: number;
  despesas_pagas_mes: number;
  sobra_provavel: number;
  risco_caixa: string;
  texto_analise_caixa: string;
}

export default function DashboardPage() {
  const router = useRouter();
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
      setReport('Não foi possível gerar o relatório no momento.');
    } finally {
      setIsReportLoading(false);
    }
  }, [month, year, accountId]);

  useEffect(() => {
    fetchData();
    fetchAccounts();
  }, [fetchData]);

  const handleTogglePaid = async (txId: number) => {
    try {
      await api.put(`/transactions/${txId}`, { is_paid: true });
      fetchData();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // DEEP LINKS HANDLERS
  const handleCategoryClick = (data: any) => {
    const categoryId = data?.id || data?.payload?.id;
    if (categoryId) {
      router.push(`/transactions?category_id=${categoryId}&month=${month}&year=${year}`);
    }
  };

  const handlePaymentMethodClick = (data: any) => {
    const paymentMethodName = data?.name || data?.payload?.name;
    if (paymentMethodName) {
      router.push(`/transactions?payment_method=${paymentMethodName}&month=${month}&year=${year}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        
        {/* TOP TOOLBAR: Filtros e Exportação */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              <CreditCard size={16} className="text-gray-400" />
              <select 
                value={accountId} 
                onChange={(e) => setAccountId(e.target.value)}
                className="bg-transparent border-none text-xs font-black text-gray-900 focus:ring-0 cursor-pointer p-0 pr-6"
              >
                <option value="">Todas as Contas</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
              <Filter size={16} className="text-gray-400" />
              <select 
                value={month} 
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="bg-transparent border-none text-xs font-black text-gray-900 focus:ring-0 cursor-pointer p-0 pr-6"
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <div className="w-px h-3 bg-gray-300 mx-1" />
              <select 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="bg-transparent border-none text-xs font-black text-gray-900 focus:ring-0 cursor-pointer p-0 pr-2"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                <Download size={14} /> Exportar
             </button>
             <button 
                onClick={fetchReport}
                disabled={isReportLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 disabled:opacity-50"
             >
                {isReportLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Insights IA
             </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Sincronizando seu Silo de Inteligência...</p>
          </div>
        ) : summary ? (
          <>
            {/* HERO SECTION: Resumo Imediato */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* CARD ESQUERDA: SALDO DISPONÍVEL E DINHEIRO LIVRE REAL */}
               <div className="lg:col-span-2 bg-gray-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                  
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div>
                         <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Saldo Disponível em Conta</p>
                         <h3 className="text-4xl md:text-5xl font-black tracking-tighter">{formatCurrency(summary.assets_total)}</h3>
                      </div>
                      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-5 md:min-w-[200px] text-left">
                         <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.15em] mb-1">💸 Dinheiro Livre Real</p>
                         <h4 className="text-2xl font-black text-white tracking-tight">{formatCurrency(summary.dinheiro_livre_real)}</h4>
                         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-1">(Descontando impostos, cartões e metas)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-8">
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Resultado Mensal</p>
                            <p className={`text-sm md:text-base font-black ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(summary.balance)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Provisão de DAS</p>
                            <p className="text-sm md:text-base font-black text-orange-400">{formatCurrency(summary.das_provisao)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Reserva de Metas</p>
                            <p className="text-sm md:text-base font-black text-emerald-400">{formatCurrency(summary.goals_reserva)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Dívidas Pendentes</p>
                            <p className="text-sm md:text-base font-black text-red-400">{formatCurrency(summary.liabilities_total)}</p>
                        </div>
                    </div>
                  </div>
               </div>

               {/* CARD DIREITA: MEU MÊS FECHA? (ORÁCULO DE CAIXA) */}
               <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">🔮 Meu Mês Fecha?</h3>
                      <span className={`px-2.5 py-1 text-[8px] font-black rounded-full uppercase tracking-widest ${
                        summary.risco_caixa === 'alto' 
                          ? 'bg-red-50 text-red-600' 
                          : summary.risco_caixa === 'medio' 
                            ? 'bg-orange-50 text-orange-600' 
                            : 'bg-green-50 text-green-600'
                      }`}>
                        {summary.risco_caixa === 'alto' ? 'ALTO RISCO' : summary.risco_caixa === 'medio' ? 'RISCO MÉDIO' : 'BAIXO RISCO'}
                      </span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase">1. Saldo de Início de Mês</span>
                            <span className="text-xs font-black text-gray-900">{formatCurrency(summary.assets_total - summary.balance)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase">2. (+) Entradas no Mês</span>
                            <span className="text-xs font-black text-green-500">{formatCurrency(summary.total_income)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase">3. (-) Saídas no Mês</span>
                            <span className="text-xs font-black text-red-500">{formatCurrency(summary.total_expense)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Resultado do Mês (Líquido)</span>
                            <span className={`text-xs font-black ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(summary.balance)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Sobra Projetada (Saldo Final)</span>
                            <span className="text-sm font-black text-blue-600">{formatCurrency(summary.assets_total)}</span>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Análise do Oráculo Finora</p>
                        <p className="text-[10px] text-gray-600 font-bold leading-relaxed italic">{summary.texto_analise_caixa}</p>
                    </div>
                  </div>
                  
                  <Link href="/fechamento" className="mt-6 flex items-center justify-between p-4 bg-blue-50/50 hover:bg-blue-600 border border-blue-50 rounded-2xl group transition-all">
                     <span className="text-[10px] font-black text-blue-700 group-hover:text-white transition-all uppercase tracking-widest">Ritual de Fechamento</span>
                     <ChevronRight className="text-blue-500 group-hover:text-white transition-all" size={16} />
                  </Link>
               </div>
            </div>

            {/* RELATÓRIO IA (Apenas se gerado) */}
            {report && (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles size={24} className="text-blue-200" />
                        <h3 className="text-xl font-black tracking-tight">Insights do Assistente Finora</h3>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-blue-50 font-medium leading-relaxed">
                        {report.split('\n').map((line, i) => <p key={i} className="mb-3 last:mb-0">{line}</p>)}
                    </div>
                </div>
            )}

            {/* CARD EXCLUSIVO DE CARTÕES DE CRÉDITO (OPÇÃO B) */}
            {summary.credit_cards && summary.credit_cards.length > 0 && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-50 flex items-center justify-center">
                            <CreditCard size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Meus Cartões de Crédito</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {summary.credit_cards.map((card) => {
                            const getMonthName = (m: number) => {
                                const months = [
                                    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
                                    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
                                ];
                                return months[(m - 1 + 12) % 12];
                            };
                            return (
                                <div key={card.id} className="p-6 rounded-[2rem] border border-gray-100 bg-gray-50/20 flex flex-col justify-between min-h-[180px]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                                            <h3 className="text-base font-black text-gray-900">{card.name}</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Limite do Cartão</p>
                                            <p className="text-sm font-bold text-gray-900">{formatCurrency(card.limit)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 rounded-2xl bg-red-50/30 border border-red-100/50">
                                            <p className="text-[9px] font-black text-red-500 uppercase tracking-wider mb-1">Fatura de {getMonthName(month - 1)}</p>
                                            <p className="text-lg font-black text-red-600">{formatCurrency(card.past_bill)}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-1">Vence dia {card.due_day}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-blue-50/30 border border-blue-100/50">
                                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-1">Fatura de {getMonthName(month)}</p>
                                            <p className="text-lg font-black text-blue-600">{formatCurrency(card.current_bill)}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-1">Fecha dia {card.closing_day}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-400">
                                            <span>Uso do Limite</span>
                                            <span>{card.utilization_pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="h-2 rounded-full transition-all" 
                                                style={{ 
                                                    width: `${Math.min(card.utilization_pct, 100)}%`,
                                                    backgroundColor: card.utilization_pct > 80 ? '#ef4444' : '#3b82f6'
                                                }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SEÇÃO: FLUXO DE CAIXA (A PAGAR VS A RECEBER) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* A Pagar */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-500 p-2 rounded-xl text-white shadow-lg shadow-red-50">
                                <ArrowDownCircle size={20} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">A Pagar</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Total Pendente</p>
                            <p className="text-lg font-black text-red-600">{formatCurrency(summary.accounts_payable.total_late + summary.accounts_payable.total_on_time)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 mb-8">
                        <div className="h-32 w-32 shrink-0 cursor-pointer" onClick={() => router.push('/bills')}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={[
                                            { name: 'Atrasado', value: summary.accounts_payable.total_late },
                                            { name: 'No Prazo', value: summary.accounts_payable.total_on_time }
                                        ]} 
                                        innerRadius={35} outerRadius={45} dataKey="value"
                                    >
                                        <Cell fill="#ef4444" stroke="none" />
                                        <Cell fill="#3b82f6" stroke="none" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full" /> Atrasado
                                </span>
                                <span className="text-sm font-bold text-red-600">{formatCurrency(summary.accounts_payable.total_late)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" /> No Prazo
                                </span>
                                <span className="text-sm font-bold text-gray-900">{formatCurrency(summary.accounts_payable.total_on_time)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {[...summary.accounts_payable.late, ...summary.accounts_payable.on_time].slice(0, 3).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.accounts_payable.late.some(l => l.id === tx.id) ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{tx.description}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm font-black text-gray-900">{formatCurrency(tx.amount)}</p>
                                    <button onClick={() => handleTogglePaid(tx.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"><CheckCircle2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* A Receber */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500 p-2 rounded-xl text-white shadow-lg shadow-green-50">
                                <ArrowUpCircle size={20} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">A Receber</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Total Previsto</p>
                            <p className="text-lg font-black text-green-600">{formatCurrency(summary.accounts_receivable.total_late + summary.accounts_receivable.total_on_time)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 mb-8">
                        <div className="h-32 w-32 shrink-0 cursor-pointer" onClick={() => router.push('/receivables')}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={[
                                            { name: 'Em Atraso', value: summary.accounts_receivable.total_late },
                                            { name: 'No Prazo', value: summary.accounts_receivable.total_on_time }
                                        ]} 
                                        innerRadius={35} outerRadius={45} dataKey="value"
                                    >
                                        <Cell fill="#f97316" stroke="none" />
                                        <Cell fill="#10b981" stroke="none" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full" /> Em Atraso
                                </span>
                                <span className="text-sm font-bold text-orange-600">{formatCurrency(summary.accounts_receivable.total_late)}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" /> Agendado
                                </span>
                                <span className="text-sm font-bold text-gray-900">{formatCurrency(summary.accounts_receivable.total_on_time)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {[...summary.accounts_receivable.late, ...summary.accounts_receivable.on_time].slice(0, 3).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.accounts_receivable.late.some(l => l.id === tx.id) ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{tx.description}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm font-black text-gray-900">{formatCurrency(tx.amount)}</p>
                                    <button onClick={() => handleTogglePaid(tx.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"><CheckCircle2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* GRÁFICOS: CATEGORIAS E PAGAMENTOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col min-h-[450px]">
                    <h3 className="text-lg font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Gastos por Categoria
                    </h3>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={summary.expenses_by_category} 
                                    cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" 
                                    paddingAngle={10} dataKey="value"
                                    onClick={handleCategoryClick}
                                    className="cursor-pointer"
                                >
                                    {summary.expenses_by_category.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                                </Pie>
                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    iconType="circle" 
                                    formatter={(value: any, entry: any) => {
                                        const amount = entry.payload?.value;
                                        return (
                                            <span className="text-[11px] font-bold text-gray-600">
                                                {value}: <span className="text-gray-900 font-black">{formatCurrency(amount)}</span>
                                            </span>
                                        );
                                    }} 
                                    wrapperStyle={{ paddingTop: '20px' }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col min-h-[450px]">
                    <h3 className="text-lg font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-green-500 rounded-full" /> Métodos de Pagamento
                    </h3>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={summary.expenses_by_payment_method} 
                                layout="vertical" 
                                margin={{ left: 20, right: 30 }}
                                onClick={(data: any) => data && data.activePayload && handlePaymentMethodClick(data.activePayload[0].payload)}
                                className="cursor-pointer"
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fontSize: 11, fill: '#64748b' }} />
                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                <Bar dataKey="value" fill="#10b981" radius={[0, 10, 10, 0]} barSize={24}>
                                    <LabelList dataKey="value" position="right" formatter={(val: any) => formatCurrency(Number(val))} style={{ fontSize: 10, fontWeight: 'bold', fill: '#475569' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ORÇAMENTOS (Seção Inferior) */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Status de Orçamentos</h3>
                    <Link href="/categories" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Configurar Limites</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {summary.budgets.slice(0, 4).map((b: any, i) => (
                        <Link 
                            key={i} 
                            href={`/categories?edit_category_id=${b.category_id}`}
                            className="space-y-3 p-4 bg-gray-50 rounded-2xl block hover:bg-blue-50/50 hover:scale-[1.02] border border-transparent hover:border-blue-100 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{b.category}</span>
                                <span className={`text-[10px] font-black ${b.percentage > 90 ? 'text-red-600' : 'text-gray-400'}`}>{Math.round(b.percentage)}%</span>
                            </div>
                            <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${b.percentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] font-medium text-gray-400">{formatCurrency(b.spent)} de {formatCurrency(b.limit)}</p>
                        </Link>
                    ))}
                </div>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
