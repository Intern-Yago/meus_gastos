'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CheckCircle2, XCircle, Loader2, Wallet, ArrowRight, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export default function ConfirmPaymentPage() {
  const { token } = useParams();
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'confirming' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await api.get(`/transactions/confirm-payment-info/${token}`);
        setInfo(res.data);
        if (res.data.is_paid) {
            setStatus('success');
        } else {
            setStatus('confirming');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.response?.data?.detail || 'Link de confirmação inválido ou expirado.');
      }
    };
    if (token) fetchInfo();
  }, [token]);

  const handleConfirm = async () => {
    setStatus('loading');
    try {
      await api.post(`/transactions/confirm-payment/${token}`);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg('Não foi possível confirmar o pagamento. Tente novamente.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 p-8 md:p-12 space-y-8 text-center">
        
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-200">
                <Image src="/logo_fiora.png" alt="Finora" width={32} height={32} className="invert brightness-200" />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tight">Finora</span>
        </div>

        {status === 'loading' && (
          <div className="py-12 space-y-4">
            <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
            <p className="text-gray-400 font-bold animate-pulse uppercase text-xs tracking-widest">Validando Token...</p>
          </div>
        )}

        {status === 'confirming' && info && (
          <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Confirmar Pagamento?</h2>
                <p className="text-gray-500 font-medium">Verifique os detalhes da conta abaixo.</p>
            </div>

            <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100 text-left space-y-4">
                <div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Descrição</span>
                    <p className="text-lg font-bold text-gray-900 line-clamp-1">{info.description}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Valor</span>
                        <p className="text-2xl font-black text-blue-600">{formatCurrency(info.amount)}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Vencimento</span>
                        <p className="text-base font-bold text-gray-900">Dia {info.due_day}</p>
                    </div>
                </div>
            </div>

            <button 
              onClick={handleConfirm}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3"
            >
              <CheckCircle2 size={24} />
              <span>SIM, EU PAGUEI!</span>
            </button>

            <button 
              onClick={() => router.push('/login')}
              className="text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600"
            >
              Agora não, levar ao Login
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-8 animate-in cubic-bezier(0.4, 0, 0.2, 1) duration-500">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck size={56} />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tudo Certo!</h2>
                <p className="text-gray-500 font-medium leading-relaxed">O pagamento foi confirmado e seu dashboard já está atualizado. Parabéns pela organização!</p>
            </div>
            <button 
                onClick={() => router.push('/dashboard')}
                className="w-full py-5 bg-gray-900 text-white font-black rounded-3xl hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2 group"
            >
                <span>IR PARA O DASHBOARD</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto">
                <XCircle size={56} />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Ops! Erro no Link</h2>
                <p className="text-gray-500 font-medium">{errorMsg}</p>
            </div>
            <button 
                onClick={() => router.push('/login')}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
            >
                ENTRAR NO FINORA
            </button>
          </div>
        )}

        <p className="text-[10px] text-gray-300 font-medium uppercase tracking-[0.2em]">Finora Security • Token Validado</p>
      </div>
    </div>
  );
}
