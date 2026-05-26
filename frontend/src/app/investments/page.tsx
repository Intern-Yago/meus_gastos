'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Info, ShoppingCart, Activity, AlertCircle } from 'lucide-react';

interface Investment {
  ticker: string;
  shares: number;
  avg_price: number;
  current_price: number;
  total_cost: number;
  total_value: number;
  profit: number;
  profit_pct: number;
  status: 'EXCELENTE' | 'BOM' | 'RUIM';
  chart_data: any[];
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const res = await api.get('/investments/summary');
        setInvestments(res.data);
      } catch (err) {
        console.error('Erro ao buscar investimentos:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvestments();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXCELENTE':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-green-200">EXCELENTE COMPRA</span>;
      case 'BOM':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-blue-200">BOM PARA MANTER</span>;
      case 'RUIM':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-red-200">ALERTA DE QUEDA</span>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meus Investimentos</h1>
          <p className="text-gray-400 text-sm font-medium">Acompanhe a performance da sua carteira em tempo real.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 font-bold animate-pulse uppercase text-xs tracking-widest">Consultando Mercado Financeiro...</p>
          </div>
        ) : investments.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                <TrendingUp size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Nenhum investimento detectado</h2>
              <p className="text-gray-500 leading-relaxed">Cadastre transações informando o <b>ticker</b> (ex: MXRF11) para que eu possa rastrear seus ativos automaticamente.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {investments.map((inv) => (
              <div key={inv.ticker} className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-100/20 border border-gray-100 overflow-hidden group hover:border-blue-200 transition-all">
                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8">
                  {/* Info Lateral */}
                  <div className="md:w-1/3 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tighter">{inv.ticker}</h2>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Ativo na B3</p>
                      </div>
                      {getStatusBadge(inv.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black text-gray-400 uppercase">Cotas</span>
                        <p className="text-xl font-black text-gray-800 mt-1">{inv.shares}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black text-gray-400 uppercase">Preço Médio</span>
                        <p className="text-xl font-black text-gray-800 mt-1">{formatCurrency(inv.avg_price)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end border-b border-gray-50 pb-4">
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Atual</span>
                          <p className="text-2xl font-black text-blue-600">{formatCurrency(inv.current_price)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Patrimônio</span>
                          <p className="text-lg font-black text-gray-900">{formatCurrency(inv.total_value)}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center bg-gray-900 text-white p-5 rounded-3xl">
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lucro Total</span>
                          <p className={`text-xl font-black ${inv.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(inv.profit)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-xl font-black text-sm ${inv.profit >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {inv.profit >= 0 ? '+' : ''}{inv.profit_pct}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de Performance */}
                  <div className="flex-1 min-h-[300px] relative">
                    <div className="absolute top-0 right-0 z-10 flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-blue-600">
                      <Activity size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Histórico 30 Dias</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={inv.chart_data}>
                        <defs>
                          <linearGradient id={`colorPrice-${inv.ticker}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="Date" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(val: any) => [formatCurrency(Number(val)), 'Preço']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Close" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill={`url(#colorPrice-${inv.ticker})`} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4 items-start">
              <AlertCircle className="text-amber-500 flex-shrink-0" size={24} />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Aviso Legal</h4>
                <p className="text-xs text-amber-700 font-medium leading-relaxed italic">As informações acima são baseadas em dados públicos de mercado coletados em tempo real. O Finora é uma ferramenta de gestão e sua análise não constitui recomendação profissional de compra ou venda de ativos. Invista com consciência.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
