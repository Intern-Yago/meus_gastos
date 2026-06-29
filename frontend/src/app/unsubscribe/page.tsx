'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ShieldCheck, XCircle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Token de cancelamento ausente.');
      return;
    }

    const performUnsubscribe = async () => {
      try {
        const res = await api.get(`/auth/unsubscribe?token=${token}`);
        setStatus('success');
        setMessage(res.data.message);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Erro ao processar sua solicitação.');
      }
    };

    performUnsubscribe();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl shadow-gray-200 p-12 text-center border border-gray-100 animate-in zoom-in-95 duration-300">
        <div className="mb-8">
            <div className="bg-blue-600 p-2 rounded-2xl inline-block mb-4">
                <span className="text-white font-black text-xl px-2">Finora</span>
            </div>
        </div>

        {status === 'loading' && (
          <div className="space-y-6">
            <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Processando sua remoção...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-green-50">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inscrição Cancelada</h1>
            <p className="text-gray-500 leading-relaxed font-medium">{message}</p>
            <div className="pt-6">
                <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200">
                    Ir para o App <ArrowRight size={16} />
                </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-50">
              <XCircle size={40} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Falha no Cancelamento</h1>
            <p className="text-gray-500 leading-relaxed font-medium">{message}</p>
            <div className="pt-6">
                <Link href="/" className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
                    Falar com o Suporte
                </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
