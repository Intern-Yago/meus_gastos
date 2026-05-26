'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, Tag, X, TrendingUp, TrendingDown, Search, ShoppingBag, Coffee, Car, Home, Phone, Briefcase, Heart, Utensils, Zap, Shield, Gift, Plane, Smartphone, Globe, Landmark, DollarSign, Wallet, PiggyBank } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  budget_amount?: number;
}

const AVAILABLE_ICONS = [
  { name: 'Tag', icon: Tag },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Coffee', icon: Coffee },
  { name: 'Car', icon: Car },
  { name: 'Home', icon: Home },
  { name: 'Phone', icon: Phone },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Heart', icon: Heart },
  { name: 'Utensils', icon: Utensils },
  { name: 'Zap', icon: Zap },
  { name: 'Shield', icon: Shield },
  { name: 'Gift', icon: Gift },
  { name: 'Plane', icon: Plane },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Globe', icon: Globe },
  { name: 'Landmark', icon: Landmark },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'Wallet', icon: Wallet },
  { name: 'PiggyBank', icon: PiggyBank },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [icon, setIcon] = useState('Tag');
  const [budgetAmount, setBudgetAmount] = useState('');

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const [catRes, budgetRes] = await Promise.all([
        api.get('/categories/'),
        api.get('/budgets/')
      ]);
      
      const catsWithBudgets = catRes.data.map((cat: any) => ({
        ...cat,
        budget_amount: budgetRes.data.find((b: any) => b.category_id === cat.id)?.amount
      }));
      
      setCategories(catsWithBudgets);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setName('');
    setType('expense');
    setIcon('Tag');
    setBudgetAmount('');
    setEditingId(null);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setIcon(cat.icon || 'Tag');
    setBudgetAmount(cat.budget_amount?.toString() || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, type, icon };
      let catId = editingId;
      
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
      } else {
        const res = await api.post('/categories/', payload);
        catId = res.data.id;
      }

      // Sincronizar Orçamento
      if (catId) {
        if (budgetAmount && parseFloat(budgetAmount) > 0) {
          await api.post('/budgets/', { category_id: catId, amount: parseFloat(budgetAmount) });
        } else if (editingId) {
          // Se for edição e o valor foi zerado, opcionalmente deletar ou deixar 0
          // Por simplicidade, vamos apenas atualizar para o novo valor (0 ou preenchido)
          // O backend create_or_update lida com isso.
        }
      }

      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar categoria');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir esta categoria? Transações vinculadas poderão ser afetadas.')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir categoria');
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Categorias</h1>
            <p className="text-gray-400 text-sm font-medium">Organize suas entradas e saídas por grupos.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            <Plus size={20} />
            <span>NOVA CATEGORIA</span>
          </button>
        </div>

        {/* Busca e Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar categoria..."
              className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-around shadow-sm">
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Saídas</p>
              <p className="text-xl font-black text-red-500">{categories.filter(c => c.type === 'expense').length}</p>
            </div>
            <div className="w-px h-8 bg-gray-100"></div>
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Entradas</p>
              <p className="text-xl font-black text-green-500">{categories.filter(c => c.type === 'income').length}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCategories.map((cat) => (
              <div 
                key={cat.id} 
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    <CategoryIcon name={cat.icon} size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{cat.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">
                        {cat.type === 'income' ? 'Entrada' : 'Saída'}
                      </p>
                      {cat.budget_amount && cat.budget_amount > 0 && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                          <p className="text-[10px] font-black uppercase text-blue-500 tracking-tighter">
                            Limite: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.budget_amount)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEdit(cat)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Categoria */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Organização de Fluxo</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-2xl"><X size={28} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Tipo de Categoria */}
                <div className="flex p-1 bg-gray-100 rounded-[1.2rem] gap-1">
                  <button 
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <TrendingDown size={14} /> GASTO
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] font-black text-xs uppercase transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <TrendingUp size={14} /> RECEITA
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome da Categoria</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Ex: Alimentação, Lazer..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Limite Mensal (Opcional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                    <input 
                      type="number" step="0.01" 
                      className="w-full bg-gray-50 border-none rounded-[1.2rem] pl-10 pr-4 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                      value={budgetAmount} 
                      onChange={e => setBudgetAmount(e.target.value)} 
                      placeholder="Sem limite"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 font-medium px-1">O Finora te avisará se você chegar perto deste valor no mês.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Escolha um Ícone</label>
                  <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-2xl shadow-inner">
                    {AVAILABLE_ICONS.map((item) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setIcon(item.name)}
                          className={`flex items-center justify-center p-3 rounded-xl transition-all ${icon === item.name ? 'bg-blue-600 text-white shadow-lg scale-110' : 'bg-white text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`}
                        >
                          <IconComp size={20} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 mt-4"
                >
                  {editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR CATEGORIA'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Componente auxiliar para renderizar ícone pelo nome
function CategoryIcon({ name, size = 20 }: { name?: string, size?: number }) {
  const item = AVAILABLE_ICONS.find(i => i.name === name) || AVAILABLE_ICONS[0];
  const IconComp = item.icon;
  return <IconComp size={size} />;
}
