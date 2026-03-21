"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "sonner";

interface Tributacao {
  id: string;
  nome: string;
  regime_fiscal: string;
  ncm: string | null;
  cfop_estadual_saida: string | null;
  cfop_interestadual_saida: string | null;
  cst_csosn: string | null;
  aliquota_icms: number;
  aliquota_pis: number;
  aliquota_cofins: number;
  codigo_beneficio_fiscal: string | null;
  ativo: boolean;
}

const emptyForm = {
  nome: "",
  cfop_estadual_saida: "5102",
  cfop_interestadual_saida: "6102",
  ncm: "",
  cst_csosn: "",
  aliquota_icms: "0",
  aliquota_pis: "0",
  aliquota_cofins: "0",
  codigo_beneficio_fiscal: "",
};

export function TributacoesPanel() {
  const { profile } = useAuth();
  const [tributacoes, setTributacoes] = useState<Tributacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!profile?.empresa_id) return;
    loadTributacoes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.empresa_id]);

  async function loadTributacoes() {
    const supabase = createClient();
    const { data } = await (supabase
      .from("tributacoes")
      .select("*")
      .eq("empresa_id", profile!.empresa_id)
      .order("nome") as any);
    setTributacoes(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast.error("Informe um nome para a tributação");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("tributacoes") as any).insert({
        empresa_id: profile!.empresa_id,
        nome: form.nome.trim(),
        regime_fiscal: "simples_nacional",
        ncm: form.ncm || null,
        cfop_estadual_saida: form.cfop_estadual_saida || null,
        cfop_interestadual_saida: form.cfop_interestadual_saida || null,
        cst_csosn: form.cst_csosn || null,
        aliquota_icms: parseFloat(form.aliquota_icms) || 0,
        aliquota_pis: parseFloat(form.aliquota_pis) || 0,
        aliquota_cofins: parseFloat(form.aliquota_cofins) || 0,
        codigo_beneficio_fiscal: form.codigo_beneficio_fiscal || null,
      });
      if (error) throw error;
      toast.success("Tributação salva!");
      setShowForm(false);
      setForm(emptyForm);
      loadTributacoes();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta tributação?")) return;
    const supabase = createClient();
    await (supabase.from("tributacoes").delete().eq("id", id) as any);
    loadTributacoes();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700">Tributações Cadastradas</p>
          <p className="text-xs text-slate-400">Perfis fiscais reutilizáveis nos produtos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all"
        >
          <Plus size={14} /> Nova Tributação
        </button>
      </div>

      {showForm && (
        <GlassCard title="Nova Tributação" icon={FileText}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Nome *</label>
              <input
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="input-glass w-full"
                placeholder="Ex: Venda Aparelho Apple Nacional"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                CFOP Estadual Saída
              </label>
              <input
                value={form.cfop_estadual_saida}
                onChange={(e) => setForm((p) => ({ ...p, cfop_estadual_saida: e.target.value }))}
                className="input-glass w-full font-mono"
                placeholder="5102"
                maxLength={4}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                CFOP Interestadual Saída
              </label>
              <input
                value={form.cfop_interestadual_saida}
                onChange={(e) => setForm((p) => ({ ...p, cfop_interestadual_saida: e.target.value }))}
                className="input-glass w-full font-mono"
                placeholder="6102"
                maxLength={4}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">CST/CSOSN</label>
              <input
                value={form.cst_csosn}
                onChange={(e) => setForm((p) => ({ ...p, cst_csosn: e.target.value }))}
                className="input-glass w-full font-mono"
                placeholder="400"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">NCM Padrão</label>
              <input
                value={form.ncm}
                onChange={(e) => setForm((p) => ({ ...p, ncm: e.target.value }))}
                className="input-glass w-full font-mono"
                placeholder="85171231"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all disabled:opacity-50"
            >
              <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        </GlassCard>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
        ) : tributacoes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Nenhuma tributação cadastrada. Crie perfis para agilizar o cadastro de produtos.
          </div>
        ) : (
          tributacoes.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100"
            >
              <FileText size={16} className="text-slate-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">{t.nome}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  CFOP {t.cfop_estadual_saida}/{t.cfop_interestadual_saida}
                  {t.cst_csosn && ` · CST/CSOSN ${t.cst_csosn}`}
                  {t.ncm && ` · NCM ${t.ncm}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
