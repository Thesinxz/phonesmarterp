"use client";
import { useState } from "react";
import {
  Plus, Trash2, Save, FolderOpen, FolderPlus,
  ChevronRight, ChevronDown, Edit3, X, Check
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCatalogCategories, type CatalogCategory } from "@/hooks/useCatalogCategories";
import { useCatalogData } from "@/hooks/useCatalogData";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

const ITEM_TYPE_LABELS: Record<string, string> = {
  todos: 'Todos os tipos',
  celular: 'Celulares',
  peca: 'Peças',
  acessorio: 'Acessórios',
};

function CategoryRow({
  cat, depth = 0, onDelete, onEdit, onReload, onAddSub,
}: {
  cat: CatalogCategory;
  depth?: number;
  onDelete: (id: string) => void;
  onEdit: (cat: CatalogCategory) => void;
  onReload: () => void;
  onAddSub: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (cat.children?.length || 0) > 0;

  return (
    <>
      <div className={cn(
        "flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-50 group transition-all",
        depth > 0 && "ml-6 border-l border-slate-100 rounded-l-none pl-4"
      )}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn("p-0.5 text-slate-400 transition-all", !hasChildren && "invisible")}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <FolderOpen size={15} className="text-amber-500 shrink-0" />
        <span className="flex-1 text-sm font-bold text-slate-700">{cat.nome}</span>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
          {ITEM_TYPE_LABELS[cat.item_type || 'todos']}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button type="button" onClick={() => onAddSub(cat.id)}
            className="p-1.5 hover:bg-brand-50 text-slate-400 hover:text-brand-500 rounded-lg transition-all"
            title="Nova Subcategoria">
            <Plus size={13} />
          </button>
          <button type="button" onClick={() => onEdit(cat)}
            className="p-1.5 hover:bg-white text-slate-400 hover:text-brand-500 rounded-lg transition-all">
            <Edit3 size={13} />
          </button>
          <button type="button" onClick={() => onDelete(cat.id)}
            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {expanded && cat.children?.map(child => (
        <CategoryRow
          key={child.id} cat={child} depth={depth + 1}
          onDelete={onDelete} onEdit={onEdit} onReload={onReload} onAddSub={onAddSub}
        />
      ))}
    </>
  );
}

export function CategoryManager() {
  const { profile } = useAuth();
  const { tree, categories, loading, reload } = useCatalogCategories();
  const { segments } = useCatalogData();
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<CatalogCategory | null>(null);
  const [form, setForm] = useState({
    nome: '',
    parent_id: '',
    item_type: 'todos' as string,
    requires_nf: false,
    default_pricing_segment_id: '',
  });

  const resetForm = () => {
    setForm({ nome: '', parent_id: '', item_type: 'todos', requires_nf: false, default_pricing_segment_id: '' });
    setShowForm(false);
    setEditingCat(null);
  };

  const handleEdit = (cat: CatalogCategory) => {
    setEditingCat(cat);
    setForm({
      nome: cat.nome,
      parent_id: cat.parent_id || '',
      item_type: cat.item_type || 'todos',
      requires_nf: (cat as any).requires_nf || false,
      default_pricing_segment_id: cat.default_pricing_segment_id || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Informe o nome da categoria"); return; }
    if (!profile?.empresa_id) return;

    const supabase = createClient();
    const slug = form.nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const payload = {
      empresa_id: profile.empresa_id,
      nome: form.nome.trim(),
      slug: editingCat ? editingCat.slug : slug,
      parent_id: form.parent_id || null,
      item_type: form.item_type,
      requires_nf: form.requires_nf,
      default_pricing_segment_id: form.default_pricing_segment_id || null,
    };

    if (editingCat) {
      const { error } = await (supabase
        .from('catalog_categories') as any).update(payload).eq('id', editingCat.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Categoria atualizada!");
    } else {
      const { error } = await (supabase
        .from('catalog_categories') as any).insert(payload);
      if (error) {
        if (error.code === '23505') toast.error("Já existe uma categoria com este nome");
        else toast.error("Erro ao criar categoria");
        return;
      }
      toast.success("Categoria criada!");
    }

    resetForm();
    reload();
  };

  const handleDelete = async (id: string) => {
    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren) {
      toast.error("Remova as subcategorias antes de excluir esta categoria");
      return;
    }
    if (!confirm("Excluir esta categoria?")) return;
    const supabase = createClient();
    await (supabase.from('catalog_categories') as any).delete().eq('id', id);
    toast.success("Categoria removida");
    reload();
  };

  // Opções de categoria pai (excluir a própria ao editar)
  const parentOptions = categories.filter(c =>
    !c.parent_id && (!editingCat || c.id !== editingCat.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700">Categorias do Catálogo</p>
          <p className="text-xs text-slate-400">
            Organizam os produtos no estoque, vitrine e relatórios
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all"
        >
          <FolderPlus size={14} /> Nova Categoria
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <GlassCard title={editingCat ? "Editar Categoria" : "Nova Categoria"} icon={FolderOpen}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Nome *</label>
                <input
                  autoFocus
                  name="category-name"
                  autoComplete="off"
                  value={form.nome}
                  onChange={e => setForm(p => ({...p, nome: e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="input-glass w-full"
                  placeholder="Ex: iPhones, Telas Apple, Capas..."
                />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                Categoria Pai
              </label>
              <select
                value={form.parent_id}
                onChange={e => setForm(p => ({...p, parent_id: e.target.value}))}
                className="input-glass w-full"
              >
                <option value="">Categoria raiz (sem pai)</option>
                {parentOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                Tipo de produto
              </label>
              <select
                value={form.item_type}
                onChange={e => setForm(p => ({...p, item_type: e.target.value}))}
                className="input-glass w-full"
              >
                {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1.5">
               <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors bg-slate-200">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={form.requires_nf}
                      onChange={e => setForm(p => ({ ...p, requires_nf: e.target.checked }))}
                    />
                    <div className={cn(
                      "absolute inset-0 rounded-full transition-colors",
                      form.requires_nf ? "bg-indigo-500" : "bg-slate-200"
                    )} />
                    <span className={cn(
                      "absolute pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                      form.requires_nf ? "translate-x-[18px]" : "translate-x-[2px]"
                    )} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Exigir NF-e nesta categoria</span>
               </label>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                Perfil de Lucro Padrão
              </label>
              <select
                value={form.default_pricing_segment_id}
                onChange={e => setForm(p => ({...p, default_pricing_segment_id: e.target.value}))}
                className="input-glass w-full text-sm"
              >
                <option value="">Sem perfil padrão</option>
                {segments.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.margin_type === 'percent' ? `${s.default_margin}%` : `R$ ${s.default_margin/100}`})</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Ao selecionar um perfil, novos produtos desta categoria carregarão este lucro automaticamente.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all">
              <Check size={14} /> {editingCat ? 'Atualizar' : 'Criar'}
            </button>
            <button onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
              <X size={14} /> Cancelar
            </button>
          </div>
        </GlassCard>
      )}

      {/* Árvore de categorias */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 space-y-0.5">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-20" />
            Nenhuma categoria criada ainda.
            <br />Crie categorias para organizar seu catálogo.
          </div>
        ) : tree.map(cat => (
          <CategoryRow
            key={cat.id} cat={cat}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={reload}
            onAddSub={(parentId) => {
              resetForm();
              setForm(p => ({ ...p, parent_id: parentId }));
              setShowForm(true);
            }}
          />
        ))}
      </div>
    </div>
  );
}
