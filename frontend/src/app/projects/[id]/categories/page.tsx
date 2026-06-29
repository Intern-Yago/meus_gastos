'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState, use } from 'react';
import api from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Tag, LayoutGrid, Loader2, X, Target } from 'lucide-react';
import Link from 'next/link';

interface ProjectItem {
  id: number;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
}

interface ProjectSummary {
  id: number;
  name: string;
}

export default function ProjectCategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [allocation, setAllocation] = useState('');

  const fetchProjectData = async () => {
    try {
      const res = await api.get(`/projects/${id}/summary`);
      setSummary(res.data);
      setItems(res.data.items);
    } catch (err) {
      console.error('Erro ao buscar dados do projeto');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSaving(true);
    try {
      await api.post(`/projects/${id}/items`, {
        name,
        budget_allocation: parseFloat(allocation) || 0
      });
      setName('');
      setAllocation('');
      setIsModalOpen(false);
      fetchProjectData();
    } catch (err) { alert('Erro ao adicionar categoria'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Excluir esta categoria do projeto?')) return;
    try {
      await api.delete(`/projects/items/${itemId}`);
      fetchProjectData();
    } catch (err) {}
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-gray-400 font-medium italic">Carregando categorias...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${id}`} className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all shadow-sm">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Categorias do Projeto</h1>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest flex items-center gap-2">
                <LayoutGrid size={14} /> {summary?.name || 'Projeto'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 active:scale-95 transition-all"
          >
            <Plus size={20} /> ADICIONAR CATEGORIA
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.length === 0 ? (
             <div className="col-span-full py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-center">
                <Tag size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest">Nenhuma categoria interna.</p>
                <p className="text-xs text-gray-400 mt-2">Crie divisões para o seu orçamento aqui!</p>
             </div>
          ) : items.map((item) => {
            const itemProgress = item.allocated > 0 ? Math.min((item.spent / item.allocated) * 100, 100) : 0;
            return (
              <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                <div className="flex justify-between items-start mb-6">
                  <h4 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gasto Atual</p>
                    <p className="text-sm font-black text-gray-900">{formatCurrency(item.spent)}</p>
                  </div>
                  <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${itemProgress > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                      style={{ width: `${itemProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Orçamento</p>
                    <p className="text-xs font-bold text-gray-600">{formatCurrency(item.allocated)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Nova Categoria */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>

              <div className="p-8 border-b border-gray-100">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Nova Categoria Interna</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{summary?.name}</p>
              </div>

              <form onSubmit={handleAddItem} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome da Categoria</label>
                  <input 
                    type="text" required autoFocus
                    className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                    value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Buffet, Estoque..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Teto de Gastos (Alocação)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                    <input 
                      type="number" step="0.01" required 
                      className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                      value={allocation} onChange={e => setAllocation(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'ADICIONAR AO PROJETO'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
