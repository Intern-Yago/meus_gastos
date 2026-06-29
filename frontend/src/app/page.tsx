'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  TrendingUp, Shield, MessageSquare, Award, AlertTriangle, ArrowRight, 
  Check, Star, Users, Briefcase, Zap, LogIn, Sparkles, PieChart, Activity,
  Crown, CreditCard, ChevronRight, CheckCircle2, Globe, DollarSign
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (token) {
      setIsLoggedIn(true);
      router.push('/dashboard');
    } else if (isStandalone) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-600 selection:text-white overflow-x-hidden font-sans">
      
      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="bg-blue-600 p-1.5 rounded-xl shadow-lg shadow-blue-500/20">
              <Image 
                src="/logo_fiora.png" 
                alt="Finora Logo" 
                width={28} 
                height={28} 
                className="rounded-lg invert brightness-200"
              />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight uppercase">Finora</span>
          </Link>
          
          <div className="flex items-center gap-6">
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-95 cursor-pointer"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-xs font-black text-slate-600 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogIn size={16} /> Entrar
                </Link>
                <Link 
                  href="/register" 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-95 cursor-pointer"
                >
                  Criar Silo
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 md:pt-28 md:pb-36 overflow-hidden bg-gradient-to-b from-blue-50/50 via-transparent to-transparent">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="space-y-8 text-left lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
              <Sparkles size={12} className="animate-pulse" /> Inteligência Financeira Avançada
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] uppercase">
              O Silo de Riqueza para mentes <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">estratégicas</span>.
            </h1>
            <p className="text-base text-slate-500 font-medium leading-relaxed max-w-xl">
              Deixe o controle passivo no passado. O Finora é uma fortaleza contábil equipada com agentes de inteligência artificial proativa, carteira de investimentos global (B3 e Renda Internacional) e controle inteligente de cartões de crédito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link 
                href={isLoggedIn ? "/dashboard" : "/register"}
                className="px-8 py-4 bg-slate-950 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoggedIn ? "Ir para o Dashboard" : "Instanciar Meu Silo de Riqueza"} <ArrowRight size={16} />
              </Link>
              <Link 
                href="#features"
                className="px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                Conhecer Recursos
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:col-span-5">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-[3rem] blur-3xl opacity-15 animate-pulse" />
            <div className="relative bg-white/85 border border-slate-100 rounded-[2.5rem] shadow-2xl p-6 md:p-8 w-full max-w-md space-y-6 backdrop-blur-md">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Zap size={20} /></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Finora Proativo</p>
                  <p className="text-sm font-black text-slate-800 uppercase">Decisões Sob Demanda</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-500 leading-relaxed italic">
                  &ldquo;Finora, posso comprar R$ 1.500 em Apple (AAPL) sem comprometer meu Dinheiro Livre de Julho?&rdquo;
                </div>
                <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 text-xs text-blue-950 leading-relaxed font-semibold space-y-2.5">
                  <p className="font-black text-blue-700 flex items-center gap-2">🔍 INVESTIMENTO DETECTADO (USD):</p>
                  <p>• Apple é uma ação cotada em dólares. Vou converter o preço atual de **$ 192,50** utilizando o câmbio spot de **R$ 5,18** para lançar os ativos convertidos em Reais.</p>
                  <p>• **Análise de Fluxo:** Em Julho, o seu saldo disponível é de R$ 799,57 e você tem faturas vencendo de R$ 595,32 (restam R$ 204,25 livres). Lançar esse investimento no caixa de Julho resultará em um saldo de caixa negativo!</p>
                  <p className="font-black text-blue-700 flex items-center gap-2">🛡️ RECOMENDAÇÃO CONTÁBIL:</p>
                  <p>Cadastre o ativo utilizando o comando **"Suba Zerado"** para catalogá-lo na sua carteira de investimentos pelo valor real, sem drenar o seu caixa atual!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS ROW (CATCHY) */}
      <section className="border-t border-b border-slate-100 bg-white py-8 text-center select-none">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1">
            <p className="text-3xl font-black text-blue-600 tracking-tight leading-none uppercase">&lt; 2ms</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Latência de Cache Redis</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-indigo-600 tracking-tight leading-none uppercase">100%</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ferramentas de IA Integradas</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-purple-600 tracking-tight leading-none uppercase">Multimoeda</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conversor Spot B3/Nasdaq</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-teal-600 tracking-tight leading-none uppercase">PWA</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instalável em Todos Dispositivos</p>
          </div>
        </div>
      </section>

      {/* ELITE MODULES SECTION */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          <div className="max-w-xl mx-auto text-center space-y-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Módulos Avançados</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Módulos de Gestão de Elite</h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">Conheça as duas colunas contábeis que trazem inteligência e performance para quem domina o próprio patrimônio.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* WIDGET 1: CARTEIRA DE INVESTIMENTOS */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col justify-between space-y-8 relative overflow-hidden group hover:border-blue-300 transition-all">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><TrendingUp size={28} /></div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Carteira de Investimentos B3 & Renda Internacional</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Acompanhe sua carteira de investimentos em tempo real com dados de mercado ao vivo. O sistema detecta e classifica automaticamente **Ações, FIIs, ETFs ou Criptoativos** na Bolsa de Valores. 
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] font-bold text-slate-400 uppercase">
                  <div className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Caching de Cotações Redis em 5 min</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Conversão Automática USD/BRL Spot</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Gráficos de 1 Dia por Horas</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Marcação à Curva de Renda Fixa</div>
                </div>
              </div>
            </div>

            {/* WIDGET 2: CARTÃO DE CRÉDITO */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col justify-between space-y-8 relative overflow-hidden group hover:border-indigo-300 transition-all">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><CreditCard size={28} /></div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ciclo Inteligente de Faturas de Cartão</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Sua fatura de crédito calculada com precisão contábil real. Compras feitas no cartão entram no histórico de transações do mês corrente, mas a obrigação e o débito real só entram em cena no mês seguinte, no dia do vencimento.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] font-bold text-slate-400 uppercase">
                  <div className="flex items-center gap-2"><Check size={14} className="text-indigo-500" /> Visualização de Limites Ativos</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-indigo-500" /> Separação de Fatura Aberta/Fechada</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-indigo-500" /> Bloqueio de Dinheiro Livre Real</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-indigo-500" /> Lógica Multi-Cartões (Inter/C6)</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="features" className="py-24 border-t border-b border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Inovação Absoluta</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Por que o Finora é único?</h2>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">Deixamos as planilhas e o gerenciamento passivo no passado. Conheça as ferramentas de inteligência contábil feitas para quem exige controle patrimonial de alta precisão.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* WIDGET 1: VOICE */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-300 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><MessageSquare size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Conversa por Voz & Memória</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Converse de forma natural pelo chat de voz. O Finora tem memória de longo prazo: diga &ldquo;Sempre que eu gastar na AWS, ponha em Infraestrutura&rdquo; e o sistema aprende permanentemente.</p>
            </div>

            {/* WIDGET 2: RECONCILIATION */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-300 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Shield size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Conciliação Interativa</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Chega de transações duplicadas. Ao registrar uma despesa ou importar extratos, a IA rastreia contas pendentes similares e pergunta se deseja conciliar ou duplicar, mantendo suas análises intactas.</p>
            </div>

            {/* WIDGET 3: MONTH-END CLOSING */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-300 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Award size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Ritual de Fechamento</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Um fluxo guiado de 6 passos no fim do mês: revise despesas sem categoria, limpe duplicatas, anexe comprovantes, acompanhe metas, gere o relatório PDF e receba o veredito final da IA.</p>
            </div>

            {/* WIDGET 4: FORECAST & PLANNING */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-300 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Planejamento de Caixa</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Não olhe apenas para o passado. O Finora projeta o seu saldo no fim do mês somando seu disponível e entradas esperadas e deduzindo compromissos pendentes, alertando se houver risco de déficit.</p>
            </div>

            {/* WIDGET 5: ANOMALY WARNINGS */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-300 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Alertas de Anomalias</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Fique ciente de picos incomuns instantaneamente. O Finora te avisa se os gastos com delivery subiram 42%, se uma assinatura cobrou duas vezes ou se um fornecedor aumentou o valor médio.</p>
            </div>

            {/* WIDGET 6: BUSINESS SILOS */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-300 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Briefcase size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Silos de Projetos & Empresas</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Ideal para freelancers, MEIs e múltiplos negócios. Segregue suas finanças em Unidades de Negócio ou Projetos individuais com metas, orçamentos e relatórios isolados em um único login.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANS / PRICING SECTION */}
      <section className="py-24 bg-gradient-to-b from-transparent to-slate-100">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Nossos Planos</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Planos de Acesso</h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">Escolha a escala ideal de controle financeiro para o seu bolso ou empresa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-4xl mx-auto">
            
            {/* PLAN 1: STANDARD */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[8px] uppercase tracking-widest rounded-full border border-slate-200">Em breve</div>
              <div className="space-y-4 text-left">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Individual</p>
                <h3 className="text-2xl font-black text-slate-850 uppercase">Plano Standard</h3>
                <p className="text-xs font-medium text-slate-400">Para organizar suas finanças diárias com facilidade.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-800">R$ 0,00</span>
                  <span className="text-xs text-gray-400">/mês</span>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Controle de Contas e Saldos</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Lançamento manual de despesas</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Metas de poupança padrão</span></div>
                </div>
              </div>
              <button disabled className="w-full py-3 bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl cursor-not-allowed">Em breve</button>
            </div>

            {/* PLAN 2: ELITE CO-PILOT (PREMIUM) */}
            <div className="bg-white border-2 border-blue-600 rounded-[2rem] p-8 shadow-xl flex flex-col justify-between space-y-8 relative overflow-hidden scale-100 md:scale-105 shadow-blue-500/5">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-blue-600 text-white font-bold text-[8px] uppercase tracking-widest rounded-full animate-pulse">Em breve</div>
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Mais Popular</p>
                </div>
                <h3 className="text-2xl font-black text-slate-850 uppercase">Executivo Elite</h3>
                <p className="text-xs font-medium text-slate-400">O co-piloto de IA ativo para gerenciar e simular seu caixa.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-800">R$ 29,90</span>
                  <span className="text-xs text-gray-400">/mês</span>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Mentor IA por Voz Completo</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Memória de longo prazo da IA</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Conciliação Interativa Inteligente</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Silos de Projetos / Unidades</span></div>
                </div>
              </div>
              <button disabled className="w-full py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl cursor-not-allowed">Em breve</button>
            </div>

            {/* PLAN 3: ENTERPRISE */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[8px] uppercase tracking-widest rounded-full border border-slate-200">Em breve</div>
              <div className="space-y-4 text-left">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">MEI & PJ</p>
                <h3 className="text-2xl font-black text-slate-850 uppercase">Plano Enterprise</h3>
                <p className="text-xs font-medium text-slate-400">Para negócios, consultorias e contabilidade de elite.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-800">R$ 59,90</span>
                  <span className="text-xs text-gray-400">/mês</span>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Múltiplas Unidades de Negócio</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Exportador completo para contador</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Uploads de Extratos sem limite</span></div>
                </div>
              </div>
              <button disabled className="w-full py-3 bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl cursor-not-allowed">Em breve</button>
            </div>

          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-800 text-white relative overflow-hidden text-center shadow-inner">
        <div className="max-w-4xl mx-auto px-6 space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none uppercase">
            Comece a tomar decisões de nível executivo hoje.
          </h2>
          <p className="text-blue-100 font-medium leading-relaxed max-w-xl mx-auto text-sm">
            Evolua sua relação com as finanças. Finora te entrega proatividade real, insights executivos e acompanhamento de carteira inteligente em tempo real.
          </p>
          <div className="pt-4">
            <Link 
              href={isLoggedIn ? "/dashboard" : "/register"}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-black/10 active:scale-95 cursor-pointer"
            >
              {isLoggedIn ? "Acessar Dashboard" : "Experimentar Agora Grátis"} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 text-slate-400 py-12 px-6 border-t border-slate-150">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-1.5 rounded-xl shadow-md shadow-blue-500/10">
              <Image 
                src="/logo_fiora.png" 
                alt="Finora Logo" 
                width={20} 
                height={20} 
                className="rounded-lg invert brightness-200"
              />
            </div>
            <span className="text-sm font-black text-slate-900 tracking-tight uppercase">Finora</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            &copy; 2026 Finora Inc. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Link href="/privacy" className="hover:text-slate-950">Privacidade</Link>
            <Link href="/cookies" className="hover:text-slate-950">Cookies</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
