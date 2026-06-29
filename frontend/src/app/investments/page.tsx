'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Info, ShoppingCart, Activity, AlertCircle, CreditCard, ChevronRight, Search, Filter } from 'lucide-react';

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
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [period, setPeriod] = useState<string>("1m"); // Default: 1 mês
  
  // Dados do gráfico carregados dinamicamente via /history
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setChartLoading] = useState(false);

  // Filtros e Ordenação (Novas Funcionalidades)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("ticker");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("asc");

  // 1. Busca os investimentos da carteira (summary)
  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const res = await api.get('/investments/summary');
        setInvestments(res.data);
        if (res.data.length > 0) {
          setSelectedTicker(res.data[0].ticker);
        }
      } catch (err) {
        console.error('Erro ao buscar investimentos:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvestments();
  }, []);

  // 2. Busca os dados de cotações históricas do ATIVO ATIVO dinamicamente via /history
  useEffect(() => {
    if (!selectedTicker) return;

    // Se for Renda Fixa, não há gráfico de bolsa para buscar
    const isFixed = selectedTicker.toUpperCase().includes("CDB") || 
                    selectedTicker.toUpperCase().includes("POUPANÇA") || 
                    selectedTicker.toUpperCase().includes("PORQUINHO") || 
                    selectedTicker.toUpperCase().includes("IPCA") || 
                    selectedTicker.toUpperCase().includes("PRE") || 
                    selectedTicker.toUpperCase().includes("SELIC") || 
                    selectedTicker.toUpperCase().includes("TESOURO");

    if (isFixed) {
      setChartData([]);
      return;
    }

    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        let periodParam = "1mo";
        let intervalParam = "1d";

        switch (period) {
          case '1d':
            periodParam = "1d";
            intervalParam = "15m";
            break;
          case '1s':
            periodParam = "7d";
            intervalParam = "1d";
            break;
          case '1m':
            periodParam = "1mo";
            intervalParam = "1d";
            break;
          case '1a':
            periodParam = "1y";
            intervalParam = "1d";
            break;
          case 'Tudo':
            periodParam = "max";
            intervalParam = "1wk";
            break;
        }

        const res = await api.get(`/investments/history?ticker=${selectedTicker}&period=${periodParam}&interval=${intervalParam}`);
        setChartData(res.data);
      } catch (err) {
        console.error('Erro ao buscar histórico do ativo:', err);
        setChartData([]);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartData();
  }, [selectedTicker, period]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getInvestmentType = (ticker: string) => {
    const t = ticker.toUpperCase();
    if (t.includes("CDB") || t.includes("POUPANÇA") || t.includes("PORQUINHO") || t.includes("IPCA") || t.includes("PRE") || t.includes("SELIC") || t.includes("TESOURO")) {
      return "Renda Fixa";
    }
    if (t.endsWith("11")) {
      const etfs = ["BOVA11", "IVVB11", "SMAL11", "HASH11", "ECOO11", "XBOV11"];
      return etfs.includes(t) ? "ETF" : "FII";
    }
    if (t.endsWith("3") || t.endsWith("4") || t.endsWith("5") || t.endsWith("6") || t.endsWith("34")) {
      return "Ações";
    }
    return "Outros";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXCELENTE':
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest border border-green-200">EXCELENTE COMPRA</span>;
      case 'BOM':
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest border border-blue-200">BOM PARA MANTER</span>;
      case 'RUIM':
        return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest border border-red-200">ALERTA DE QUEDA</span>;
      default:
        return null;
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtragem e Ordenação reativas (useMemo para alta performance!)
  const filteredAndSortedInvestments = useMemo(() => {
    // 1. Filtrar
    const filtered = investments.filter(inv => {
      const matchSearch = inv.ticker.toLowerCase().includes(searchQuery.toLowerCase());
      const invType = getInvestmentType(inv.ticker);
      const matchType = selectedTypes.length === 0 || selectedTypes.includes(invType);
      return matchSearch && matchType;
    });

    // 2. Ordenar
    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof Investment];
      let valB: any = b[sortField as keyof Investment];

      if (sortField === "type") {
        valA = getInvestmentType(a.ticker);
        valB = getInvestmentType(b.ticker);
      } else if (sortField === "rent") {
        valA = a.profit_pct;
        valB = b.profit_pct;
      } else if (sortField === "patrimonio") {
        valA = a.total_value;
        valB = b.total_value;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [investments, searchQuery, selectedTypes, sortField, sortDirection]);

  // Sincroniza a seleção quando a lista filtrada/ordenada muda
  useEffect(() => {
    if (filteredAndSortedInvestments.length > 0 && !filteredAndSortedInvestments.some(i => i.ticker === selectedTicker)) {
      setSelectedTicker(filteredAndSortedInvestments[0].ticker);
    }
  }, [filteredAndSortedInvestments, selectedTicker]);

  const selectedInv = investments.find(i => i.ticker === selectedTicker);

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
          <div className="bg-white p-20 rounded-[3rem] text-center border border-gray-100 shadow-sm">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                <TrendingUp size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Nenhum investimento detectado</h2>
              <p className="text-gray-500 leading-relaxed">Cadastre transações informando o <b>ticker</b> (ex: MXRF11) para que eu possa rastrear seus ativos automaticamente.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* SECTION 1: LIST TABLE with Filters (1 Column) */}
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
                <div className="p-6 border-b border-gray-50 space-y-4">
                  <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Ativos em Carteira</h2>
                  
                  {/* Inputs de Filtro */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-gray-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Pesquisar..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-300 transition-all bg-gray-50/50"
                      />
                    </div>

                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedTypes.includes(val)) {
                          setSelectedTypes([...selectedTypes, val]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-100 rounded-xl text-xs font-black uppercase text-gray-500 focus:outline-none focus:border-blue-300 transition-all bg-gray-50/50 cursor-pointer"
                    >
                      <option value="" disabled>Filtrar Tipo</option>
                      <option value="FII">FII</option>
                      <option value="ETF">ETF</option>
                      <option value="Ações">Ações</option>
                      <option value="Renda Fixa">Renda Fixa</option>
                    </select>
                  </div>
                </div>

                {/* Badges dos Filtros Ativos */}
                {(selectedTypes.length > 0 || searchQuery !== "") && (
                  <div className="flex flex-wrap gap-1.5 px-6 py-3 bg-gray-50/40 border-b border-gray-50">
                    {searchQuery !== "" && (
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-gray-200">
                        Busca: "{searchQuery}"
                        <button onClick={() => setSearchQuery("")} className="hover:text-red-500 font-bold ml-1 text-xs cursor-pointer">×</button>
                      </span>
                    )}
                    {selectedTypes.map(t => (
                      <span key={t} className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-blue-200">
                        {t}
                        <button onClick={() => setSelectedTypes(selectedTypes.filter(x => x !== t))} className="hover:text-red-500 font-bold ml-1 text-xs cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex-1 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50 select-none">
                      <tr>
                        <th onClick={() => handleSort("ticker")} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-700 transition-all">
                          Nome {sortField === "ticker" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th onClick={() => handleSort("type")} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-700 transition-all">
                          Tipo {sortField === "type" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th onClick={() => handleSort("patrimonio")} className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-700 transition-all">
                          Patrimônio {sortField === "patrimonio" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th onClick={() => handleSort("rent")} className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-gray-700 transition-all">
                          Rent. {sortField === "rent" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAndSortedInvestments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-gray-400 font-bold italic text-xs">
                            Nenhum ativo corresponde aos filtros.
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedInvestments.map((inv) => {
                          const isSelected = inv.ticker === selectedTicker;
                          return (
                            <tr 
                              key={inv.ticker} 
                              onClick={() => setSelectedTicker(inv.ticker)}
                              className={`cursor-pointer transition-all hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-4 py-4.5">
                                <span className="text-sm font-black text-gray-900">{inv.ticker}</span>
                              </td>
                              <td className="px-4 py-4.5">
                                <span className="text-xs font-semibold text-gray-500">{getInvestmentType(inv.ticker)}</span>
                              </td>
                              <td className="px-4 py-4.5 text-right">
                                <span className="text-xs font-bold text-gray-900">{formatCurrency(inv.total_value)}</span>
                              </td>
                              <td className="px-4 py-4.5 text-right">
                                <span className={`text-xs font-black ${inv.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {inv.profit >= 0 ? '+' : ''}{inv.profit_pct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: DETAILED WIDGET CARD (2 Columns) */}
              {selectedInv && (
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col justify-between min-h-[520px] space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{selectedInv.ticker}</h2>
                        {getStatusBadge(selectedInv.status)}
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ativo Rastreável na B3 / Mercado</p>
                    </div>

                    {/* Filtros de Período */}
                    <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
                      {["1d", "1s", "1m", "1a", "Tudo"].map((p) => {
                        const isPeriodActive = period === p;
                        return (
                          <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              isPeriodActive 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detalhamento Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50/50 p-4.5 rounded-2xl border border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Cotas</span>
                      <p className="text-lg font-black text-gray-900 mt-1">{selectedInv.shares}</p>
                    </div>
                    <div className="bg-gray-50/50 p-4.5 rounded-2xl border border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Preço Médio</span>
                      <p className="text-lg font-black text-gray-900 mt-1">{formatCurrency(selectedInv.avg_price)}</p>
                    </div>
                    <div className="bg-gray-50/50 p-4.5 rounded-2xl border border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Valor Atual</span>
                      <p className="text-lg font-black text-blue-600 mt-1">{formatCurrency(selectedInv.current_price)}</p>
                    </div>
                    <div className="bg-gray-50/50 p-4.5 rounded-2xl border border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Patrimônio</span>
                      <p className="text-lg font-black text-gray-900 mt-1">{formatCurrency(selectedInv.total_value)}</p>
                    </div>
                  </div>

                  {/* Gráfico Linear Interativo (Corrigido para evitar colapso de altura!) */}
                  <div className="h-64 relative w-full pt-4 flex items-center justify-center">
                    {isChartLoading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/20 rounded-2xl border border-dashed border-gray-100">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Carregando cotações históricas...</p>
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50/30 rounded-2xl border border-dashed border-gray-100">
                        <p className="text-xs text-gray-400 font-bold italic">Sem histórico de mercado disponível para este ativo</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id={`colorPrice-${selectedInv.ticker}`} x1="0" y1="0" x2="0" y2="1">
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
                            labelFormatter={(label) => {
                              // Se for intradiário, apenas exibe a hora. Se for histórico, formata como data local.
                              if (period === '1d') return `Hora: ${label}`;
                              return new Date(label).toLocaleDateString('pt-BR');
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Close" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill={`url(#colorPrice-${selectedInv.ticker})`} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Resumo de Lucro Total */}
                  <div className="border-t border-gray-50 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance Acumulada</h4>
                      <p className="text-xs font-semibold text-gray-500">Lucro Total do Investimento</p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-gray-900 text-white px-6 py-4.5 rounded-[1.8rem] min-w-[240px] justify-between shadow-xl shadow-gray-200">
                      <div className={`px-2.5 py-1 rounded-lg font-black text-xs ${selectedInv.profit >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {selectedInv.profit >= 0 ? '+' : ''}{selectedInv.profit_pct}%
                      </div>
                      <p className={`text-xl font-black ${selectedInv.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(selectedInv.profit)}
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </div>

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
