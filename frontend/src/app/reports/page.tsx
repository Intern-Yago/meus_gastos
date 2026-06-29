'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, useCallback, Suspense } from 'react';
import api from '@/lib/api';
import { 
  FileText, 
  Download, 
  Loader2, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExportPDF = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/reports/financial-summary?month=${month}&year=${year}&format=pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_finora_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('success', 'Relatório PDF gerado com sucesso!');
    } catch (err) {
      showToast('error', 'Erro ao gerar relatório PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/reports/financial-summary?month=${month}&year=${year}&format=csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dados_finora_${month}_${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('success', 'Exportação de dados CSV realizada com sucesso!');
    } catch (err) {
      showToast('error', 'Erro ao exportar dados CSV');
    } finally {
      setIsLoading(false);
    }
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
      <div className="max-w-4xl mx-auto space-y-10 pb-20">
        <div className="text-center space-y-4">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-3xl w-fit mx-auto shadow-sm">
             <FileText size={48} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Silo de Relatórios</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Extração de Inteligência Financeira</p>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-blue-50 border border-gray-100 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Competência do Mês</label>
              <select 
                value={month} 
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-gray-900 focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner cursor-pointer"
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Ano Fiscal</label>
              <select 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-gray-900 focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={handleExportPDF}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-8 bg-gray-900 text-white rounded-[2rem] hover:bg-black transition-all group active:scale-95 shadow-2xl shadow-gray-200 disabled:opacity-50 cursor-pointer"
            >
              <div className="bg-white/10 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <FileText size={32} className="text-blue-400" />
              </div>
              <span className="text-lg font-black tracking-tight">Relatório Executivo PDF</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Visualização Profissional</span>
            </button>

            <button 
              onClick={handleExportCSV}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-100 text-gray-900 rounded-[2rem] hover:border-blue-200 transition-all group active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <div className="bg-blue-50 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <BarChartIcon size={32} className="text-blue-600" />
              </div>
              <span className="text-lg font-black tracking-tight">Exportação de Dados CSV</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Para Excel e BI</span>
            </button>
          </div>

          <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-start gap-6">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shrink-0 shadow-lg shadow-blue-200">
               <Sparkles size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight mb-2">Dica de Gestão</h4>
               <p className="text-xs font-medium text-blue-800 leading-relaxed">
                 O relatório executivo PDF é ideal para conciliação bancária e prestação de contas. Para análises profundas de pivô ou integração com outras ferramentas, utilize a exportação CSV.
               </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
             <Loader2 className="animate-spin text-blue-600" size={64} />
             <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-xs">Processando Silo...</p>
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
