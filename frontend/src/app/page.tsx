'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  TrendingUp, Shield, MessageSquare, Award, AlertTriangle, ArrowRight, 
  Check, Star, Users, Briefcase, Zap, LogIn, Sparkles, PieChart, Activity
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-blue-600 p-1.5 rounded-xl">
              <Image 
                src="/logo_fiora.png" 
                alt="Finora Logo" 
                width={28} 
                height={28} 
                className="rounded-lg invert brightness-200"
              />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Finora</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-100 active:scale-95"
              >
                Painel do Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-xs font-black text-slate-600 hover:text-blue-600 uppercase tracking-widest flex items-center gap-1.5"
                >
                  <LogIn size={16} /> Entrar
                </Link>
                <Link 
                  href="/register" 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-100 active:scale-95"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden bg-gradient-to-b from-blue-50/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              <Sparkles size={12} /> Inteligência Artificial de Elite
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Seu co-piloto financeiro ativo e proativo.
            </h1>
            <p className="text-base text-slate-500 font-medium leading-relaxed">
              O Finora não é apenas um gerenciador. É um mentor sofisticado com inteligência artificial real. Converse por voz, importe extratos, mescle despesas e tome decisões financeiras de nível executivo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link 
                href={isLoggedIn ? "/dashboard" : "/register"}
                className="px-8 py-4 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoggedIn ? "Ir para o Dashboard" : "Começar Minha Evolução"} <ArrowRight size={16} />
              </Link>
              <Link 
                href="#features"
                className="px-8 py-4 bg-white border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
              >
                Ver Diferenciais
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-[3rem] blur-3xl opacity-20 animate-pulse" />
            <div className="relative bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl p-6 md:p-8 w-full max-w-md space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Zap size={20} /></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Finora Proativo</p>
                  <p className="text-sm font-black text-slate-800">Simulação de Caixa IA</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-600 leading-relaxed italic">
                  &ldquo;Finora, posso comprar um notebook de R$ 4.000 à vista ou parcelado?&rdquo;
                </div>
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-50 text-xs text-blue-900 leading-relaxed font-semibold space-y-2.5">
                  <p className="font-black text-blue-700">🔍 Análise de Viabilidade:</p>
                  <p>• **À Vista:** Seu saldo cai de R$ 9.200 para R$ 5.200 (reserva de emergência reduzida a 45 dias).</p>
                  <p>• **Parcelado (10x):** Seu comprometimento mensal sobe de 47% para 54%.</p>
                  <p className="font-black text-blue-700">🛡️ Veredito de Elite:</p>
                  <p>Recomendo parcelar se o notebook gerar receita direta, mantendo sua reserva de emergência protegida.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="features" className="py-24 bg-white border-t border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Inovação Absoluta</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Por que o Finora é único?</h2>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">Deixamos as planilhas e o gerenciamento passivo no passado. Conheça as ferramentas de inteligência operacional feitas para quem exige produtividade de elite.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* WIDGET 1: VOICE */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-100 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-50/40 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><MessageSquare size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Conversa por Voz & Memória</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Converse de forma natural pelo chat de voz. O Finora tem memória de longo prazo: diga &ldquo;Sempre que eu gastar na AWS, ponha em Infraestrutura&rdquo; e o sistema aprende permanentemente.</p>
            </div>

            {/* WIDGET 2: RECONCILIATION */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-100 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-50/40 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Shield size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Conciliação Interativa</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Chega de transações duplicadas. Ao registrar uma despesa ou importar extratos, a IA rastreia contas pendentes similares e pergunta se deseja conciliar ou duplicar, mantendo suas análises intactas.</p>
            </div>

            {/* WIDGET 3: MONTH-END CLOSING */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-100 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-50/40 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Award size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Ritual de Fechamento</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Um fluxo guiado de 6 passos no fim do mês: revise despesas sem categoria, limpe duplicatas, anexe comprovantes, acompanhe metas, gere o relatório PDF e receba o veredito final da IA.</p>
            </div>

            {/* WIDGET 4: FORECAST & PLANNING */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-100 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-50/40 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Planejamento de Caixa</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Não olhe apenas para o passado. O Finora projeta o seu saldo no fim do mês somando seu disponível e entradas esperadas e deduzindo compromissos pendentes, alertando se houver risco de déficit.</p>
            </div>

            {/* WIDGET 5: ANOMALY WARNINGS */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-100 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-50/40 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Alertas de Anomalias</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Fique ciente de picos incomuns instantaneamente. O Finora te avisa se os gastos com delivery subiram 42%, se uma assinatura cobrou duas vezes ou se um fornecedor aumentou o valor médio.</p>
            </div>

            {/* WIDGET 6: BUSINESS SILOS */}
            <div className="bg-slate-50 border border-slate-100 hover:border-blue-100 p-8 rounded-[2rem] text-left space-y-4 shadow-sm hover:shadow-xl hover:shadow-blue-50/40 transition-all group">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Briefcase size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Silos de Projetos & Empresas</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">Ideal para freelancers, MEIs e múltiplos negócios. Segregue suas finanças em Unidades de Negócio ou Projetos individuais com metas, orçamentos e relatórios isolados em um único login.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANS / PRICING SECTION */}
      <section className="py-24 bg-gradient-to-b from-transparent to-slate-100/50">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Nossos Planos</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Planos de Acesso</h2>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">Escolha a escala ideal de controle financeiro para o seu bolso ou empresa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-4xl mx-auto">
            
            {/* PLAN 1: STANDARD */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[8px] uppercase tracking-widest rounded-full">Em breve</div>
              <div className="space-y-4 text-left">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Individual</p>
                <h3 className="text-2xl font-black text-slate-800">Plano Standard</h3>
                <p className="text-xs font-medium text-slate-400">Para organizar suas finanças diárias com facilidade.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-800">R$ 0,00</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <div className="border-t border-slate-50 pt-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Controle de Contas e Saldos</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Lançamento manual de despesas</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Metas de poupança padrão</span></div>
                </div>
              </div>
              <button disabled className="w-full py-3 bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl cursor-not-allowed">Em breve</button>
            </div>

            {/* PLAN 2: ELITE CO-PILOT (PREMIUM) */}
            <div className="bg-white border-2 border-blue-600 rounded-[2rem] p-8 shadow-xl flex flex-col justify-between space-y-8 relative overflow-hidden scale-100 md:scale-105">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-blue-600 text-white font-bold text-[8px] uppercase tracking-widest rounded-full animate-pulse">Em breve</div>
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Mais Popular</p>
                </div>
                <h3 className="text-2xl font-black text-slate-800">Executivo Elite</h3>
                <p className="text-xs font-medium text-slate-400">O co-piloto de IA ativo para gerenciar e simular seu caixa.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-800">R$ 29,90</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <div className="border-t border-slate-50 pt-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Mentor IA por Voz Completo</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Memória de longo prazo da IA</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Conciliação Interativa Inteligente</span></div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Check size={14} className="text-blue-500" /> <span>Silos de Projetos / Unidades</span></div>
                </div>
              </div>
              <button disabled className="w-full py-3 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl cursor-not-allowed">Em breve</button>
            </div>

            {/* PLAN 3: ENTERPRISE */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[8px] uppercase tracking-widest rounded-full">Em breve</div>
              <div className="space-y-4 text-left">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">MEI & PJ</p>
                <h3 className="text-2xl font-black text-slate-800">Plano Enterprise</h3>
                <p className="text-xs font-medium text-slate-400">Para negócios, consultorias e contabilidade de elite.</p>
                <div className="pt-2">
                  <span className="text-2xl font-black text-slate-800">R$ 59,90</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <div className="border-t border-slate-50 pt-4 space-y-2.5">
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
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-8 relative z-10">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none uppercase">
            Comece a tomar decisões de nível executivo hoje.
          </h2>
          <p className="text-slate-400 font-medium leading-relaxed max-w-xl mx-auto text-sm">
            Evolua sua relação com as finanças. Finora te entrega proatividade real, insights executivos e acompanhamento inteligente em tempo real.
          </p>
          <div className="pt-4">
            <Link 
              href={isLoggedIn ? "/dashboard" : "/register"}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              {isLoggedIn ? "Acessar Dashboard" : "Experimentar Agora Grátis"} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-500 py-12 px-6 border-t border-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-1.5 rounded-xl">
              <Image 
                src="/logo_fiora.png" 
                alt="Finora Logo" 
                width={20} 
                height={20} 
                className="rounded-lg invert brightness-200"
              />
            </div>
            <span className="text-sm font-black text-white tracking-tight">Finora</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            &copy; 2026 Finora Inc. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
            <Link href="/privacy" className="hover:text-slate-300">Privacidade</Link>
            <Link href="/cookies" className="hover:text-slate-300">Cookies</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}