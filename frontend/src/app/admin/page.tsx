'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Users, PhoneCall, RefreshCw, Smartphone, Mail, Globe, ShieldAlert,
  Loader2, CheckCircle2, AlertTriangle, ArrowRight, Trash2, ShieldCheck, X,
  Brain, Ban, Check, UserMinus, ShieldAlert as LockIcon, CheckCircle
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  last_location: string | null;
  known_ips: string;
  phone_verified: boolean;
  email_verified: boolean;
  accounts_count: number;
  transactions_count: number;
  timezone: string;
  is_active: boolean;
  ai_tokens_used: number;
}

interface AdminSummary {
  total_users: number;
  whatsapp_active_users: number;
  email_active_users: number;
  pwa_active_users: number;
  total_ai_tokens_consumed: number;
  beta_invite_code: string | null;
  users: AdminUser[];
}

export default function AdminPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Custom Interactive Action States
  const [isResettingId, setIsResettingId] = useState<string | null>(null);
  const [isBlockingId, setIsBlockingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchAdminData = async () => {
    try {
      // 1. Verifica se usuário é administrador
      const meRes = await api.get('/auth/me');
      if (meRes.data.email !== 'yago.commercial@gmail.com') {
        showToast('error', 'Acesso negado. Redirecionando...');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }
      setIsAdmin(true);

      // 2. Coleta sumário
      const summaryRes = await api.get('/admin/summary');
      setSummary(summaryRes.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Erro ao carregar painel administrativo');
      setTimeout(() => router.push('/dashboard'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResetUser = async (userId: string, userName: string) => {
    try {
      const res = await api.post(`/admin/reset-user/${userId}`);
      showToast('success', `Sucesso: ${res.data.message}`);
      fetchAdminData();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || `Erro ao resetar dados de ${userName}`);
    } finally {
      setIsResettingId(null);
    }
  };

  const handleToggleBlockUser = async (userId: string, userName: string) => {
    try {
      const res = await api.post(`/admin/toggle-block-user/${userId}`);
      showToast('success', res.data.message);
      fetchAdminData();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || `Erro ao alterar status de ${userName}`);
    } finally {
      setIsBlockingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const res = await api.delete(`/admin/delete-user/${userId}`);
      showToast('success', res.data.message);
      fetchAdminData();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || `Erro ao deletar conta de ${userName}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando painel admin...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4 max-w-md mx-auto text-center px-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center shadow-lg shadow-red-100">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Acesso Restrito ao Administrador</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            Sua conta atual não possui privilégios de superusuário do sistema. Você está sendo redirecionado para o Dashboard financeiro.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /> Painel de Controle Geral
            </span>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Administração Finora 👑</h1>
          </div>
          <div className="px-5 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
            <ShieldCheck className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-left">
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Código de Convite Beta</p>
              <p className="text-xs font-black text-blue-600">{summary?.beta_invite_code || 'Desativado'}</p>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-50">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Usuários</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{summary?.total_users}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-50">
              <PhoneCall size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adoção Zap</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{summary?.whatsapp_active_users} <span className="text-xs text-gray-400 font-bold">({summary ? Math.round((summary.whatsapp_active_users / summary.total_users) * 100) : 0}%)</span></p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-md shadow-purple-50">
              <Smartphone size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adoção PWA/IPs</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{summary?.pwa_active_users} <span className="text-xs text-gray-400 font-bold">({summary ? Math.round((summary.pwa_active_users / summary.total_users) * 100) : 0}%)</span></p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-md shadow-orange-50">
              <Mail size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mails On</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{summary?.email_active_users} <span className="text-xs text-gray-400 font-bold">({summary ? Math.round((summary.email_active_users / summary.total_users) * 100) : 0}%)</span></p>
            </div>
          </div>

          {/* NOVO: IA Token Consumed Widget */}
          <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex items-center gap-5 col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-50">
              <Brain size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gasto IA (Tokens)</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight">{summary?.total_ai_tokens_consumed.toLocaleString()}</p>
            </div>
          </div>

        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 bg-blue-600 rounded-full"></span> Lista de Usuários e Atividade
            </h3>
            <button 
              onClick={() => { fetchAdminData(); showToast('success', 'Dados atualizados!'); }}
              className="p-2 bg-white border border-gray-200 hover:border-blue-200 text-gray-500 hover:text-blue-600 hover:shadow-md transition-all rounded-xl active:scale-95 cursor-pointer animate-in duration-200"
              title="Atualizar Dados"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Verificações</th>
                  <th className="px-6 py-4">Fuso / Localização</th>
                  <th className="px-6 py-4 text-center">IA (Tokens)</th>
                  <th className="px-6 py-4 text-center">Registros</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary?.users.map((u) => (
                  <tr key={u.id} className={`group hover:bg-gray-50/40 transition-colors ${!u.is_active ? 'bg-red-50/10 opacity-75' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm tracking-tight flex items-center gap-2">
                          {u.name}
                          {!u.is_active && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                              <Ban size={10} /> BLOQUEADO
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400 font-bold leading-none mt-1">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full w-max ${u.phone_verified ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                          <PhoneCall size={10} /> {u.phone_verified ? `Zap On (${u.phone || 'Sem nro'})` : 'Zap Off'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full w-max ${u.email_verified ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                          <Mail size={10} /> {u.email_verified ? 'E-mail On' : 'E-mail Off'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-600 font-bold flex items-center gap-1.5">
                          <Globe size={12} className="text-gray-400" /> {u.timezone}
                        </span>
                        {u.last_location && (
                          <span className="text-gray-400 font-medium truncate max-w-[180px]" title={u.known_ips}>
                            {u.last_location}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* NOVO: IA Token metrics */}
                    <td className="px-6 py-5 text-center font-bold text-gray-700 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${u.ai_tokens_used > 0 ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 font-medium bg-gray-50'}`}>
                        <Brain size={12} />
                        {(u.ai_tokens_used || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-500">
                        <span>Contas: <strong className="text-gray-900">{u.accounts_count}</strong></span>
                        <span>Transações: <strong className="text-gray-900">{u.transactions_count}</strong></span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {/* Interactive block action */}
                      {isBlockingId === u.id ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in zoom-in-95 duration-200">
                          <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest select-none">{u.is_active ? 'Bloquear?' : 'Ativar?'}</span>
                          <button 
                            onClick={() => handleToggleBlockUser(u.id, u.name)} 
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-90 cursor-pointer"
                          >
                            Sim
                          </button>
                          <button 
                            onClick={() => setIsBlockingId(null)} 
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-90 cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : isResettingId === u.id ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in zoom-in-95 duration-200">
                          <span className="text-[8px] font-black text-red-600 uppercase tracking-widest select-none">Resetar?</span>
                          <button 
                            onClick={() => handleResetUser(u.id, u.name)} 
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-90 cursor-pointer"
                          >
                            Sim
                          </button>
                          <button 
                            onClick={() => setIsResettingId(null)} 
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-90 cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : isDeletingId === u.id ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in zoom-in-95 duration-200">
                          <span className="text-[8px] font-black text-red-700 uppercase tracking-widest select-none">Excluir Conta?</span>
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.name)} 
                            className="px-2.5 py-1.5 bg-red-700 hover:bg-red-800 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-90 cursor-pointer"
                          >
                            Sim
                          </button>
                          <button 
                            onClick={() => setIsDeletingId(null)} 
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-90 cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        u.email !== 'yago.commercial@gmail.com' && (
                          <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Bloquear / Desbloquear */}
                            <button 
                              onClick={() => setIsBlockingId(u.id)}
                              className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer border ${u.is_active ? 'bg-amber-50 hover:bg-amber-500 hover:text-white border-amber-100 text-amber-600' : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-100 text-emerald-600'}`}
                              title={u.is_active ? "Bloquear Conta" : "Ativar/Desbloquear Conta"}
                            >
                              <Ban size={14} />
                            </button>

                            {/* Resetar Lançamentos */}
                            <button 
                              onClick={() => setIsResettingId(u.id)}
                              className="p-2 bg-red-50 hover:bg-red-500 hover:text-white border border-red-100 text-red-600 rounded-xl transition-all active:scale-95 cursor-pointer"
                              title="Limpar todos os Lançamentos e Contas"
                            >
                              <RefreshCw size={14} />
                            </button>

                            {/* Excluir Usuário */}
                            <button 
                              onClick={() => setIsDeletingId(u.id)}
                              className="p-2 bg-gray-100 hover:bg-gray-900 hover:text-white border border-gray-200 text-gray-700 rounded-xl transition-all active:scale-95 cursor-pointer"
                              title="Excluir Conta Permanentemente do Sistema"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Floating Toast Notification */}
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
