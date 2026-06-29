'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  User, Mail, Phone, Lock, Save, Loader2, ShieldCheck, AlertCircle, 
  DollarSign, Bell, Shield, ChevronRight, TrendingUp, Download, CheckCircle2,
  RefreshCw, HelpCircle, Brain, X, PowerOff
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function SettingsPage() {
  const { isInstallable, isPWA, installPWA } = usePWAInstall();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initialPhone, setInitialPhone] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // Verification Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [botNumber, setBotNumber] = useState('556193774923');
  const [botName, setBotName] = useState('Finora Bot');
  const [showQRModal, setShowQRModal] = useState(false);

  const [currency, setCurrency] = useState('BRL');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [spendingAlertsEnabled, setSpendingAlertsEnabled] = useState(true);
  const [marketInsightsEnabled, setMarketInsightsEnabled] = useState(true);
  const [proactiveInsightsEnabled, setProactiveInsightsEnabled] = useState(true);
  const [proactiveInsightsDays, setProactiveInsightsDays] = useState('fri');
  const [proactiveInsightsHour, setProactiveInsightsHour] = useState(10);
  const [proactiveInsightsMinute, setProactiveInsightsMinute] = useState(0);
  const [proactiveInsightsEmail, setProactiveInsightsEmail] = useState(false);
  const [proactiveInsightsWhatsapp, setProactiveInsightsWhatsapp] = useState(false);
  const [hourInput, setHourInput] = useState('10');
  const [minuteInput, setMinuteInput] = useState('00');
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
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  // Toast and Confirmation states
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isUnlinkConfirmOpen, setIsUnlinkConfirmOpen] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const formatPhone = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('55')) {
      const country = '+55';
      const rest = digits.slice(2);
      if (rest.length === 0) return country;
      if (rest.length <= 2) return `${country} (${rest}`;
      if (rest.length <= 7) return `${country} (${rest.slice(0, 2)}) ${rest.slice(2)}`;
      return `${country} (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7, 11)}`;
    } else {
      if (digits.length <= 2) return `(${digits}`;
      if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setName(res.data.name || '');
        setEmail(res.data.email || '');
        const formattedPhone = formatPhone(res.data.phone || '');
        setPhone(formattedPhone);
        setInitialPhone(formattedPhone);
        const emailVerifiedStatus = res.data.email_verified || false;
        const phoneVerifiedStatus = res.data.phone_verified || false;
        setEmailVerified(emailVerifiedStatus);
        setPhoneVerified(phoneVerifiedStatus);
        
        // Regra de prioridades e default de carregamento de canais:
        if (res.data.proactive_insights_whatsapp === null || res.data.proactive_insights_email === null) {
          if (phoneVerifiedStatus) {
            setProactiveInsightsWhatsapp(true);
            setProactiveInsightsEmail(false);
          } else if (emailVerifiedStatus) {
            setProactiveInsightsWhatsapp(false);
            setProactiveInsightsEmail(true);
          } else {
            setProactiveInsightsWhatsapp(false);
            setProactiveInsightsEmail(false);
          }
        } else {
          setProactiveInsightsWhatsapp(res.data.proactive_insights_whatsapp ?? false);
          setProactiveInsightsEmail(res.data.proactive_insights_email ?? false);
        }

        setCurrency(res.data.currency || 'BRL');
        setTimezone(res.data.timezone || 'America/Sao_Paulo');
        setPushEnabled(res.data.push_notifications_enabled ?? true);
        setSpendingAlertsEnabled(res.data.spending_alerts_enabled ?? true);
        setMarketInsightsEnabled(res.data.market_insights_enabled ?? true);
        setProactiveInsightsEnabled(res.data.proactive_insights_enabled ?? true);
        setProactiveInsightsDays(res.data.proactive_insights_days || 'fri');
        const h = res.data.proactive_insights_hour ?? 10;
        const m = res.data.proactive_insights_minute ?? 0;
        setProactiveInsightsHour(h);
        setProactiveInsightsMinute(m);
        setHourInput(String(h).padStart(2, '0'));
        setMinuteInput(String(m).padStart(2, '0'));
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

  // Poller em tempo real para verificar se o WhatsApp foi ativado e fechar o modal com Toast!
  useEffect(() => {
    let intervalId: any;
    
    if (isPhoneModalOpen) {
      intervalId = setInterval(async () => {
        try {
          const res = await api.get('/auth/me');
          if (res.data.phone_verified) {
            setPhoneVerified(true);
            const formatted = formatPhone(res.data.phone || '');
            setPhone(formatted);
            setInitialPhone(formatted);
            setIsPhoneModalOpen(false);
            setShowQRModal(false);
            setMessage({ type: 'success', text: 'WhatsApp vinculado com sucesso! 🎉' });
            localStorage.setItem('user', JSON.stringify(res.data));
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error("Erro ao verificar status do WhatsApp no poller:", err);
        }
      }, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPhoneModalOpen]);

  const handleHourInputChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 2) clean = clean.slice(-2);
    setHourInput(clean);
    if (clean !== '') {
      let num = parseInt(clean, 10);
      if (num > 23) num = 23;
      setProactiveInsightsHour(num);
    } else {
      setProactiveInsightsHour(0);
    }
  };

  const handleHourInputBlur = () => {
    const num = Math.min(23, Math.max(0, proactiveInsightsHour));
    setProactiveInsightsHour(num);
    setHourInput(String(num).padStart(2, '0'));
  };

  const handleMinuteInputChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 2) clean = clean.slice(-2);
    setMinuteInput(clean);
    if (clean !== '') {
      let num = parseInt(clean, 10);
      if (num > 59) num = 59;
      setProactiveInsightsMinute(num);
    } else {
      setProactiveInsightsMinute(0);
    }
  };

  const handleMinuteInputBlur = () => {
    const num = Math.min(59, Math.max(0, proactiveInsightsMinute));
    setProactiveInsightsMinute(num);
    setMinuteInput(String(num).padStart(2, '0'));
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (proactiveInsightsHour + 1) % 24;
      setProactiveInsightsHour(next);
      setHourInput(String(next).padStart(2, '0'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (proactiveInsightsHour - 1 + 24) % 24;
      setProactiveInsightsHour(next);
      setHourInput(String(next).padStart(2, '0'));
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (proactiveInsightsMinute + 1) % 60;
      setProactiveInsightsMinute(next);
      setMinuteInput(String(next).padStart(2, '0'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (proactiveInsightsMinute - 1 + 60) % 60;
      setProactiveInsightsMinute(next);
      setMinuteInput(String(next).padStart(2, '0'));
    }
  };

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
        phone: phone.replace(/\D/g, ''), 
        currency,
        timezone,
        push_notifications_enabled: pushEnabled,
        spending_alerts_enabled: spendingAlertsEnabled,
        market_insights_enabled: marketInsightsEnabled,
        proactive_insights_enabled: proactiveInsightsEnabled,
        proactive_insights_days: proactiveInsightsDays,
        proactive_insights_hour: proactiveInsightsHour,
        proactive_insights_minute: proactiveInsightsMinute,
        proactive_insights_email: proactiveInsightsEmail,
        proactive_insights_whatsapp: proactiveInsightsWhatsapp
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

      // Sincroniza os estados locais com o retorno do backend
      setName(userRes.data.name || '');
      setEmail(userRes.data.email || '');
      setPhone(formatPhone(userRes.data.phone || ''));
      const emailVerifiedStatus = userRes.data.email_verified || false;
      const phoneVerifiedStatus = userRes.data.phone_verified || false;
      setEmailVerified(emailVerifiedStatus);
      setPhoneVerified(phoneVerifiedStatus);

      // Regra de prioridades e default de carregamento de canais:
      if (userRes.data.proactive_insights_whatsapp === null || userRes.data.proactive_insights_email === null) {
        if (phoneVerifiedStatus) {
          setProactiveInsightsWhatsapp(true);
          setProactiveInsightsEmail(false);
        } else if (emailVerifiedStatus) {
          setProactiveInsightsWhatsapp(false);
          setProactiveInsightsEmail(true);
        } else {
          setProactiveInsightsWhatsapp(false);
          setProactiveInsightsEmail(false);
        }
      } else {
        setProactiveInsightsWhatsapp(userRes.data.proactive_insights_whatsapp ?? false);
        setProactiveInsightsEmail(userRes.data.proactive_insights_email ?? false);
      }
      setCurrency(userRes.data.currency || 'BRL');
      setPushEnabled(userRes.data.push_notifications_enabled ?? true);
      setSpendingAlertsEnabled(userRes.data.spending_alerts_enabled ?? true);
      setMarketInsightsEnabled(userRes.data.market_insights_enabled ?? true);
      setProactiveInsightsEnabled(userRes.data.proactive_insights_enabled ?? true);
      setProactiveInsightsDays(userRes.data.proactive_insights_days || 'fri');
      const h = userRes.data.proactive_insights_hour ?? 10;
      const m = userRes.data.proactive_insights_minute ?? 0;
      setProactiveInsightsHour(h);
      setProactiveInsightsMinute(m);
      setHourInput(String(h).padStart(2, '0'));
      setMinuteInput(String(m).padStart(2, '0'));
      setInvestorProfile(userRes.data.investor_profile || 'Não Definido');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao atualizar perfil.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalculateProfile = async () => {
    if (!q1 || !q2 || !q3) {
      showToast('error', 'Por favor, responda a todas as perguntas do questionário.');
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
      // 1. Emite no banco do usuário via PUT /auth/me
      await api.put('/auth/me', { investor_profile: calculated });
      // 2. Registra na memória de longo prazo da IA para que o Chat lembre na hora
      await api.post('/ai/memory', { content: `Perfil de investidor definido como: ${calculated}.` });
      
      setInvestorProfile(calculated);
      setIsQuizOpen(false);
      setQ1('');
      setQ2('');
      setQ3('');
      showToast('success', `Perfil de investidor recalculado com sucesso: ${calculated}!`);
    } catch (err) {
      showToast('error', 'Erro ao salvar o perfil de investidor.');
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
      showToast('error', 'Erro ao enviar código por e-mail.');
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
      showToast('success', 'E-mail verificado com sucesso!');
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Código inválido.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveAndRequestVerification = async () => {
    try {
      setIsVerifying(true);
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) {
        showToast('error', 'Por favor, digite um número de telefone válido.');
        return;
      }

      // 1. Salva automaticamente o número no banco de dados primeiro
      const payload: any = { 
        name, 
        email, 
        phone: cleanPhone, 
        currency,
        push_notifications_enabled: pushEnabled,
        spending_alerts_enabled: spendingAlertsEnabled,
        market_insights_enabled: marketInsightsEnabled,
        proactive_insights_enabled: proactiveInsightsEnabled,
        proactive_insights_days: proactiveInsightsDays,
        proactive_insights_hour: proactiveInsightsHour,
        proactive_insights_minute: proactiveInsightsMinute
      };
      
      await api.put('/auth/me', payload);
      
      // Sincroniza localmente o initialPhone para ser o novo número salvo
      setInitialPhone(phone);
      setPhoneVerified(false); // Reseta verificação para o novo número

      // 2. Dispara a requisição do token de verificação
      const res = await api.post('/auth/request-phone-verification');
      setWhatsappToken(res.data.token);
      
      // Busca informações reais do bot ativo da Evolution API
      try {
        const botRes = await api.get('/whatsapp/bot-info');
        if (botRes.data?.number) {
          setBotNumber(botRes.data.number);
          setBotName(botRes.data.profile_name || 'Finora Bot');
        }
      } catch (botErr) {
        console.error('Erro ao carregar informações do bot', botErr);
      }
      
      setIsPhoneModalOpen(true);
    } catch (err) {
      showToast('error', 'Erro ao salvar o número ou solicitar o token do WhatsApp.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestPhoneVerification = async () => {
    try {
      setIsVerifying(true);
      const res = await api.post('/auth/request-phone-verification');
      setWhatsappToken(res.data.token);
      
      // Busca informações reais do bot ativo da Evolution API de forma autônoma
      try {
        const botRes = await api.get('/whatsapp/bot-info');
        if (botRes.data?.number) {
          setBotNumber(botRes.data.number);
          setBotName(botRes.data.profile_name || 'Finora Bot');
        }
      } catch (botErr) {
        console.error('Erro ao carregar informações do bot', botErr);
      }
      
      setIsPhoneModalOpen(true);
    } catch (err) {
      showToast('error', 'Erro ao gerar token do WhatsApp. Certifique-se de que salvou seu número primeiro.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnectPhone = async () => {
    setIsUnlinkConfirmOpen(false);
    setIsVerifying(true);
    try {
      await api.put('/auth/me', { phone_verified: false, whatsapp_lid: null });
      setPhoneVerified(false);
      showToast('success', 'WhatsApp desvinculado com sucesso!');
      
      const userRes = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(userRes.data));
    } catch (err) {
      showToast('error', 'Erro ao desvincular o telefone celular.');
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

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-gray-100 pb-px gap-8 overflow-x-auto scrollbar-none mb-6">
              {[
                { id: 'profile', label: 'Perfil & Identidade', icon: User },
                { id: 'notifications', label: 'Notificações & IA', icon: Bell },
                { id: 'security', label: 'Segurança & Privacidade', icon: Shield }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2.5 pb-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative cursor-pointer ${
                      isActive 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
                {/* SEÇÃO: IDENTIDADE */}
                <div className="lg:col-span-7 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
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
                        {phone.replace(/\D/g, '') !== initialPhone.replace(/\D/g, '') ? (
                            <button 
                                type="button" 
                                onClick={handleSaveAndRequestVerification} 
                                className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-tighter"
                            >
                                Salvar & Ativar Zap
                            </button>
                        ) : phoneVerified ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-tighter">
                                    <CheckCircle2 size={10} /> Verificado
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsUnlinkConfirmOpen(true)}
                                    className="text-[9px] font-black text-red-500 hover:underline uppercase tracking-tighter cursor-pointer"
                                >
                                    Desvincular
                                </button>
                            </div>
                        ) : (
                            <button type="button" onClick={handleRequestPhoneVerification} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-tighter">Ativar Zap</button>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                            type="text"
                            className={`w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner ${phoneVerified ? 'pr-12 border-green-100' : ''}`}
                            value={phone} 
                            onChange={e => setPhone(formatPhone(e.target.value))}
                            placeholder="+55 (61) 99377-4923"
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
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Fuso Horário</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner appearance-none cursor-pointer"
                        value={timezone} onChange={e => setTimezone(e.target.value)}
                      >
                        <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                        <option value="America/Manaus">Manaus (GMT-4)</option>
                        <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                        <option value="America/Denver">Montanhas (GMT-7)</option>
                        <option value="America/New_York">Costa Leste EUA (GMT-5)</option>
                        <option value="Europe/London">Londres (GMT+0)</option>
                        <option value="Europe/Paris">Paris/Roma (GMT+1)</option>
                        <option value="UTC">Universal Coordinated Time (UTC)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO: PERFIL DE INVESTIDOR */}
                <div className="lg:col-span-5 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
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
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
                {/* SEÇÃO: NOTIFICAÇÕES */}
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
                       <Bell size={24} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Comunicações & IA</h2>
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

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                            <Brain size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Finora Proativo 🧠</p>
                            <p className="text-[10px] text-gray-400 font-bold">Conselhos e insights proativos personalizados da IA</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={proactiveInsightsEnabled} onChange={e => setProactiveInsightsEnabled(e.target.checked)} />
                          <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {proactiveInsightsEnabled && (
                        <div className="p-6 rounded-[2rem] bg-blue-50/30 border border-blue-100/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div>
                            <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Dias da semana para receber insights:</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: 'Seg', val: 'mon' },
                                { label: 'Ter', val: 'tue' },
                                { label: 'Qua', val: 'wed' },
                                { label: 'Qui', val: 'thu' },
                                { label: 'Sex', val: 'fri' },
                                { label: 'Sáb', val: 'sat' },
                                { label: 'Dom', val: 'sun' }
                              ].map(day => {
                                const isActive = proactiveInsightsDays.split(',').map(d => d.trim().toLowerCase()).includes(day.val);
                                return (
                                  <button
                                    key={day.val}
                                    type="button"
                                    onClick={() => {
                                      const currentDays = proactiveInsightsDays.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
                                      let newDays;
                                      if (isActive) {
                                        newDays = currentDays.filter(d => d !== day.val);
                                      } else {
                                        newDays = [...currentDays, day.val];
                                      }
                                      // Se desmarcar tudo, deixa pelo menos 'fri' ou o dia clicado
                                      if (newDays.length === 0) {
                                        newDays = [day.val];
                                      }
                                      setProactiveInsightsDays(newDays.join(','));
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight transition-all active:scale-95 border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'}`}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Horário aproximado do insight:</p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center bg-white border border-gray-100 rounded-2xl p-3 px-5 gap-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all max-w-[180px]">
                                <input
                                  type="text"
                                  maxLength={2}
                                  value={hourInput}
                                  onChange={e => handleHourInputChange(e.target.value)}
                                  onBlur={handleHourInputBlur}
                                  onKeyDown={handleHourKeyDown}
                                  className="w-8 bg-transparent text-center text-sm font-black text-gray-900 focus:outline-none"
                                  placeholder="10"
                                />
                                <span className="text-sm font-black text-gray-400 select-none">:</span>
                                <input
                                  type="text"
                                  maxLength={2}
                                  value={minuteInput}
                                  onChange={e => handleMinuteInputChange(e.target.value)}
                                  onBlur={handleMinuteInputBlur}
                                  onKeyDown={handleMinuteKeyDown}
                                  className="w-8 bg-transparent text-center text-sm font-black text-gray-900 focus:outline-none"
                                  placeholder="00"
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hora do Servidor</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Canais de Envio Opcionais:</p>
                            
                            {/* Alerta de Verificação se nenhum canal estiver verificado */}
                            {!emailVerified && !phoneVerified && (
                              <div className="p-4 bg-red-50 border border-red-100/50 rounded-2xl flex items-start gap-3 text-red-700 mb-3 animate-in slide-in-from-top-1">
                                <AlertCircle size={16} className="mt-0.5" />
                                <p className="text-[10px] font-black uppercase tracking-tight leading-relaxed">
                                  Opções desabilitadas por falta de verificação. <button type="button" onClick={() => setActiveTab('profile')} className="underline hover:text-red-950">Verifique aqui</button>
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                              {/* Botão WhatsApp */}
                              <button
                                type="button"
                                disabled={!phoneVerified}
                                onClick={() => setProactiveInsightsWhatsapp(!proactiveInsightsWhatsapp)}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border active:scale-95 flex items-center gap-2 ${
                                  !phoneVerified
                                    ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed opacity-50'
                                    : proactiveInsightsWhatsapp
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-50'
                                      : 'bg-gray-800 text-gray-300 border-gray-800 hover:bg-gray-900 hover:border-gray-900 shadow-sm'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${proactiveInsightsWhatsapp ? 'bg-white animate-ping' : 'bg-gray-500'}`} />
                                WhatsApp
                              </button>

                              {/* Botão Email */}
                              <button
                                type="button"
                                disabled={!emailVerified}
                                onClick={() => setProactiveInsightsEmail(!proactiveInsightsEmail)}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border active:scale-95 flex items-center gap-2 ${
                                  !emailVerified
                                    ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed opacity-50'
                                    : proactiveInsightsEmail
                                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-50'
                                      : 'bg-gray-800 text-gray-300 border-gray-800 hover:bg-gray-900 hover:border-gray-900 shadow-sm'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${proactiveInsightsEmail ? 'bg-white animate-ping' : 'bg-gray-500'}`} />
                                E-mail
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
                {/* SEÇÃO: PRIVACIDADE */}
                <div className="lg:col-span-7 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
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

                {/* SEÇÃO: SEGURANÇA */}
                <div className="lg:col-span-5 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 flex flex-col">
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
            )}

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
                      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center space-y-6 relative">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm"><Phone size={32} /></div>
                          
                          {!showQRModal ? (
                            <>
                              <h2 className="text-2xl font-black text-gray-900 uppercase">Ativar WhatsApp</h2>
                              <p className="text-gray-400 text-xs font-semibold">Envie o código de ativação abaixo para iniciar o vínculo seguro do seu Silo com o WhatsApp:</p>
                              
                              <div className="bg-gray-900 text-white py-6 rounded-3xl text-4xl font-black tracking-widest shadow-xl shadow-emerald-100 font-mono">
                                  {whatsappToken}
                              </div>

                              <div className="space-y-1">
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Enviar para o Número:</p>
                                <p className="text-base font-black text-gray-900 leading-none">{formatPhone(botNumber)}</p>
                              </div>

                              <div className="space-y-3 pt-2">
                                <a 
                                  href={`https://wa.me/${botNumber}?text=${encodeURIComponent(whatsappToken)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 text-xs uppercase tracking-widest shadow-lg shadow-emerald-100"
                                >
                                  Conversar no WhatsApp
                                </a>

                                <button 
                                  type="button" 
                                  onClick={() => setShowQRModal(true)}
                                  className="w-full py-4 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
                                >
                                  Ver QR Code
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <h2 className="text-2xl font-black text-gray-900 uppercase">Escanear QR Code</h2>
                              <p className="text-gray-400 text-xs font-semibold">Aponte a câmera do seu celular para ler o QR Code e preencher o código de ativação automaticamente:</p>
                              
                              <div className="p-4 bg-gray-50 border border-gray-100 rounded-3xl max-w-[200px] mx-auto shadow-inner flex items-center justify-center">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://wa.me/${botNumber}?text=${encodeURIComponent(whatsappToken)}`)}`}
                                  alt="WhatsApp QR Code"
                                  className="w-[180px] h-[180px] object-contain rounded-xl"
                                />
                              </div>

                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                Código embutido: {whatsappToken}
                              </p>

                              <button 
                                type="button" 
                                onClick={() => setShowQRModal(false)}
                                className="w-full py-4 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
                              >
                                Voltar
                              </button>
                            </>
                          )}

                          <button 
                            type="button" 
                            onClick={() => { setIsPhoneModalOpen(false); setShowQRModal(false); }} 
                            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors block mx-auto pt-2"
                          >
                            Fechar
                          </button>
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