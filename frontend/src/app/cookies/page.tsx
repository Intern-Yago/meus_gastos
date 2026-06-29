'use client';

import { ArrowLeft, Cookie, Info, ShieldCheck, ChevronRight, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function CookiePolicyPage() {
  const sections = [
    { id: 'definicao', title: '1. O que são Cookies' },
    { id: 'essenciais', title: '2. Cookies Essenciais' },
    { id: 'terceiros', title: '3. Cookies de Terceiros' },
    { id: 'escolha', title: '4. Sua Escolha' },
    { id: 'contato', title: '5. Contato' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center">
      {/* Header Sutil */}
      <header className="w-full max-w-[1000px] px-6 py-10 flex items-center justify-between">
        <Link href="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-all font-black text-[10px] uppercase tracking-widest group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Voltar para o Login
        </Link>
        <div className="flex items-center gap-2">
            <Image src="/logo_fiora.png" alt="Finora Logo" width={32} height={32} className="rounded-lg opacity-80" />
            <span className="font-black text-gray-900 tracking-tighter text-xl">Finora</span>
        </div>
      </header>

      <main className="w-full max-w-[1000px] px-6 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Menu Lateral de Âncoras */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-10 h-fit space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Navegação</p>
          <nav className="flex flex-col gap-2">
            {sections.map((s) => (
              <a 
                key={s.id} 
                href={`#${s.id}`} 
                className="text-xs font-bold text-gray-500 hover:text-blue-600 hover:translate-x-1 transition-all py-2 border-b border-gray-100 flex items-center justify-between group"
              >
                {s.title}
                <ChevronRight size={12} className="md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </nav>
        </aside>

        {/* Conteúdo Principal */}
        <article className="lg:col-span-9 bg-white rounded-[3rem] p-8 md:p-16 shadow-2xl shadow-blue-900/5 border border-gray-100 max-w-[720px]">
          <div className="flex items-center gap-3 mb-4">
             <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Navegação Transparente</span>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atualizado em Maio/2026</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-8 leading-[1.1]">
            Uso de <br/><span className="text-blue-600 text-shadow-sm">Cookies</span>
          </h1>

          <p className="text-gray-600 text-lg font-medium leading-[1.8] mb-12">
            O Finora utiliza cookies e tecnologias similares para garantir que seu silo de inteligência financeira funcione com a máxima agilidade e personalização.
          </p>

          <div className="space-y-16 text-gray-600 text-base leading-[1.8]">
            
            <section id="definicao" className="scroll-mt-10">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> 1. O que são Cookies?
              </h2>
              <p>
                Cookies são pequenos arquivos de texto que o Finora armazena no seu navegador. Eles nos ajudam a reconhecer você, manter sua sessão ativa e lembrar de suas preferências (como a voz da IA ou filtros do dashboard) entre uma visita e outra.
              </p>
            </section>

            <section id="essenciais" className="scroll-mt-10">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> 2. Cookies Estritamente Necessários
              </h2>
              <p>
                Estes cookies são fundamentais para o funcionamento do app. Sem eles, você não conseguiria fazer login ou navegar em sua área restrita com segurança.
              </p>
              <div className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
                <ShieldCheck size={20} className="text-green-600 mt-1" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-tight leading-relaxed">
                  Estes cookies são carregados por padrão e são vitais para a integridade da sua sessão JWT.
                </p>
              </div>
            </section>

            <section id="terceiros" className="scroll-mt-10">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> 3. Cookies de Terceiros
              </h2>
              <p>Utilizamos parceiros de tecnologia para elevar a inteligência do Finora:</p>
              <ul className="list-disc pl-6 mt-4 space-y-4">
                <li>
                  <strong>OpenAI:</strong> Essenciais para processar seus comandos de voz e texto, permitindo que nossos agentes respondam de forma personalizada e segura.
                </li>
                <li>
                  <strong>Recharts:</strong> Utilizados para renderizar os gráficos interativos e dinâmicos que dão vida ao seu Dashboard financeiro.
                </li>
              </ul>
            </section>

            <section id="escolha" className="scroll-mt-10 bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100">
              <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <Cookie className="text-blue-600" /> 4. Sua Escolha é Respeitada
              </h2>
              <p className="text-blue-900/80 font-medium">
                Você não é forçado a aceitar tudo. No Finora, você tem controle granular:
              </p>
              <p className="mt-4">
                A desativação de cookies essenciais impede o acesso à plataforma. No entanto, cookies <strong>Funcionais</strong> (como voz) e de <strong>Inteligência</strong> (análise de padrões) podem ser recusados a qualquer momento através do nosso painel de <strong>Configurações</strong>, sem bloquear seu acesso básico ao sistema.
              </p>
            </section>

            <section id="contato" className="scroll-mt-10 pt-10 border-t border-gray-100">
               <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Contato Legal</h2>
               <div className="bg-gray-50 p-6 rounded-2xl flex flex-col gap-2 border border-gray-100">
                  <p className="text-sm font-black text-gray-900">FINORA TECNOLOGIA E FINANÇAS</p>
                  <p className="text-sm font-bold text-gray-500">CNPJ: 60.827.257/0001-43</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-600 mt-2">
                    <Mail size={16} /> yago.commercial@gmail.com
                  </div>
               </div>
            </section>

          </div>
        </article>
      </main>
    </div>
  );
}
