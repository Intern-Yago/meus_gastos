import Link from 'next/link';
import { Home, List, MessageSquare, LogOut, X, TrendingUp, AlertCircle, CreditCard, Tag, Target, LayoutGrid, Settings, ArrowUpCircle, Download, ClipboardCheck, Crown } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasPendingBills, setHasPendingBills] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isInstallable, isPWA, installPWA } = usePWAInstall();

  useEffect(() => {
    const checkModules = async () => {
      try {
        // Verifica contas pendentes
        const resBills = await api.get('/transactions/pending');
        setHasPendingBills(resBills.data.length > 0);

        // Verifica se é administrador
        const resMe = await api.get('/auth/me');
        setIsAdmin(resMe.data.email === 'yago.commercial@gmail.com');
      } catch (err) {
        console.error('Erro ao verificar módulos:', err);
      }
    };
    checkModules();
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const sections = [
    {
      title: 'Visão Geral',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/chat', label: 'Consultar Oráculo', icon: MessageSquare },
      ]
    },
    {
      title: 'Financeiro',
      items: [
        { href: '/transactions', label: 'Transações', icon: List },
        { href: '/accounts', label: 'Minhas Contas', icon: CreditCard },
        { href: '/bills', label: 'Contas a Pagar', icon: AlertCircle, hasBadge: true },
        { href: '/receivables', label: 'Valores a Receber', icon: ArrowUpCircle },
      ]
    },
    {
      title: 'Gestão & Crescimento',
      items: [
        { href: '/business', label: 'Meus Negócios', icon: LayoutGrid },
        { href: '/projects', label: 'Projetos', icon: Target },
        { href: '/goals', label: 'Metas', icon: Target },
        { href: '/investments', label: 'Investimentos', icon: TrendingUp },
        { href: '/fechamento', label: 'Fechamento de Mês', icon: ClipboardCheck },
      ]
    }
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-3 cursor-pointer" onClick={onClose}>
              <div className="bg-blue-600 p-1.5 rounded-xl">
                <Image 
                  src="/logo_fiora.png" 
                  alt="Finora Logo" 
                  width={32} 
                  height={32} 
                  className="rounded-lg invert brightness-200"
                />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">Finora</span>
            </Link>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <Link 
                  href="/admin"
                  title="Painel Admin 👑"
                  onClick={onClose}
                  className="p-2 text-yellow-500 hover:bg-yellow-50 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                >
                    <Crown size={18} />
                </Link>
              )}

              {isInstallable && !isPWA && (
                  <button 
                    onClick={installPWA}
                    title="Instalar Aplicativo"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95 animate-pulse cursor-pointer flex items-center justify-center"
                  >
                      <Download size={18} />
                  </button>
              )}
            </div>

            <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 mt-2 overflow-y-auto space-y-5">
            {sections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <p className="px-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link 
                        key={item.href}
                        href={item.href} 
                        onClick={onClose}
                        className={`flex items-center space-x-3 p-2.5 rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                            : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <Icon size={18} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                        <span className="flex-1">{item.label}</span>
                        {item.href === '/bills' && hasPendingBills && !isActive && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-lg shadow-orange-200 mr-1"></span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100 flex items-center gap-1.5 justify-between">
            {/* CATEGORIAS */}
            <Link
              href="/categories"
              onClick={onClose}
              className={`p-3 rounded-xl transition-all group cursor-pointer ${
                pathname === '/categories' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
              title="Categorias"
            >
              <Tag size={18} className={pathname === '/categories' ? '' : 'group-hover:scale-110 transition-transform'} />
            </Link>

            {/* CONFIGURAÇÕES */}
            <Link
              href="/settings"
              onClick={onClose}
              className={`p-3 rounded-xl transition-all group cursor-pointer ${
                pathname === '/settings' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
              title="Configurações"
            >
              <Settings size={18} className={pathname === '/settings' ? '' : 'group-hover:rotate-45 transition-transform duration-500'} />
            </Link>

            {/* SAIR */}
            <button 
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center space-x-1.5 p-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all group cursor-pointer"
            >
              <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
