'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  User, Mail, Phone, Lock, Save, Loader2, ShieldCheck, AlertCircle, 
  DollarSign, Bell, Shield, ChevronRight, TrendingUp, Download, CheckCircle2,
  RefreshCw, HelpCircle
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function SettingsPage() {
  const { isInstallable, isPWA, installPWA } = usePWAInstall();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // Verification Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [currency, setCurrency] = useState('BRL');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [spendingAlertsEnabled, setSpendingAlertsEnabled] = useState(true);
  const [marketInsightsEnabled, setMarketInsightsEnabled] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setPasswordConfirm] = useState('');
  const [cookiePrefs, setCookiePrefs] = useState({ functional: true, intelligence: true });
  const [expandedCookie, setExpandedCookie] = useState<string | null>(null);

  // Perfil de Investidor States
  const [investorProfile, setInvestorProfile] = useState('Não Definido');
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');

  const toggleExpand = (key: string) => {
    setExpandedCookie(expandedCookie === key ? null : key);
  };

  const updateCookiePrefs = (key: 'functional' | 'intelligence', val: boolean) => {
    const newPrefs = { ...cookiePrefs, [key]: val };
    setCookiePrefs(newPrefs);
    localStorage.setItem('finora_cookie_consent_v2', JSON.stringify({ essential: true, ...newPrefs }));
    if (key === 'functional' && !val) {
        localStorage.setItem('finora_auto_speak', 'false');
    }
  };
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setName(res.data.name || '');
        setEmail(res.data.email || '');
        setPhone(res.data.phone || '');
        setEmailVerified(res.data.email_verified || false);
        setPhoneVerified(res.data.phone_verified || false);
        setCurrency(res.data.currency || 'BRL');
        setPushEnabled(res.data.push_notifications_enabled ?? true);
        setSpendingAlertsEnabled(res.data.spending_alerts_enabled ?? true);
        setMarketInsightsEnabled(res.data.market_insights_enabled ?? true);
        setInvestorProfile(res.data.investor_profile || 'Não Definido');
        
        const savedCookies = localStorage.getItem('finora_cookie_consent_v2');
        if (savedCookies) {
          const parsed = JSON.parse(savedCookies);
          setCookiePrefs({ functional: parsed.functional ?? true, intelligence: parsed.intelligence ?? true });
        }
      } catch (err) {
        console.error('Erro ao buscar dados do usuário');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = { 
        name, 
        email, 
        phone, 
        currency,
        push_notifications_enabled: pushEnabled,
        spending_alerts_enabled: spendingAlertsEnabled,
        market_insights_enabled: marketInsightsEnabled
      };
      if (password) payload.password = password;

      await api.put('/auth/me', payload);
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setPassword('');
      setPasswordConfirm('');
      
      if (pushEnabled && "Notification" in window) {
        Notification.requestPermission();
      }

      const userRes = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(userRes.data));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao atualizar perfil.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalculateProfile = async () => {
    if (!q1 || !q2 || !q3) {
      alert('Por favor, responda a todas as perguntas do questionário.');
      return;
    }
    
    let calculated = 'Moderado';
    if (q1 === 'a' && q3 === 'a') {
      calculated = 'Conservador';
    } else if (q1 === 'c' || q3 === 'c') {
      calculated = 'Arrojado';
    } else {
      calculated = 'Moderado';
    }
    
    setIsVerifying(true);
    try {
      // 1. Atualiza no banco do usuário via PUT /auth/me
      await api.put('/auth/me', { investor_profile: calculated });
      // 2. Registra na memória de longo prazo da IA para que o Chat lembre na hora
      await api.post('/ai/memory', { content: `Perfil de investidor definido como: ${calculated}.` });
      
      setInvestorProfile(calculated);
      setIsQuizOpen(false);
      setQ1('');
      setQ2('');
      setQ3('');
      setMessage({ type: 'success', text: `Perfil de investidor recalculado com sucesso: ${calculated}!` });
    } catch (err) {
      alert('Erro ao salvar o perfil de investidor.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestEmailVerification = async () => {
    try {
      setIsVerifying(true);
      await api.post('/auth/request-email-verification');
      setIsEmailModalOpen(true);
    } catch (err) {
      alert("Erro ao enviar código por e-mail.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      setIsVerifying(true);
      await api.post('/auth/verify-email', { token: verificationCode, new_password: '' });
      setEmailVerified(true);
      setIsEmailModalOpen(false);
      setVerificationCode('');
      setMessage({ type: 'success', text: 'E-mail verificado com sucesso!' });
    } catch (err: any) {
      alert(err.response?.data?.detail || "Código inválido.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestPhoneVerification = async () => {
    try {
      setIsVerifying(true);
      const res = await api.post('/auth/request-phone-verification');
      setWhatsappToken(res.data.token);
      setIsPhoneModalOpen(true);
    } catch (err) {
      alert("Erro ao gerar token do WhatsApp. Certifique-se de que salvou seu número primeiro.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-20">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Configurações</h1>
            <p className="text-gray-400 text-base font-medium mt-1">Gerencie sua identidade, segurança e privacidade global.</p>
          </div>
          {isInstallable && !isPWA && (
            <button 
              type="button"
              onClick={installPWA}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
            >
               <Download size={18} /> Instalar Aplicativo
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="bg-white p-20 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-gray-400 font-bold italic">Sincronizando preferências...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="space-y-10">
            {message && (
              <div className={`p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {message.type === 'success' ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
                <p className="font-black uppercase text-xs tracking-widest">{message.text}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                {/* SEÇÃO: IDENTIDADE */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                       <User size={24} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Identidade</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome Completo</label>
                      <input 
                        type="text" required
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                        value={name} onChange={e => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">E-mail Principal</label>
                        {emailVerified ? (
                            <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-tighter">
                                <CheckCircle2 size={10} /> Verificado
                            </div>
                        ) : (
                            <button type="button" onClick={handleRequestEmailVerification} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-tighter">Verificar</button>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                            type="email" required
                            className={`w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner ${emailVerified ? 'pr-12 border-green-100' : ''}`}
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                        {emailVerified && <CheckCircle2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Telefone Celular</label>
                        {phoneVerified ? (
                            <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-tighter">
                                <CheckCircle2 size={10} /> Verificado
                            </div>
                        ) : (
                            <button type="button" onClick={handleRequestPhoneVerification} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-tighter">Ativar Zap</button>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                            type="text"
                            className={`w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner ${phoneVerified ? 'pr-12 border-green-100' : ''}`}
                            value={phone} onChange={e => setPhone(e.target.value)}
                            placeholder="556193774923"
                        />
                        {phoneVerified && <CheckCircle2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Moeda do Sistema</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner appearance-none cursor-pointer"
                        value={currency} onChange={e => setCurrency(e.target.value)}
                      >
                        <option value="BRL">Real Brasileiro (R$)</option>
                        <option value="USD">Dólar Americano (US$)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">Libra Esterlina (£)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO: NOTIFICAÇÕES */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
                       <Bell size={24} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Comunicações</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                          <Shield size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Notificações Push</p>
                          <p className="text-[10px] text-gray-400 font-bold">Alertas críticos no navegador</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} />
                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Alertas de Gastos</p>
                          <p className="text-[10px] text-gray-400 font-bold">Relatórios proativos via e-mail</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={spendingAlertsEnabled} onChange={e => setSpendingAlertsEnabled(e.target.checked)} />
                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Mercado Financeiro</p>
                          <p className="text-[10px] text-gray-400 font-bold">Insights de ativos e oportunidades</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={marketInsightsEnabled} onChange={e => setMarketInsightsEnabled(e.target.checked)} />
                        <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO: PRIVACIDADE */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-gray-200">
                       <Shield size={24} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Privacidade & Cookies</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand('functional')}>
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-110 transition-transform">
                            <DollarSign size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                              Voz & Customização
                              <ChevronRight size={14} className={`text-gray-400 transition-transform ${expandedCookie === 'functional' ? 'rotate-90' : ''}`} />
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold">Experiência sonora e visual</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={cookiePrefs.functional} onChange={e => updateCookiePrefs('functional', e.target.checked)} />
                          <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {expandedCookie === 'functional' && (
                        <div className="px-8 pb-4 animate-in slide-in-from-top-2 duration-300">
                          <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                            Estes cookies permitem que a IA fale com você através de voz (TTS) e que o sistema lembre suas personalizações da interface. Sem eles, o app voltará ao padrão toda vez.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand('intelligence')}>
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-600 shadow-sm group-hover:scale-110 transition-transform">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                              Inteligência de BI
                              <ChevronRight size={14} className={`text-gray-400 transition-transform ${expandedCookie === 'intelligence' ? 'rotate-90' : ''}`} />
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold">Insights e análise preditiva</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={cookiePrefs.intelligence} onChange={e => updateCookiePrefs('intelligence', e.target.checked)} />
                          <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {expandedCookie === 'intelligence' && (
                        <div className="px-8 pb-4 animate-in slide-in-from-top-2 duration-300">
                          <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                            Utilizamos esses data para que nossa IA entenda seus padrões de consumo e possa sugerir investimentos reais via mercado (yfinance) ou te alertar sobre comportamentos financeiros de risco.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-8">
                {/* SEÇÃO: PERFIL DE INVESTIDOR */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                         <TrendingUp size={20} />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Perfil de Investidor</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Metas & Alocação</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuizOpen(true)}
                      className="p-2 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-xl transition-all hover:rotate-180 duration-500"
                      title="Refazer Questionário"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-50/50 to-teal-50/20 border border-emerald-50 text-center space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Seu Perfil Atual</p>
                    <p className="text-2xl font-black text-emerald-800 tracking-tight">{investorProfile}</p>
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed px-4">
                      {investorProfile === 'Não Definido' 
                        ? 'Faça o teste rápido clicando no ícone ao lado para desbloquear análises direcionadas de investimentos da IA!'
                        : investorProfile === 'Conservador'
                          ? 'Foco total em preservar capital, liquidez e renda fixa de alta segurança (CDB Selic, Tesouro Direto).'
                          : investorProfile === 'Moderado'
                            ? 'Equilíbrio ideal entre renda fixa de proteção e renda variável moderada (Fundos Imobiliários de tijolo, ETFs).'
                            : 'Perfil focado em maximizar ganhos de longo prazo aceitando volatilidade ativa (Ações, Cripto, MANA11).'
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-100">
                       <Lock size={24} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Segurança</h2>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nova Senha</label>
                      <input 
                        type="password"
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-red-500 outline-none shadow-inner"
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Confirmar Senha</label>
                      <input 
                        type="password"
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-red-500 outline-none shadow-inner"
                        value={confirmPassword} onChange={e => setPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-red-50 rounded-[2rem] border border-red-100 flex items-start gap-4">
                    <ShieldCheck size={24} className="text-red-600 mt-1" />
                    <p className="text-[11px] text-red-800 font-bold leading-relaxed uppercase tracking-tight">
                      Sua segurança é nossa prioridade. Use senhas complexas para blindar seu silo financeiro.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              {/* Modais de Verificação */}
              {isEmailModalOpen && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center space-y-6">
                          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm"><Mail size={32} /></div>
                          <h2 className="text-2xl font-black text-gray-900 uppercase">Validar E-mail</h2>
                          <p className="text-gray-400 text-sm font-medium">Enviamos um código de 6 dígitos para <b>{email}</b>. Insira-o abaixo:</p>
                          <input 
                            type="text" 
                            maxLength={6}
                            className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-gray-900 focus:ring-2 focus:ring-blue-500 shadow-inner"
                            value={verificationCode}
                            onChange={e => setVerificationCode(e.target.value)}
                          />
                          <button 
                            type="button"
                            disabled={isVerifying || verificationCode.length < 6}
                            onClick={handleVerifyEmail}
                            className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                          >
                              {isVerifying ? <Loader2 className="animate-spin mx-auto" /> : 'CONFIRMAR CÓDIGO'}
                          </button>
                          <button type="button" onClick={() => setIsEmailModalOpen(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">Cancelar</button>
                      </div>
                  </div>
              )}

              {isPhoneModalOpen && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center space-y-6">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm"><Phone size={32} /></div>
                          <h2 className="text-2xl font-black text-gray-900 uppercase">Ativar WhatsApp</h2>
                          <p className="text-gray-400 text-sm font-medium">Para blindar sua conexão e ativar o Silo no WhatsApp, envie o código abaixo para o nosso número:</p>
                          <div className="bg-gray-900 text-white py-6 rounded-3xl text-4xl font-black tracking-widest shadow-xl shadow-emerald-100">
                              {whatsappToken}
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                            Envie agora do seu celular cadastrado.<br/>O Finora confirmará o vínculo na hora.
                          </p>
                          <button type="button" onClick={() => setIsPhoneModalOpen(false)} className="w-full py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs tracking-widest">Já enviei / Fechar</button>
                      </div>
                  </div>
              )}

              {/* Modal de Questionário de Perfil */}
              {isQuizOpen && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 space-y-6 overflow-y-auto max-h-[90vh]">
                          <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm"><TrendingUp size={32} /></div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase">Perfil de Investidor</h2>
                            <p className="text-gray-400 text-xs font-medium">Responda a este teste rápido de 3 perguntas para alinhar as recomendações do Finora ao seu momento.</p>
                          </div>

                          <div className="space-y-4 text-left">
                            {/* Q1 */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">1. Qual é a sua tolerância a perdas?</label>
                              <select 
                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
                                value={q1} onChange={e => setQ1(e.target.value)}
                              >
                                <option value="" disabled>Escolher...</option>
                                <option value="a">Prefiro evitar perdas a qualquer custo (Segurança Máxima)</option>
                                <option value="b">Aceito pequenas oscilações para potenciais ganhos (Equilíbrio)</option>
                                <option value="c">Disposto a assumir riscos de curto prazo para altos ganhos (Agressivo)</option>
                              </select>
                            </div>

                            {/* Q2 */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">2. Qual é o seu prazo para resgatar investimentos?</label>
                              <select 
                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
                                value={q2} onChange={e => setQ2(e.target.value)}
                              >
                                <option value="" disabled>Escolher...</option>
                                <option value="a">Curto prazo (Menos de 1 ano)</option>
                                <option value="b">Médio prazo (1 a 5 anos)</option>
                                <option value="c">Longo prazo (Mais de 5 anos)</option>
                              </select>
                            </div>

                            {/* Q3 */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">3. Qual seu nível de conhecimento sobre investimentos?</label>
                              <select 
                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
                                value={q3} onChange={e => setQ3(e.target.value)}
                              >
                                <option value="" disabled>Escolher...</option>
                                <option value="a">Iniciante, tenho pouco ou nenhum conhecimento técnico</option>
                                <option value="b">Intermediário, conheço conceitos básicos de renda fixa e variável</option>
                                <option value="c">Avançado, já tenho carteira ativa e acompanho o mercado</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <button 
                              type="button"
                              disabled={isVerifying || !q1 || !q2 || !q3}
                              onClick={handleCalculateProfile}
                              className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest shadow-xl"
                            >
                                {isVerifying ? <Loader2 className="animate-spin mx-auto" /> : 'CONCLUIR TESTE'}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setIsQuizOpen(false); setQ1(''); setQ2(''); setQ3(''); }} 
                              className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors block text-center"
                            >
                              Cancelar / Fechar
                            </button>
                          </div>
                      </div>
                  </div>
              )}

              <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-3 bg-gray-900 text-white px-12 py-6 rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-2xl shadow-gray-300 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={28} /> : <Save size={28} />}
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}