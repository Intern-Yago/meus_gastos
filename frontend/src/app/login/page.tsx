'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData);
      localStorage.setItem('token', response.data.access_token);
      
      // Define o cookie de download para sessões diretas (imagens/logos/relatórios)
      try {
        await api.post('/auth/set-download-cookie');
      } catch (e) {
        console.error("Erro ao definir cookie de download");
      }
      
      try {
        const userRes = await api.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(userRes.data));
      } catch (e) {
        console.error("Erro ao buscar dados do usuário");
      }

      if (router) {
        router.push('/dashboard');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('E-mail ou senha incorretos. Tente novamente.');
      } else {
        setError('Erro ao conectar ao servidor. Verifique sua conexão.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      {/* Container Principal Centralizado */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 p-8 md:p-10 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center">
            <Image 
              src="/logo_fiora.png" 
              alt="Finora Logo" 
              width={80} 
              height={80} 
              className="rounded-xl mb-4 shadow-sm"
            />
            <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">
              Entre no Finora
            </h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2 italic">Silo de Inteligência Financeira</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold text-center border border-red-100 animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">E-mail de acesso</label>
                <input
                  type="email"
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Sua senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner pr-14"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPassword(!showPassword);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-xl cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" title="Recuperar senha" className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest cursor-pointer">
                Esqueci minha senha
              </Link>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-sm font-black rounded-2xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-blue-900/20 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  'ENTRAR NO SISTEMA'
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <Link href="/register" className="text-gray-400 hover:text-gray-900 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer">
              Não tem conta? <span className="text-blue-600 underline">Registre-se aqui</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Fixo no Rodapé da Página */}
      <Footer />
    </div>
  );
}
