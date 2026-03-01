"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Save,
    Settings2,
    LayoutGrid,
    HelpCircle,
    Copy,
    CheckCircle2,
    RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

interface LabelConfigA4 {
    padrao: string;
    nome: string;
    margemSuperior: string;
    margemLateral: string;
    densidadeVertical: string;
    densidadeHorizontal: string;
    altura: string;
    largura: string;
    fonte: string;
    tamanhoFonte: string;
    limiteCaracteres: string;
    colunas: string;
    linhas: string;
    tamanhoPagina: string;
    descricaoTopo: string;
    exibirCodigoInterno: string;
    exibirCodigoBarra: string;
    exibirNumeroCodigoBarra: string;
    exibirValor: string;
    tamanhoFonteValor: string;
    posicaoCodigoBarras: string;
}

const DEFAULT_PRESETS = {
    "PIMACO-A4051": {
        padrao: "PIMACO - A4051/A4251/A4351",
        nome: "PIMACO - A4051/A4251/A4351",
        margemSuperior: "1.00",
        margemLateral: "0.40",
        densidadeVertical: "2.12",
        densidadeHorizontal: "4.07",
        altura: "2.12",
        largura: "3.82",
        fonte: "Helvetica",
        tamanhoFonte: "8pt",
        limiteCaracteres: "35",
        colunas: "5",
        linhas: "13",
        tamanhoPagina: "A4 - 21,0 X 29,7 cm",
        descricaoTopo: "",
        exibirCodigoInterno: "Não",
        exibirCodigoBarra: "Sim",
        exibirNumeroCodigoBarra: "Não",
        exibirValor: "Sim",
        tamanhoFonteValor: "Padrão",
        posicaoCodigoBarras: "Inferior"
    },
    "PIMACO-A4049": {
        padrao: "PIMACO - A4049 (6 etiquetas/folha)",
        nome: "PIMACO - A4049",
        margemSuperior: "1.27",
        margemLateral: "0.47",
        densidadeVertical: "9.31",
        densidadeHorizontal: "10.16",
        altura: "9.31",
        largura: "10.16",
        fonte: "Helvetica",
        tamanhoFonte: "12pt",
        limiteCaracteres: "60",
        colunas: "2",
        linhas: "3",
        tamanhoPagina: "A4 - 21,0 X 29,7 cm",
        descricaoTopo: "",
        exibirCodigoInterno: "Sim",
        exibirCodigoBarra: "Sim",
        exibirNumeroCodigoBarra: "Sim",
        exibirValor: "Sim",
        tamanhoFonteValor: "Padrão",
        posicaoCodigoBarras: "Inferior"
    }
};

export default function ConfigEtiquetasA4Page() {
    const { profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [config, setConfig] = useState<LabelConfigA4>(DEFAULT_PRESETS["PIMACO-A4051"]);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadConfig();
        }
    }, [profile]);

    async function loadConfig() {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('configuracoes')
                .select('*')
                .eq('chave', 'etiqueta_a4')
                .maybeSingle();

            if (data && (data as any).valor) {
                setConfig((data as any).valor as LabelConfigA4);
            }
        } catch (error) {
            console.log("Nenhuma configuração personalizada encontrada, usando padrão.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!profile?.empresa_id) return;
        setSaving(true);
        try {
            const supabase = createClient();

            // Usar rpc upsert_config se disponível ou direto no banco
            const { error: errorContent } = await (supabase.rpc as any)('upsert_config', {
                p_chave: 'etiqueta_a4',
                p_valor: config,
                p_descricao: 'Configuração de etiquetas modelo A4'
            });

            if (errorContent) throw errorContent;
            toast.success("Configurações salvas com sucesso!");
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao salvar configurações");
        } finally {
            setSaving(false);
        }
    }

    const applyPreset = (presetKey: string) => {
        if (DEFAULT_PRESETS[presetKey as keyof typeof DEFAULT_PRESETS]) {
            setConfig(DEFAULT_PRESETS[presetKey as keyof typeof DEFAULT_PRESETS]);
            toast.success(`Modelo ${presetKey} carregado!`);
        }
    };

    if (loading) return <div className="p-12 text-center">Carregando configurações...</div>;

    const InputField = ({ label, name, type = "text", required = false, help = "" }: any) => (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                {label} {required && <span className="text-rose-500">*</span>}
                {help && <span title={help}><HelpCircle size={12} className="text-slate-300 cursor-help" /></span>}
            </label>
            <input
                type={type}
                value={(config as any)[name] || ""}
                onChange={e => setConfig(prev => ({ ...prev, [name]: e.target.value }))}
                className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none font-medium text-slate-700 text-sm"
                placeholder="0.00"
            />
        </div>
    );

    const SelectField = ({ label, name, options, required = false, help = "" }: any) => (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                {label} {required && <span className="text-rose-500">*</span>}
                {help && <span title={help}><HelpCircle size={12} className="text-slate-300 cursor-help" /></span>}
            </label>
            <select
                value={(config as any)[name] || ""}
                onChange={e => setConfig(prev => ({ ...prev, [name]: e.target.value }))}
                className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none font-medium text-slate-700 text-sm appearance-none bg-no-repeat bg-[right_1rem_center]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1rem' }}
            >
                {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="space-y-6 page-enter pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Editar Etiqueta (A4)</h1>
                        <p className="text-slate-500 text-sm">Configure o layout para folhas de etiquetas A4</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadConfig}
                        className="btn-ghost h-11 px-6 flex items-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Descartar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary h-11 px-8 flex items-center gap-2 shadow-lg shadow-brand-500/20"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Salvar Alterações
                    </button>
                </div>
            </div>

            <GlassCard className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    {/* Linha 1 */}
                    <SelectField
                        label="Padrão da etiqueta"
                        name="padrao"
                        options={["PIMACO - A4051/A4251/A4351", "PIMACO - A4049 (6 etiquetas/folha)", "Personalizado"]}
                        onChange={(e: any) => applyPreset(e.target.value.includes("A4051") ? "PIMACO-A4051" : e.target.value.includes("A4049") ? "PIMACO-A4049" : "")}
                    />
                    <InputField label="Nome da etiqueta" name="nome" required />
                    <InputField label="Margem superior (cm)" name="margemSuperior" required />

                    {/* Linha 2 */}
                    <InputField label="Margem lateral (cm)" name="margemLateral" required />
                    <InputField label="Densidade vertical (cm)" name="densidadeVertical" required />
                    <InputField label="Densidade horizontal (cm)" name="densidadeHorizontal" required />

                    {/* Linha 3 */}
                    <InputField label="Altura da etiqueta (cm)" name="altura" required />
                    <InputField label="Largura da etiqueta (cm)" name="largura" required />
                    <SelectField
                        label="Fonte da etiqueta"
                        name="fonte"
                        options={["Helvetica", "Arial", "Roboto", "Courier"]}
                        required
                    />

                    {/* Linha 4 */}
                    <SelectField
                        label="Tamanho da fonte"
                        name="tamanhoFonte"
                        options={["6pt", "7pt", "8pt", "9pt", "10pt", "11pt", "12pt"]}
                        required
                    />
                    <InputField label="Limite caracteres produto" name="limiteCaracteres" />
                    <SelectField
                        label="Colunas na página"
                        name="colunas"
                        options={["1", "2", "3", "4", "5", "6", "7", "8"]}
                        required
                    />

                    {/* Linha 5 */}
                    <SelectField
                        label="Linhas na página"
                        name="linhas"
                        options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "20"]}
                        required
                    />
                    <SelectField
                        label="Tamanho da página"
                        name="tamanhoPagina"
                        options={["A4 - 21,0 X 29,7 cm", "Carta - 21,6 X 27,9 cm"]}
                    />
                    <InputField label="Descrição no topo" name="descricaoTopo" />

                    {/* Linha 6 */}
                    <SelectField
                        label="Exibir código interno"
                        name="exibirCodigoInterno"
                        options={["Sim", "Não"]}
                    />
                    <SelectField
                        label="Exibir código de barra"
                        name="exibirCodigoBarra"
                        options={["Sim", "Não"]}
                    />
                    <SelectField
                        label="Exibir número do código de barra"
                        name="exibirNumeroCodigoBarra"
                        options={["Sim", "Não"]}
                    />

                    {/* Linha 7 */}
                    <SelectField
                        label="Exibir valor do produto"
                        name="exibirValor"
                        options={["Sim", "Não"]}
                    />
                    <SelectField
                        label="Tamanho da fonte do valor"
                        name="tamanhoFonteValor"
                        options={["Padrão", "Pequeno", "Grande"]}
                    />
                    <SelectField
                        label="Posição do código de barras"
                        name="posicaoCodigoBarras"
                        options={["Superior", "Inferior", "Esconder"]}
                    />
                </div>
            </GlassCard>

            <div className="flex justify-end gap-3 mt-4 print:hidden">
                <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 flex items-center gap-3 text-brand-700">
                    <LayoutGrid size={20} className="text-brand-500" />
                    <p className="text-xs font-medium">As medidas em centímetros garantem o alinhamento perfeito na folha física.</p>
                </div>
            </div>
        </div>
    );
}
