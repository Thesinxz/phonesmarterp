"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPecasPorModelo, TIPOS_PECA, QUALIDADES, type PecaCatalogo } from "@/services/pecas";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    MessageCircle, Search, Plus, Trash2, Wrench, X,
    Smartphone, Send, Copy, Check, Package, DollarSign,
    Clock, Shield, RotateCcw
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

interface LinhaOrcamento {
    id: string;
    nome: string;
    preco: number; // centavos
    qtd: number;
    tipo: "peca" | "servico";
}

export default function OrcamentoRapidoPage() {
    const { profile } = useAuth();
    const [nomeLoja, setNomeLoja] = useState("Minha Loja");
    const [telefoneLoja, setTelefoneLoja] = useState("");

    // Campos do orçamento
    const [nomeCliente, setNomeCliente] = useState("");
    const [telefoneCliente, setTelefoneCliente] = useState("");
    const [modeloAparelho, setModeloAparelho] = useState("");
    const [linhas, setLinhas] = useState<LinhaOrcamento[]>([]);
    const [garantiaDias, setGarantiaDias] = useState("90");
    const [prazoEstimado, setPrazoEstimado] = useState("1-2 horas");
    const [validadeDias, setValidadeDias] = useState("7");
    const [observacao, setObservacao] = useState("");

    // Busca de peças
    const [pecasSugeridas, setPecasSugeridas] = useState<PecaCatalogo[]>([]);
    const [loadingSugeridas, setLoadingSugeridas] = useState(false);
    const [searchPeca, setSearchPeca] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Mão de obra manual
    const [maoObraDesc, setMaoObraDesc] = useState("");
    const [maoObraValor, setMaoObraValor] = useState("");

    // Carregar config da empresa
    useEffect(() => {
        if (!profile?.empresa_id) return;
        const supabase = createClient();
        (supabase.from("empresas") as any)
            .select("nome, config_json")
            .eq("id", profile.empresa_id)
            .single()
            .then(({ data }: any) => {
                if (data) {
                    const cfg = data.config_json as any;
                    setNomeLoja(cfg?.nome_fantasia || cfg?.razao_social || data.nome || "Minha Loja");
                    setTelefoneLoja(cfg?.telefone || cfg?.celular || "");
                }
            });
    }, [profile?.empresa_id]);

    // Buscar peças sugeridas quando modelo muda
    useEffect(() => {
        if (!modeloAparelho || modeloAparelho.length < 3 || !profile?.empresa_id) {
            setPecasSugeridas([]);
            return;
        }
        const t = setTimeout(async () => {
            setLoadingSugeridas(true);
            try {
                const pecas = await getPecasPorModelo(profile!.empresa_id, modeloAparelho);
                setPecasSugeridas(pecas);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoadingSugeridas(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [modeloAparelho, profile?.empresa_id]);

    // Busca livre
    const handleSearch = async (val: string) => {
        setSearchPeca(val);
        if (val.length < 2 || !profile?.empresa_id) { setSearchResults([]); return; }
        setSearchLoading(true);
        const supabase = createClient();
        const { data } = await supabase
            .from("pecas_catalogo")
            .select("*")
            .eq("empresa_id", profile.empresa_id)
            .ilike("nome", `%${val}%`)
            .limit(8);
        setSearchResults(data || []);
        setSearchLoading(false);
    };

    const addPeca = (peca: PecaCatalogo) => {
        const exists = linhas.find(l => l.id === peca.id);
        if (exists) {
            setLinhas(linhas.map(l => l.id === peca.id ? { ...l, qtd: l.qtd + 1 } : l));
            toast.info("Quantidade aumentada!");
        } else {
            setLinhas([...linhas, {
                id: peca.id,
                nome: peca.nome,
                preco: peca.preco_venda_centavos,
                qtd: 1,
                tipo: "peca"
            }]);
            toast.success(`${peca.nome} adicionado!`);
        }
    };

    const addMaoObra = () => {
        if (!maoObraDesc || !maoObraValor) return toast.error("Preencha descrição e valor");
        const val = Math.round(parseFloat(maoObraValor.replace(",", ".")) * 100);
        if (isNaN(val) || val <= 0) return toast.error("Valor inválido");
        setLinhas([...linhas, {
            id: `servico-${Date.now()}`,
            nome: maoObraDesc,
            preco: val,
            qtd: 1,
            tipo: "servico"
        }]);
        setMaoObraDesc("");
        setMaoObraValor("");
        toast.success("Serviço adicionado!");
    };

    const removeLinha = (id: string) => setLinhas(linhas.filter(l => l.id !== id));

    const totalCentavos = linhas.reduce((a, l) => a + (l.preco * l.qtd), 0);

    // Gerar mensagem formatada
    const gerarMensagem = () => {
        const pecas = linhas.filter(l => l.tipo === "peca");
        const servicos = linhas.filter(l => l.tipo === "servico");

        let msg = `📋 *ORÇAMENTO — ${nomeLoja.toUpperCase()}*\n\n`;

        if (nomeCliente) msg += `👤 Cliente: ${nomeCliente}\n`;
        if (modeloAparelho) msg += `📱 Aparelho: ${modeloAparelho}\n`;
        msg += `📅 Data: ${new Date().toLocaleDateString("pt-BR")}\n\n`;

        msg += `🔧 *Peças e Serviços:*\n`;
        for (const l of [...pecas, ...servicos]) {
            const emoji = l.tipo === "peca" ? "•" : "🛠️";
            const subtotal = l.preco * l.qtd;
            if (l.qtd > 1) {
                msg += `${emoji} ${l.nome} (${l.qtd}x) — ${formatCurrency(subtotal)}\n`;
            } else {
                msg += `${emoji} ${l.nome} — ${formatCurrency(subtotal)}\n`;
            }
        }

        msg += `\n💰 *TOTAL: ${formatCurrency(totalCentavos)}*\n\n`;

        if (prazoEstimado) msg += `⏰ Prazo estimado: ${prazoEstimado}\n`;
        if (garantiaDias && garantiaDias !== "0") msg += `✅ Garantia: ${garantiaDias} dias\n`;
        if (observacao) msg += `\n📝 ${observacao}\n`;
        msg += `\n_Orçamento válido por ${validadeDias} dias._`;

        return msg;
    };

    const enviarWhatsApp = () => {
        if (linhas.length === 0) return toast.error("Adicione pelo menos uma peça ou serviço");
        const msg = gerarMensagem();
        const tel = telefoneCliente.replace(/\D/g, "");
        const url = tel
            ? `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
    };

    const copiarTexto = () => {
        if (linhas.length === 0) return toast.error("Adicione pelo menos uma peça ou serviço");
        navigator.clipboard.writeText(gerarMensagem());
        setCopied(true);
        toast.success("Copiado para a área de transferência!");
        setTimeout(() => setCopied(false), 2000);
    };

    const limpar = () => {
        setNomeCliente(""); setTelefoneCliente(""); setModeloAparelho("");
        setLinhas([]); setObservacao(""); setPecasSugeridas([]);
        toast.info("Orçamento limpo!");
    };

    // Agrupar sugeridas por tipo
    const sugeridasPorTipo = pecasSugeridas.reduce((acc, p) => {
        const t = p.tipo_peca;
        if (!acc[t]) acc[t] = [];
        acc[t].push(p);
        return acc;
    }, {} as Record<string, PecaCatalogo[]>);

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <MessageCircle className="text-emerald-500" /> Orçamento Rápido
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Monte e envie via WhatsApp em segundos</p>
                </div>
                <button onClick={limpar} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                    <RotateCcw size={14} /> Limpar
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Coluna Esquerda - Montagem */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Info do Cliente */}
                    <GlassCard className="p-5 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Smartphone size={14} /> Dados do Orçamento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)}
                                placeholder="Nome do cliente (opcional)"
                                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            <input value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)}
                                placeholder="WhatsApp (DDD + número)"
                                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            <input value={modeloAparelho} onChange={e => setModeloAparelho(e.target.value)}
                                placeholder="Modelo do aparelho (ex: iPhone 15)"
                                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold" />
                        </div>
                    </GlassCard>

                    {/* Peças Sugeridas */}
                    {modeloAparelho.length >= 3 && (
                        <GlassCard className="p-5 space-y-3 border-l-4 border-l-emerald-400">
                            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                <Wrench size={14} /> Peças compatíveis com {modeloAparelho}
                                {loadingSugeridas && <span className="animate-pulse text-xs text-slate-400 normal-case font-normal">buscando...</span>}
                            </h3>

                            {pecasSugeridas.length === 0 && !loadingSugeridas && (
                                <p className="text-sm text-slate-400 py-2">Nenhuma peça cadastrada para esse modelo. Use a busca abaixo ou cadastre no catálogo de peças.</p>
                            )}

                            {Object.entries(sugeridasPorTipo).map(([tipo, pecas]) => {
                                const tipoInfo = TIPOS_PECA.find(t => t.value === tipo);
                                return (
                                    <div key={tipo} className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {tipoInfo?.emoji} {tipoInfo?.label || tipo}
                                        </p>
                                        {pecas.map(peca => {
                                            const jaNaLista = linhas.some(l => l.id === peca.id);
                                            return (
                                                <button key={peca.id} type="button" onClick={() => addPeca(peca)}
                                                    disabled={jaNaLista}
                                                    className={cn(
                                                        "w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-left transition-all text-sm",
                                                        jaNaLista
                                                            ? "bg-emerald-50 border border-emerald-200 opacity-60 cursor-default"
                                                            : "bg-white border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/50"
                                                    )}>
                                                    <div>
                                                        <span className="font-bold text-slate-800">{peca.nome}</span>
                                                        <div className="flex gap-2 mt-0.5">
                                                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                                                                peca.qualidade === "original" ? "bg-emerald-100 text-emerald-700" :
                                                                    peca.qualidade === "oem" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                                                            )}>{peca.qualidade}</span>
                                                            <span className={cn("text-[9px] font-bold",
                                                                peca.estoque_qtd > 0 ? "text-emerald-600" : "text-red-500"
                                                            )}>{peca.estoque_qtd > 0 ? `${peca.estoque_qtd} em estoque` : "Sem estoque"}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-emerald-600">{formatCurrency(peca.preco_venda_centavos)}</span>
                                                        {jaNaLista ? <Check size={16} className="text-emerald-500" /> : <Plus size={16} className="text-slate-400" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </GlassCard>
                    )}

                    {/* Busca livre */}
                    <GlassCard className="p-5 space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Search size={14} /> Buscar peça no catálogo
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input value={searchPeca} onChange={e => handleSearch(e.target.value)}
                                placeholder="Digitar nome da peça..."
                                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            {searchPeca && (
                                <button onClick={() => { setSearchPeca(""); setSearchResults([]); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {searchResults.length > 0 && (
                            <div className="space-y-1">
                                {searchResults.map((p: PecaCatalogo) => (
                                    <button key={p.id} type="button" onClick={() => { addPeca(p); setSearchPeca(""); setSearchResults([]); }}
                                        className="w-full flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-100 hover:border-emerald-300 text-left text-sm transition-all">
                                        <span className="font-bold text-slate-800">{p.nome}</span>
                                        <span className="font-black text-emerald-600">{formatCurrency(p.preco_venda_centavos)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </GlassCard>

                    {/* Mão de obra */}
                    <GlassCard className="p-5 space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <DollarSign size={14} /> Mão de Obra / Serviço
                        </h3>
                        <div className="flex gap-2">
                            <input value={maoObraDesc} onChange={e => setMaoObraDesc(e.target.value)}
                                placeholder="Ex: Troca de tela"
                                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                <input value={maoObraValor} onChange={e => setMaoObraValor(e.target.value)}
                                    placeholder="0,00" inputMode="decimal"
                                    className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    onKeyDown={e => { if (e.key === "Enter") addMaoObra(); }} />
                            </div>
                            <button onClick={addMaoObra}
                                className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md self-center">
                                <Plus size={18} />
                            </button>
                        </div>
                    </GlassCard>

                    {/* Config extras */}
                    <GlassCard className="p-5 space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configurações</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    <Clock size={10} className="inline mr-1" /> Prazo
                                </label>
                                <select value={prazoEstimado} onChange={e => setPrazoEstimado(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                    <option value="30 minutos">30 minutos</option>
                                    <option value="1 hora">1 hora</option>
                                    <option value="1-2 horas">1-2 horas</option>
                                    <option value="2-3 horas">2-3 horas</option>
                                    <option value="Mesmo dia">Mesmo dia</option>
                                    <option value="1 dia útil">1 dia útil</option>
                                    <option value="2-3 dias úteis">2-3 dias úteis</option>
                                    <option value="A combinar">A combinar</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    <Shield size={10} className="inline mr-1" /> Garantia
                                </label>
                                <select value={garantiaDias} onChange={e => setGarantiaDias(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                    <option value="0">Sem garantia</option>
                                    <option value="30">30 dias</option>
                                    <option value="60">60 dias</option>
                                    <option value="90">90 dias</option>
                                    <option value="180">180 dias</option>
                                    <option value="365">1 ano</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Validade</label>
                                <select value={validadeDias} onChange={e => setValidadeDias(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                                    <option value="3">3 dias</option>
                                    <option value="7">7 dias</option>
                                    <option value="15">15 dias</option>
                                    <option value="30">30 dias</option>
                                </select>
                            </div>
                        </div>
                        <input value={observacao} onChange={e => setObservacao(e.target.value)}
                            placeholder="Observação (opcional)..."
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </GlassCard>
                </div>

                {/* Coluna Direita - Preview */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="lg:sticky lg:top-24 space-y-4">
                        {/* Itens do orçamento */}
                        <GlassCard className="p-5 space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Package size={14} /> Itens do Orçamento ({linhas.length})
                            </h3>

                            {linhas.length === 0 ? (
                                <div className="text-center py-8 text-slate-300">
                                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-medium">Nenhum item adicionado</p>
                                    <p className="text-xs text-slate-300">Selecione peças ou adicione serviços</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {linhas.map(l => (
                                        <div key={l.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 group">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="text-xs">{l.tipo === "peca" ? "🔧" : "🛠️"}</span>
                                                <span className="text-sm font-bold text-slate-700 truncate">{l.nome}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <input type="number" min="1" value={l.qtd}
                                                    onChange={e => setLinhas(linhas.map(li => li.id === l.id ? { ...li, qtd: parseInt(e.target.value) || 1 } : li))}
                                                    className="w-12 text-center text-xs font-bold bg-white rounded-lg border border-slate-200 py-1 focus:outline-none" />
                                                <span className="text-sm font-black text-slate-700 w-20 text-right">
                                                    {formatCurrency(l.preco * l.qtd)}
                                                </span>
                                                <button onClick={() => removeLinha(l.id)}
                                                    className="p-1 text-slate-300 hover:text-red-500 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Total */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
                                <span className="text-2xl font-black text-slate-800">{formatCurrency(totalCentavos)}</span>
                            </div>
                        </GlassCard>

                        {/* Preview da mensagem */}
                        {linhas.length > 0 && (
                            <GlassCard className="p-5 space-y-3 bg-slate-900 border-slate-800">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview da mensagem</h3>
                                <pre className="text-xs text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-800/50 rounded-xl p-4 max-h-64 overflow-y-auto">
                                    {gerarMensagem()}
                                </pre>
                            </GlassCard>
                        )}

                        {/* Botões de ação */}
                        <div className="space-y-2">
                            <button onClick={enviarWhatsApp}
                                disabled={linhas.length === 0}
                                className="w-full flex items-center justify-center gap-3 bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] text-base">
                                <Send size={20} />
                                Enviar pelo WhatsApp
                            </button>
                            <button onClick={copiarTexto}
                                disabled={linhas.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-white text-slate-600 px-6 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm">
                                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                {copied ? "Copiado!" : "Copiar texto"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
