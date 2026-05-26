'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, CheckCircle2, CreditCard, X, Palette, Star } from 'lucide-react';

interface Account {
  id: number;
  name: string;
  is_default: boolean;
  color: string;
  initial_balance: number;
  has_credit_card: boolean;
  credit_limit?: number;
  closing_day?: number;
  due_day?: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isDefault, setIsDefault] = useState(false);
  const [initialBalance, setInitialBalance] = useState('0');
  const [hasCreditCard, setHasCreditCard] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const colors = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Cinza', value: '#6b7280' },
    { name: 'Preto', value: '#111827' },
  ];

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/accounts/');
      setAccounts(res.data);
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const resetForm = () => {
    setName('');
    setColor('#3b82f6');
    setIsDefault(false);
    setInitialBalance('0');
    setHasCreditCard(false);
    setCreditLimit('');
    setClosingDay('');
    setDueDay('');
    setEditingId(null);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setColor(acc.color);
    setIsDefault(acc.is_default);
    setInitialBalance(acc.initial_balance.toString());
    setHasCreditCard(acc.has_credit_card);
    setCreditLimit(acc.credit_limit?.toString() || '');
    setClosingDay(acc.closing_day?.toString() || '');
    setDueDay(acc.due_day?.toString() || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        name, 
        color, 
        is_default: isDefault,
        initial_balance: parseFloat(initialBalance),
        has_credit_card: hasCreditCard,
        credit_limit: hasCreditCard ? parseFloat(creditLimit) : null,
        closing_day: hasCreditCard ? parseInt(closingDay) : null,
        due_day: hasCreditCard ? parseInt(dueDay) : null
      };
      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
      } else {
        await api.post('/accounts/', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar conta');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta conta? (Apenas contas sem transações podem ser excluídas)')) return;
    try {
      await api.delete(`/accounts/${id}`);
      fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir conta');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.put(`/accounts/${id}`, { is_default: true }); // No backend, set_default_account logic handles unsetting others
      fetchAccounts();
    } catch (err) {}
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Minhas Contas</h1>
            <p className="text-gray-400 text-sm font-medium">Gerencie seus bancos, carteiras e defina a conta padrão.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            <Plus size={20} />
            <span>ADICIONAR CONTA</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-100 rounded-[2.5rem] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {accounts.map((acc) => (
              <div 
                key={acc.id} 
                className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
              >
                {/* Indicador de cor lateral */}
                <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: acc.color }}></div>

                <div className="flex justify-between items-start mb-6">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: acc.color }}
                  >
                    <CreditCard size={28} />
                  </div>
                  {acc.is_default && (
                    <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full flex items-center gap-1.5 animate-in zoom-in-50">
                      <Star size={12} fill="currentColor" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Padrão</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 mb-8">
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{acc.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Conta Bancária / Carteira</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenEdit(acc)}
                    className="flex-1 py-3 bg-gray-50 text-gray-600 font-black rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <Pencil size={14} /> EDITAR
                  </button>
                  <button 
                    onClick={() => handleDelete(acc.id)}
                    className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {!acc.is_default && (
                  <button 
                    onClick={() => handleSetDefault(acc.id)}
                    className="w-full mt-2 py-2 text-[10px] font-black text-gray-400 hover:text-yellow-600 uppercase tracking-widest transition-colors"
                  >
                    Definir como Padrão
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal Adicionar/Editar */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-2xl transition-all z-[110]"
                title="Fechar"
              >
                <X size={24} />
              </button>

              <div className="p-8 border-b border-gray-100 flex-shrink-0 pr-16">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editingId ? 'Editar Conta' : 'Nova Conta'}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Configurações de Banco</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome da Conta / Banco</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Ex: Nubank, Inter, Carteira..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest flex items-center gap-2">
                    <Palette size={12} /> Escolha uma Cor
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`w-full aspect-square rounded-xl transition-all border-4 ${color === c.value ? 'border-blue-200 scale-110 shadow-lg' : 'border-transparent'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Saldo Atual da Conta (Dinheiro)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                    <input 
                      type="number" step="0.01" required 
                      className="w-full bg-gray-50 border-none rounded-[1.2rem] pl-10 pr-4 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                      value={initialBalance} 
                      onChange={e => setInitialBalance(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${hasCreditCard ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${hasCreditCard ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <span className="text-sm font-black text-gray-900 uppercase">Cartão de Crédito</span>
                        <p className="text-[9px] text-gray-400 font-medium">Habilitar funções de limite e fatura</p>
                      </div>
                    </div>
                    <input type="checkbox" className="w-5 h-5 rounded-full text-purple-600 border-gray-300 focus:ring-purple-500" checked={hasCreditCard} onChange={e => setHasCreditCard(e.target.checked)} />
                  </label>

                  {hasCreditCard && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Limite Total do Cartão</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                          <input type="number" step="0.01" className="w-full bg-purple-50/30 border-none rounded-[1.2rem] pl-10 pr-4 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none shadow-inner" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest text-nowrap">Dia do Fechamento</label>
                        <input type="number" min="1" max="31" className="w-full bg-purple-50/30 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none shadow-inner" value={closingDay} onChange={e => setClosingDay(e.target.value)} placeholder="Ex: 5" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest text-nowrap">Dia do Vencimento</label>
                        <input type="number" min="1" max="31" className="w-full bg-purple-50/30 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none shadow-inner" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="Ex: 15" />
                      </div>
                    </div>
                  )}
                </div>

                <label className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${isDefault ? 'bg-yellow-50 border-yellow-200 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDefault ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Star size={18} fill={isDefault ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <span className="text-sm font-black text-gray-900 uppercase">Conta Padrão</span>
                      <p className="text-[9px] text-gray-400 font-medium">Usada quando você não informar o banco</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded-full text-yellow-600 border-gray-300 focus:ring-yellow-500" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                </label>

                <button 
                  type="submit" 
                  className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 mt-4"
                >
                  {editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR CONTA'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
