'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, Target, X, Calendar, ArrowRight, TrendingUp, Wallet, CheckCircle2, LayoutGrid } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: number;
  name: string;
  total_budget: number;
  target_date?: string;
  color: string;
  icon: string;
  status: string;
}

interface ProjectSummary {
  id: number;
  name: string;
  total_budget: number;
  total_income: number;
  total_expense: number;
  remaining_budget: number;
  percentage_spent: number;
  items: any[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [summaries, setSummaries] = useState<Record<number, ProjectSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Toast and Confirmation states
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Form states
  const [name, setName] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [items, setItems] = useState<{name: string, budget_allocation: number}[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAllocation, setNewItemAllocation] = useState('');

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/projects/');
      setProjects(res.data);
      const summariesMap: Record<number, ProjectSummary> = {};
      await Promise.all(res.data.map(async (p: Project) => {
        try {
          const sRes = await api.get(`/projects/${p.id}/summary`);
          summariesMap[p.id] = sRes.data;
        } catch (e) {}
      }));
      setSummaries(summariesMap);
    } catch (err) {
      console.error('Erro ao buscar projetos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const resetForm = () => {
    setName('');
    setTotalBudget('');
    setTargetDate('');
    setColor('#3b82f6');
    setItems([]);
    setEditingId(null);
  };

  const handleOpenEdit = (project: Project) => {
    setEditingId(project.id);
    setName(project.name);
    setTotalBudget(project.total_budget.toString());
    setTargetDate(project.target_date ? project.target_date.split('T')[0] : '');
    setColor(project.color);
    setIsModalOpen(true);
  };

  const addItem = () => {
    if (!newItemName) return;
    setItems([...items, { name: newItemName, budget_allocation: parseFloat(newItemAllocation) || 0 }]);
    setNewItemName('');
    setNewItemAllocation('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        name, 
        total_budget: parseFloat(totalBudget), 
        target_date: targetDate ? new Date(targetDate).toISOString() : null,
        color,
        items
      };
      if (editingId) {
        await api.put(`/projects/${editingId}`, payload);
        showToast('success', 'Projeto atualizado com sucesso!');
      } else {
        await api.post('/projects/', payload);
        showToast('success', 'Projeto criado com sucesso!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (err) { 
      showToast('error', 'Erro ao salvar projeto'); 
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/projects/${id}`);
      showToast('success', 'Projeto excluído com sucesso!');
      fetchProjects();
    } catch (err) {
      showToast('error', 'Erro ao excluir projeto');
    } finally {
      setProjectToDelete(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight text-nowrap">Meus Projetos</h1>
            <p className="text-gray-400 text-sm font-medium">Grandes eventos e planejamentos estruturados.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={20} />
            <span>NOVO PROJETO</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-gray-100 rounded-[3rem] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => {
              const summary = summaries[project.id];
              const progress = summary ? summary.percentage_spent : 0;
              const remaining = summary ? summary.remaining_budget : project.total_budget;
              const funding = summary ? (summary.total_income / project.total_budget) * 100 : 0;

              return (
                <div 
                  key={project.id} 
                  className="bg-white rounded-[3rem] border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col"
                >
                  {projectToDelete === project.id && (
                    <div className="absolute inset-0 bg-gray-950/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                      <Trash2 size={40} className="text-red-500 mb-4 animate-bounce" />
                      <p className="text-white font-black text-lg mb-2">Excluir Projeto?</p>
                      <p className="text-gray-400 text-xs mb-6">Esta ação não poderá ser desfeita e removerá todos os marcos associados.</p>
                      <div className="flex gap-3 w-full">
                        <button 
                          onClick={() => setProjectToDelete(null)}
                          className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl text-xs hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          CANCELAR
                        </button>
                        <button 
                          onClick={() => handleDelete(project.id)}
                          className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl text-xs hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          EXCLUIR
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    <div 
                      className="w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl cursor-pointer"
                      style={{ backgroundColor: project.color }}
                      onClick={() => handleOpenEdit(project)}
                    >
                      <LayoutGrid size={32} />
                    </div>
                    <button 
                      onClick={() => setProjectToDelete(project.id)} 
                      className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mb-6 flex-1">
                    <h3 className="text-2xl font-black text-gray-900 mb-1 cursor-pointer" onClick={() => handleOpenEdit(project)}>{project.name}</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                          <Target size={12} /> Orçamento: {formatCurrency(project.total_budget)}
                        </span>
                        {project.target_date && (
                          <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-2">
                            <Calendar size={12} /> {new Date(project.target_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase text-green-600 tracking-widest flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                           <Wallet size={12} /> Arrecadado: {summary ? formatCurrency(summary.total_income) : 'R$ 0,00'}
                         </span>
                         <span className="text-[10px] font-bold text-gray-400">{funding.toFixed(1)}% reservado</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Consumo do Orçamento */}
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-3xl font-black text-gray-900">{progress.toFixed(1)}%</p>
                      <p className="text-xs font-bold text-gray-400">Restam {formatCurrency(remaining)}</p>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-1 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link 
                    href={`/projects/${project.id}`}
                    className="w-full py-4 bg-gray-900 text-white font-black rounded-[1.5rem] hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    GERENCIAR PROJETO <ArrowRight size={18} />
                  </Link>
                </div>
              );
            })}
            
            {projects.length === 0 && (
              <div className="col-span-full py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 text-center">
                <LayoutGrid size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest">Nenhum projeto ativo.</p>
                <p className="text-xs text-gray-400 mt-2">Diga "Vou casar" ou "Vou viajar" para a IA!</p>
              </div>
            )}
          </div>
        )}
        {/* Modal Novo/Editar Projeto */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-2xl transition-all z-[110] cursor-pointer"
              >
                <X size={24} />
              </button>

              <div className="p-8 border-b border-gray-100 flex-shrink-0 pr-16">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editingId ? 'Editar Projeto' : 'Novo Projeto'}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Configuração de Planejamento</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome do Projeto</label>
                  <input 
                    type="text" required 
                    className="w-full bg-gray-50 border-none rounded-[1.2rem] px-5 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                    value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Casamento, Reforma, Viagem..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Orçamento Macro</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">R$</span>
                      <input 
                        type="number" step="0.01" required 
                        className="w-full bg-gray-50 border-none rounded-[1.2rem] pl-10 pr-4 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                        value={totalBudget} onChange={e => setTotalBudget(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Data do Evento</label>
                    <input 
                      type="date" 
                      className="w-full bg-gray-50 border-none rounded-[1.2rem] px-4 py-4 text-gray-900 font-black focus:ring-2 focus:ring-blue-500 outline-none shadow-inner" 
                      value={targetDate} onChange={e => setTargetDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Plus size={14} className="text-blue-600" /> Itens do Projeto (Marcos)
                  </h3>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold"
                      placeholder="Nome do Item (ex: Buffet)"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                    />
                    <input 
                      type="number" 
                      className="w-24 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold"
                      placeholder="R$"
                      value={newItemAllocation}
                      onChange={e => setNewItemAllocation(e.target.value)}
                    />
                    <button 
                      type="button" 
                      onClick={addItem}
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl">
                        <span className="text-sm font-bold text-gray-800">{item.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-blue-600">{formatCurrency(item.budget_allocation)}</span>
                          <button type="button" onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 mt-4 cursor-pointer"
                >
                  {editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR PROJETO ESTRUTURADO'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

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
