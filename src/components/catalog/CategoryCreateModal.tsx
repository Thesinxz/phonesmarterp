"use client";
import { useState } from "react";
import { FolderPlus, X, Check, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCatalogCategories } from "@/hooks/useCatalogCategories";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (categoryId: string) => void;
  defaultItemType?: string;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  todos: 'Todos os tipos',
  celular: 'Celulares',
  peca: 'Peças',
  acessorio: 'Acessórios',
};

export function CategoryCreateModal({ open, onClose, onSuccess, defaultItemType = 'todos' }: Props) {
  const { profile } = useAuth();
  const { categories, reload } = useCatalogCategories();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    parent_id: '',
    item_type: defaultItemType,
    requires_nf: false,
    margem_padrao: 0,
    tipo_margem: 'porcentagem' as 'porcentagem' | 'valor',
  });

  if (!open) return null;

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    if (!profile?.empresa_id) return;

    setLoading(true);
    const supabase = createClient();
    
    // Gerar slug simples
    const slug = form.nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const payload = {
      empresa_id: profile.empresa_id,
      nome: form.nome.trim(),
      slug,
      parent_id: form.parent_id || null,
      item_type: form.item_type,
      requires_nf: form.requires_nf,
      margem_padrao: form.margem_padrao,
      tipo_margem: form.tipo_margem,
    };

    try {
      const { data, error } = await (supabase
        .from('catalog_categories') as any)
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') toast.error("Já existe uma categoria com este nome");
        else {
            console.error(error);
            toast.error("Erro ao criar categoria");
        }
        return;
      }

      toast.success("Categoria criada com sucesso!");
      reload(); // Atualiza o cache global do hook
      if (onSuccess && data?.id) {
        onSuccess(data.id);
      }
      onClose();
    } catch (err: any) {
      toast.error("Falha ao salvar categoria");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar apenas categorias de nível superior para serem "pai"
  const parentOptions = categories.filter(c => !c.parent_id);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center">
              <FolderPlus size={20} className="text-brand-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Nova Categoria</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Catálogo do Estoque</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-50 text-slate-400 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Nome da Categoria *</label>
            <input
              autoFocus
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="input-glass w-full text-base font-bold"
              placeholder="Ex: iPhones, Telas Apple, Capas..."
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Categoria Pai</label>
              <div className="relative">
                <FolderOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={form.parent_id}
                  onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}
                  className="input-glass pl-9 w-full appearance-none"
                  disabled={loading}
                >
                  <option value="">Raiz (sem pai)</option>
                  {parentOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Tipo de Produto</label>
              <select
                value={form.item_type}
                onChange={e => setForm(p => ({ ...p, item_type: e.target.value }))}
                className="input-glass w-full"
                disabled={loading}
              >
                {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer border border-slate-100 hover:border-brand-200 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.requires_nf}
                onChange={e => setForm(p => ({ ...p, requires_nf: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-700">Obrigar NF-e</span>
              <span className="text-[10px] text-slate-400 leading-tight">Vendas desta categoria exigirão dados fiscais</span>
            </div>
          </label>
        </div>

        <div className="p-6 bg-slate-50/50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11 rounded-2xl border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 h-11 rounded-2xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-all shadow-md shadow-brand-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Check size={18} /> Criar Categoria</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
