'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-gray-100 bg-white/50 backdrop-blur-sm mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          © 2026 Finora • Silo de Inteligência Financeira
        </p>
        <div className="flex gap-6">
          <Link href="/privacy" className="text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors">
            Política de Privacidade
          </Link>
          <Link href="/cookies" className="text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors">
            Uso de Cookies
          </Link>
        </div>
      </div>
    </footer>
  );
}
