import Link from 'next/link';
import { Home, List, MessageSquare, LogOut, X, TrendingUp, AlertCircle, CreditCard, Tag, Target } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasInvestments, setHasInvestments] = useState(false);
  const [hasPendingBills, setHasPendingBills] = useState(false);

  useEffect(() => {
    const checkModules = async () => {
      try {
        // Verifica investimentos
        const resInv = await api.get('/investments/check');
        setHasInvestments(resInv.data.has_investments);
        
        // Verifica contas pendentes
        const resBills = await api.get('/transactions/pending');
        setHasPendingBills(resBills.data.length > 0);
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

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/transactions', label: 'Transações', icon: List },
    { href: '/accounts', label: 'Contas', icon: CreditCard },
    { href: '/categories', label: 'Categorias', icon: Tag },
    { href: '/goals', label: 'Metas', icon: Target },
    { href: '/bills', label: 'A Pagar', icon: AlertCircle },
  ];

  // Adiciona investimentos se existirem
  if (hasInvestments) {
    navItems.push({ href: '/investments', label: 'Investimentos', icon: TrendingUp });
  }

  navItems.push({ href: '/chat', label: 'Chat IA', icon: MessageSquare });

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-3" onClick={onClose}>
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
            <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  onClick={onClose}
                  className={`flex items-center space-x-3 p-3 rounded-xl font-medium transition-all group ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <Icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/bills' && hasPendingBills && !isActive && (
                    <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-lg shadow-orange-200"></span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 p-3 w-full rounded-xl font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all group"
            >
              <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
