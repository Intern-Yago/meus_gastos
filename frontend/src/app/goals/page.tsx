'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, Target, X, Star, Heart, Car, Home, Plane, Gift, Briefcase, Coffee, ShoppingBag, Wallet, PiggyBank, Calendar, ArrowRight } from 'lucide-react';

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  color: string;
  icon: string;
}

const GOAL_ICONS: any = {
  Star, Heart, Car, Home, Plane, Gift, Briefcase, Coffee, ShoppingBag, Wallet, PiggyBank, Target
};

function GoalIcon({ name, size = 24 }: { name?: string, size?: number }) {
  const IconComp = GOAL_ICONS[name || 'Target'] || Target;
  return <IconComp size={size} />;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddProgressOpen, setIsAddProgressOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('Target');
  const [addAmount, setAddAmount] = useState('');

  const colors = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Laranja', value: '#f59e0b' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Preto', value: '#111827' },
  ];

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/goals/');
      setGoals(res.data);
    } catch (err) {
      console.error('Erro ao buscar metas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadline('');
    setColor('#3b82f6');
    setIcon('Target');
    setEditingId(null);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setName(goal.name);
    setTargetAmount(goal.target_amount.toString());
    setCurrentAmount(goal.current_amount.toString());
    setDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
    setColor(goal.color);
    setIcon(goal.icon || 'Target');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        name, 
        target_amount: parseFloat(targetAmount), 
        current_amount: parseFloat(currentAmount || '0'),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        color, 
        icon 
      };
      if (editingId) {
        await api.put(`/goals/${editingId}`, payload);
      } else {
        await api.post('/goals/', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchGoals();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar meta');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta meta?')) return;
    try {
      await api.delete(`/goals/${id}`);
      fetchGoals();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir meta');
    }
  };

  const handleAddProgress = async () => {
    if (!selectedGoal || !addAmount) return;
    try {
      await api.post(`/goals/${selectedGoal.id}/add-progress?amount=${parseFloat(addAmount)}`);
      setIsAddProgressOpen(false);
      setAddAmount('');
      setSelectedGoal(null);
      fetchGoals();
    } catch (err) {}
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Metas de Vida</h1>
            <p className="text-gray-400 text-sm font-medium">Transforme seus sonhos em números e acompanhe sua evolução.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-gray-200 active:scale-95 transition-all"
          >
            <Plus size={20} />
            <span>CRIAR NOVA META</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-100 rounded-[3rem] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {goals.map((goal) => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              const remaining = goal.target_amount - goal.current_amount;

              return (
                <div 
                  key={goal.id} 
                  className="bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div 
                      className="w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform"
                      style={{ backgroundColor: goal.color }}
                    >
                      <GoalIcon name={goal.icon} size={32} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(goal)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil size={18} /></button>
                      <button onClick={() => handleDelete(goal.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <div className="mb-6 flex-1">
                    <h3 className="text-2xl font-black text-gray-900 mb-1">{goal.name}</h3>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                      <Target size={12} /> Objetivo: {formatCurrency(goal.target_amount)}
                    </p>
                  </div>

                  {/* Termômetro de Progresso */}
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-3xl font-black text-gray-900">{Math.round(progress)}%</p>
                      <p className="text-xs font-bold text-gray-400">Faltam {formatCurrency(remaining)}</p>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-1 shadow-inner">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                        style={{ width: `${progress}%`, backgroundColor: goal.color }}
                      ></div>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setSelectedGoal(goal); setIsAddProgressOpen(true); }}
                    className="w-full py-4 bg-gray-50 text-gray-900 font-black rounded-[1.5rem] hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus size={20} /> ADICIONAR VALOR
                  </button>

                  {goal.deadline && (
                    <p className="mt-4 text-center text-[10px] font-black text-gray-300 uppercase tracking-tighter flex items-center justify-center gap-1">
                      <Calendar size={12} /> Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Adicionar/Editar Meta */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editingId ? 'Editar Meta' : 'Nova Meta'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Defina seu objetivo</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl"><X size={28} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">O que você está planejando?</label>
                  <input 
                    type="text" required 
                    className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                    value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Viagem de Férias, Reserva de Emergência..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Valor Objetivo</label>
                    <input 
                      type="number" step="0.01" required 
                      className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                      value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Valor Atual</label>
                    <input 
                      type="number" step="0.01" 
                      className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                      value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Prazo (Opcional)</label>
                  <input 
                    type="date" 
                    className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                    value={deadline} onChange={e => setDeadline(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Cor e Ícone</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {colors.map(c => (
                      <button key={c.value} type="button" onClick={() => setColor(c.value)} className={`w-8 h-8 rounded-full border-4 ${color === c.value ? 'border-gray-200 scale-110 shadow-md' : 'border-transparent'}`} style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-2 p-3 bg-gray-50 rounded-2xl shadow-inner">
                    {Object.keys(GOAL_ICONS).map(iconName => (
                      <button key={iconName} type="button" onClick={() => setIcon(iconName)} className={`flex items-center justify-center p-3 rounded-xl transition-all ${icon === iconName ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        <GoalIcon name={iconName} size={20} />
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 mt-4"
                >
                  {editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR META'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Adicionar Progresso */}
        {isAddProgressOpen && selectedGoal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Poupar para Meta</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{selectedGoal.name}</p>
                </div>
                <button onClick={() => setIsAddProgressOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Quanto você poupou agora?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                    <input 
                      type="number" step="0.01" autoFocus
                      className="w-full bg-gray-50 border-none rounded-[1.2rem] pl-10 pr-4 py-4 text-gray-900 font-black text-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                      value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0.00"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddProgress}
                  className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  CONFIRMAR DEPÓSITO
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
