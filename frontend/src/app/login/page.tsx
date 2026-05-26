'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData);
      localStorage.setItem('token', response.data.access_token);
      
      // Armazenar infos básicas do usuário
      try {
        const userRes = await api.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(userRes.data));
      } catch (e) {
        console.error("Erro ao buscar dados do usuário");
      }

      // Redirecionamento com fallback
      if (router) {
        router.push('/dashboard');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error(err);
      setError('Login falhou. Verifique suas credenciais.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <Image 
            src="/logo_fiora.png" 
            alt="Finora Logo" 
            width={80} 
            height={80} 
            className="rounded-xl mb-2 shadow-sm"
          />
          <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
            Entre no Finora
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link href="/forgot-password" title="Recuperar senha" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Esqueci minha senha
            </Link>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Entrar
            </button>
          </div>
        </form>
        <div className="text-center pt-2">
          <Link href="/register" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            Não tem uma conta? Registre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
