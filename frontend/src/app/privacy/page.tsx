'use client';

import { ArrowLeft, Shield, Lock, Eye, Mail, Scale, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicyPage() {
  const sections = [
    { id: 'coleta', title: '1. Coleta de Dados' },
    { id: 'protecao', title: '2. Proteção Bancária' },
    { id: 'seguranca', title: '3. Segurança (JWT)' },
    { id: 'direitos', title: '4. Seus Direitos' },
    { id: 'controlador', title: '5. Identificação' },
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
        {/* Menu Lateral de Âncoras (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-10 h-fit space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sumário</p>
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
             <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Segurança Garantida</span>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atualizado em Maio/2026</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-8 leading-[1.1]">
            Política de <br/><span className="text-blue-600 text-shadow-sm">Privacidade</span>
          </h1>

          <p className="text-gray-600 text-lg font-medium leading-[1.8] mb-12">
            No Finora, acreditamos que sua privacidade financeira é um direito fundamental. Esta política detalha como orquestramos seus dados para entregar inteligência sem comprometer sua segurança.
          </p>

          <div className="space-y-16 text-gray-600 text-base leading-[1.8]">
            
            <section id="coleta" className="scroll-mt-10">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> 1. Coleta de Dados
              </h2>
              <p>
                Coletamos informações essenciais para a sua jornada: nome, e-mail e telefone. Seus dados financeiros — como transações, contas bancárias e projetos — são armazenados de forma isolada e vinculados criptograficamente ao seu perfil. Nunca utilizamos seus dados para vender publicidade.
              </p>
            </section>

            <section id="protecao" className="scroll-mt-10 bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 relative overflow-hidden group">
              <Lock className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
              <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <Shield className="text-blue-600" /> 2. Proteção de Dados Bancários
              </h2>
              <p className="text-blue-900/80 font-bold">
                O Finora utiliza Silos de Armazenamento Isolados. 
              </p>
              <p className="mt-4">
                Extratos bancários enviados para processamento automático (IA) possuem um <strong>ciclo de vida de autodestruição</strong>. Após o processamento, esses arquivos são removidos fisicamente dos nossos servidores, em total conformidade com as exigências da LGPD para dados sensíveis.
              </p>
            </section>

            <section id="seguranca" className="scroll-mt-10">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> 3. Segurança Técnica (JWT)
              </h2>
              <p>
                Toda a comunicação entre o aplicativo e nossos servidores é protegida por tokens JWT de alta segurança. Isso garante que apenas você possa acessar suas informações. Nossos especialistas (IA) operam dentro de um sandbox seguro, sem acesso a chaves de banco ou movimentação real de dinheiro.
              </p>
            </section>

            <section id="direitos" className="scroll-mt-10">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> 4. Seus Direitos (LGPD)
              </h2>
              <p>
                Garantimos o seu <strong>Direito de Eliminação</strong>. Ao deletar uma transação ou sua conta, realizamos a purga física imediata de todos os registros e arquivos anexados (comprovantes).
              </p>
              <p className="mt-4">
                Você pode exercer outros direitos garantidos pela LGPD, como confirmação de tratamento e correção de dados, enviando uma solicitação para <a href="mailto:yago.commercial@gmail.com" className="text-blue-600 font-bold underline">yago.commercial@gmail.com</a>.
              </p>
            </section>

            <section id="controlador" className="scroll-mt-10 pt-10 border-t border-gray-100">
               <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Identificação do Controlador</h2>
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
