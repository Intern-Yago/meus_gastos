'use client';

import Sidebar from './Sidebar';
import Footer from './Footer';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import api from '@/lib/api';

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const notificationsRef = useRef<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/'); 
      setNotifications(res.data);
      notificationsRef.current = res.data;
      setUnreadCount(res.data.filter((n: Notification) => !n.is_read).length);
    } catch (err) {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Define o cookie de download para imagens/logos/relatórios
    const setupDownloadCookie = async () => {
        try {
            await api.post('/auth/set-download-cookie');
        } catch (e) {
            console.error("Erro ao renovar cookie de download");
        }
    };
    setupDownloadCookie();

    setLoading(false);
    fetchNotifications();

    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // SSE Stream para notificações em tempo real (Estilo Webhook)
    const baseUrl = api.defaults.baseURL;
    
    let eventSource: EventSource;

    const connectSSE = async () => {
        try {
            // SECURITY: Pedir um ticket de uso único para não expor o JWT na URL/Logs
            const ticketRes = await api.post('/notifications/ticket');
            const ticket = ticketRes.data.ticket;
            const streamUrl = `${baseUrl}/notifications/stream?ticket=${ticket}`;

            eventSource = new EventSource(streamUrl);

            eventSource.addEventListener('connected', (e: any) => {
                console.log('SSE Connected:', JSON.parse(e.data));
            });

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.status === 'connected') return;

                    // Nova notificação recebida em tempo real!
                    setNotifications(prev => [data, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    if ("Notification" in window && Notification.permission === "granted") {
                        new window.Notification(data.title, {
                            body: data.content,
                            icon: '/logo_fiora.png'
                        });
                    }
                } catch (err) {
                    console.error('SSE Message Error:', err);
                }
            };

            eventSource.onerror = (err) => {
                console.error('SSE Connection Error, retrying in 5s...', err);
                eventSource.close();
                setTimeout(connectSSE, 5000);
            };
        } catch (err) {
            console.error('Failed to get SSE ticket, retrying...', err);
            setTimeout(connectSSE, 5000);
        }
    };

    connectSSE();

    return () => {
        if (eventSource) eventSource.close();
    };
  }, [router, fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'warning': return <AlertCircle size={16} className="text-orange-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-gray-400">Carregando Finora...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen relative overflow-hidden font-sans">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-30 shadow-sm">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <Menu size={24} />
        </button>
        <span className="font-black text-gray-900 tracking-tight text-xl">Finora</span>
        <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 relative text-gray-400">
            <Bell size={24} />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">{unreadCount}</span>}
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0 h-screen overflow-y-auto flex flex-col relative">
        {/* Desktop Header - Notification Bell (Absolute & Conditional) */}
        {unreadCount > 0 && (
            <div className="hidden lg:flex items-center justify-end px-8 py-6 absolute top-0 right-0 z-30">
                <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)} 
                    className="p-3 bg-white border border-gray-100 rounded-2xl shadow-xl text-blue-600 hover:scale-110 transition-all active:scale-95 relative"
                >
                    <Bell size={22} fill="currentColor" className="opacity-20" />
                    <Bell size={22} className="absolute top-3 left-3" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                        {unreadCount}
                    </span>
                </button>
            </div>
        )}

        <div className="max-w-7xl mx-auto p-4 md:p-8 flex-1 w-full relative z-10">
          {children}
        </div>
        <Footer />

        {/* Notifications Panel */}
        {isNotifOpen && (
            <div className="fixed top-20 right-4 lg:right-8 w-80 max-h-[70vh] bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-[60] overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Notificações</h3>
                    <button onClick={() => setIsNotifOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 italic text-xs">Nenhuma notificação por aqui.</div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-5 hover:bg-gray-50 transition-all cursor-pointer flex gap-4 ${!n.is_read ? 'bg-blue-50/20' : ''}`}>
                                <div className="mt-1">{getIcon(n.type)}</div>
                                <div className="space-y-1">
                                    <p className={`text-xs font-black uppercase tracking-tight ${!n.is_read ? 'text-blue-600' : 'text-gray-900'}`}>{n.title}</p>
                                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{n.content}</p>
                                    <p className="text-[9px] text-gray-300 font-bold uppercase">{new Date(n.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="p-4 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">Limpar Histórico</button>
                )}
            </div>
        )}
      </main>
    </div>
  );
}
