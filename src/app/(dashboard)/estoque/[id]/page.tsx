"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    Package,
    Smartphone,
    DollarSign,
    BarChart3,
    Barcode,
    FileText,
    Tag,
    Zap,
    CreditCard,
    Info,
    ImageIcon,
    RefreshCw,
    Eye,
    EyeOff,
    Battery,
    Cpu,
    Layers,
    Trash2,
    Activity,
    Clock,
    Printer
} from "lucide-react";
import { getProdutoById, updateProduto, deleteProduto } from "@/services/estoque";
import { getProdutoHistorico } from "@/services/historico_produto";
import { uploadProdutoImage } from "@/services/estoque";
import { useAuth } from "@/context/AuthContext";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { GlassCard } from "@/components/ui/GlassCard";
import { calculateSuggestedPrice } from "@/utils/product-pricing";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

export default function DetalheProdutoPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { profile } = useAuth();
    const { config, defaultGateway } = useFinanceConfig();
    const [loading, setLoading] = useState(false);
    const [precoEditadoManualmente, setPrecoEditadoManualmente] = useState(false);
    const [historico, setHistorico] = useState<any[]>([]);

    const [form, setForm] = useState({
        nome: "",
        imei: "",
        grade: "" as any,
        cor: "",
        capacidade: "", // Armazenamento
        memoriaRam: "",
        saudeBateria: "",
        condicao: "novo_lacrado",
        exibirVitrine: true,
        imagemUrl: "",
        precoCusto: "0,00",
        precoVenda: "0,00",
        estoqueQtd: "1",
        estoqueMinimo: "1",
        codigoBarras: "", // Usado como EAN/SKU
        descricao: "",
        // Fiscal
        ncm: "85171231",
        cfop: "5102",
        origem: "0",
        cest: "",
        // Categoria
        categoria: "",
        subcategoria: ""
    });

    // Carregar produto
    useEffect(() => {
        if (!params.id) return;
        async function load() {
            try {
                const data = await getProdutoById(params.id);
                if (data) {
                    setForm({
                        nome: data.nome,
                        imei: data.imei || "",
                        grade: (data as any).grade || "",
                        cor: data.cor || "",
                        capacidade: data.capacidade || "",
                        memoriaRam: (data as any).memoria_ram || "",
                        saudeBateria: (data as any).saude_bateria ? String((data as any).saude_bateria) : "",
                        condicao: (data as any).condicao || "novo_lacrado",
                        exibirVitrine: (data as any).exibir_vitrine ?? true,
                        imagemUrl: (data as any).imagem_url || "",
                        precoCusto: (data.preco_custo_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        precoVenda: (data.preco_venda_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        estoqueQtd: String(data.estoque_qtd),
                        estoqueMinimo: String(data.estoque_minimo || 1),
                        codigoBarras: data.codigo_barras || (data as any).sku || "",
                        descricao: data.descricao || "",
                        ncm: data.ncm || "85171231",
                        cfop: data.cfop || "5102",
                        origem: data.origem || "0",
                        cest: data.cest || "",
                        categoria: data.categoria || "",
                        subcategoria: data.subcategoria || ""
                    });

                    if (data.imei) {
                        const hist = await getProdutoHistorico(params.id);
                        setHistorico(hist);
                    }
                    setPrecoEditadoManualmente(true); // Evita auto-recalcular ao carregar
                }
            } catch (err) {
                console.error("Erro ao carregar produto:", err);
            }
        }
        load();
    }, [params.id]);

    // Auto-calcular preço quando custo ou categoria mudam
    useEffect(() => {
        if (precoEditadoManualmente || !config) return;
        const custoCentavos = Math.round(parseFloat(form.precoCusto.replace(',', '.')) * 100) || 0;
        if (custoCentavos <= 0) return;

        const cat = config.categorias.find(c => c.nome === form.categoria) ?? null;
        if (!cat) return;

        const sugerido = calculateSuggestedPrice(custoCentavos, cat, config.taxa_nota_fiscal_pct);
        const precoFormatado = (sugerido / 100).toFixed(2).replace('.', ',');
        setForm(prev => ({ ...prev, precoVenda: precoFormatado }));
    }, [form.precoCusto, form.categoria, config, precoEditadoManualmente]);

    const isAccessoryOrPart = (form.categoria || form.subcategoria) && (
        ['acessorio', 'acessório', 'peca', 'peça', 'pelicula', 'cabo'].some(term =>
            (form.categoria?.toLowerCase() || '').includes(term) ||
            (form.subcategoria?.toLowerCase() || '').includes(term)
        )
    );
    const showColorAndGrade = !isAccessoryOrPart;

    const isDevice = (form.categoria || form.subcategoria) && (
        ['smart', 'celular', 'tablet', 'iphone', 'ipad', 'aparelho', 'macbook', 'watch'].some(term =>
            (form.categoria?.toLowerCase() || '').includes(term) ||
            (form.subcategoria?.toLowerCase() || '').includes(term)
        )
    );

    const gerarSKU = () => {
        const randomStr = Math.floor(100000 + Math.random() * 900000).toString();
        setForm(prev => ({ ...prev, codigoBarras: `SMT-${randomStr}` }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setForm(prev => ({ ...prev, [name]: checked }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!profile) {
            toast.error("Sua sessão pode ter expirado. Tente atualizar a página.");
            return;
        }

        setLoading(true);
        try {
            // Remove points (thousands separator) and replace comma with dot for proper float parsing
            const cleanCusto = form.precoCusto.replace(/\./g, '').replace(',', '.').trim();
            const cleanVenda = form.precoVenda.replace(/\./g, '').replace(',', '.').trim();

            const custoVal = parseFloat(cleanCusto);
            const vendaVal = parseFloat(cleanVenda);

            if (isNaN(custoVal) || isNaN(vendaVal)) {
                toast.error("Preço inválido. Use o formato 0,00");
                setLoading(false);
                return;
            }

            const custoCentavos = Math.round(custoVal * 100);
            const vendaCentavos = Math.round(vendaVal * 100);

            // Validar IMEI se preenchido (deve ter 15 dígitos)
            if (form.imei && !/^\d{15}$/.test(form.imei)) {
                toast.error("O IMEI deve conter exatamente 15 números.");
                setLoading(false);
                return;
            }

            console.log("Salvando produto:", params.id, { nome: form.nome, imei: form.imei });

            await updateProduto(params.id, {
                nome: form.nome,
                imei: form.imei || null,
                grade: (form.grade as any) || null,
                cor: form.cor || null,
                capacidade: form.capacidade || null,
                preco_custo_centavos: custoCentavos,
                preco_venda_centavos: vendaCentavos,
                estoque_qtd: parseInt(form.estoqueQtd) || 0,
                estoque_minimo: parseInt(form.estoqueMinimo) || 0,
                codigo_barras: form.codigoBarras || null,
                sku: form.codigoBarras || null,
                descricao: form.descricao || null,
                condicao: form.condicao as any,
                saude_bateria: form.saudeBateria ? parseInt(form.saudeBateria) : null,
                memoria_ram: form.memoriaRam || null,
                exibir_vitrine: form.exibirVitrine,
                imagem_url: form.imagemUrl || null,
                ncm: form.ncm,
                cfop: form.cfop,
                origem: form.origem,
                cest: form.cest || null,
                categoria: form.categoria || null,
                subcategoria: form.subcategoria || null
            } as any);

            toast.success("Produto salvo com sucesso!");

            setTimeout(() => {
                router.push("/estoque");
                router.refresh();
            }, 800);
        } catch (error: any) {
            console.error("Erro ao salvar produto:", error);
            const msg = error.message || "Erro desconhecido";
            toast.error(`Falha ao salvar: ${msg}`);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Tem certeza que deseja excluir este produto permanentemente?")) return;

        setLoading(true);
        try {
            await deleteProduto(params.id);
            toast.success("Produto excluído com sucesso!");
            router.push("/estoque");
            router.refresh();
        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            toast.error("Erro ao excluir produto.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/estoque" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">Editar Produto</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Atualize as informações do item no estoque</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => window.open(`/print/etiqueta/${params.id}`, '_blank')}
                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-bold hover:bg-slate-50 transition-all"
                    >
                        <Printer size={16} />
                        Imprimir Etiqueta
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="h-10 px-4 rounded-xl border border-red-200 text-red-500 flex items-center gap-2 text-sm font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        Excluir
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* Coluna Esquerda: Cadastro + Fiscal */}
                    <div className="col-span-2 space-y-6">
                        <GlassCard title="Informações Gerais" icon={Package}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Nome do Produto *</label>
                                    <input
                                        required
                                        name="nome"
                                        value={form.nome}
                                        onChange={handleChange}
                                        className="input-glass mt-1.5"
                                        placeholder="Ex: iPhone 13 Pro Max"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        {config && config.categorias.length > 0 ? (
                                            <>
                                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                                    <Tag size={14} className="text-brand-500" />
                                                    Categoria Geral
                                                </label>
                                                <select
                                                    name="categoria"
                                                    value={form.categoria}
                                                    onChange={handleChange}
                                                    className="input-glass mt-1.5 appearance-none"
                                                >
                                                    <option value="">Sem categoria</option>
                                                    {config.categorias.map(cat => (
                                                        <option key={cat.nome} value={cat.nome}>
                                                            {cat.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </>
                                        ) : (
                                            <>
                                                <label className="text-sm font-semibold text-slate-700">Categoria Geral</label>
                                                <select className="input-glass mt-1.5 appearance-none" disabled>
                                                    <option>Carregando...</option>
                                                </select>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700">Subcategoria (Linha/Tipo)</label>
                                        <input
                                            name="subcategoria"
                                            value={form.subcategoria}
                                            onChange={handleChange}
                                            className="input-glass mt-1.5"
                                            placeholder="Ex: iPhone, Galaxy, Capa, Cabo"
                                            list="subcategorias-list"
                                        />
                                        <datalist id="subcategorias-list">
                                            <option value="iPhone" />
                                            <option value="Samsung Galaxy" />
                                            <option value="Motorola" />
                                            <option value="Xiaomi" />
                                            <option value="Capa de Silicone" />
                                            <option value="Película" />
                                            <option value="Cabo USB" />
                                            <option value="Carregador" />
                                            <option value="Fone de Ouvido" />
                                        </datalist>
                                    </div>
                                </div>
                                {form.categoria && config && (() => {
                                    const cat = config.categorias.find(c => c.nome === form.categoria);
                                    return cat ? (
                                        <div className="flex items-center gap-3 mt-1 text-[10px]">
                                            <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-lg font-bold">
                                                Margem Padrão: {cat.tipo_margem === 'porcentagem' ? `${cat.margem_padrao}%` : `R$ ${cat.margem_padrao}`}
                                            </span>
                                            {cat.nf_obrigatoria && (
                                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg font-bold">NF Obrigatória</span>
                                            )}
                                        </div>
                                    ) : null;
                                })()}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700">Condição / Estado</label>
                                        <select
                                            name="condicao"
                                            value={form.condicao}
                                            onChange={handleChange}
                                            className="input-glass mt-1.5 appearance-none"
                                        >
                                            <option value="novo_lacrado">Novo (Lacrado)</option>
                                            <option value="seminovo">Seminovo (Vitrine)</option>
                                            <option value="usado">Usado (Com marcas)</option>
                                            <option value="peca_reposicao">Peça de Reposição / Insumo</option>
                                            <option value="defeito">Com Defeito / Sucata</option>
                                            <option value="outro">Outro</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer mt-6 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 flex-1">
                                            <div className={cn(
                                                "w-12 h-6 rounded-full transition-colors relative flex items-center",
                                                form.exibirVitrine ? "bg-indigo-500" : "bg-slate-300"
                                            )}>
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full bg-white absolute transition-all shadow-sm",
                                                    form.exibirVitrine ? "left-7" : "left-1.5"
                                                )} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-700 flex items-center gap-1.5">
                                                    {form.exibirVitrine ? <Eye size={16} className="text-indigo-500" /> : <EyeOff size={16} className="text-slate-400" />}
                                                    Exibir na Vitrine
                                                </p>
                                                <p className="text-[10px] text-slate-400">Mostrar este item na loja online</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Descrição Comercial</label>
                                    <textarea
                                        name="descricao"
                                        value={form.descricao}
                                        onChange={handleChange}
                                        className="input-glass mt-1.5 min-h-[100px] pt-3 resize-none"
                                        placeholder="Descreva o produto para a vitrine e vendedores..."
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 font-mono">Cód. Barras / SKU Interno</label>
                                    <div className="flex gap-2 mt-1.5">
                                        <div className="relative flex-1">
                                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                name="codigoBarras"
                                                value={form.codigoBarras}
                                                onChange={handleChange}
                                                className="input-glass pl-10"
                                                placeholder="789... ou clique em Gerar SKU"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={gerarSKU}
                                            className="px-4 bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl transition-colors border border-slate-200 hover:border-indigo-200 flex items-center gap-2"
                                        >
                                            <RefreshCw size={14} />
                                            Gerar SKU
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard title="Dados Fiscais (NFC-e / SPED)" icon={FileText}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-sm">NCM *</label>
                                    <input
                                        required
                                        name="ncm"
                                        value={form.ncm}
                                        onChange={handleChange}
                                        className="input-glass mt-1 font-mono"
                                        placeholder="8517.12.31"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Nomenclatura Comum do Mercosul</p>
                                </div>
                                <div>
                                    <label className="label-sm">CFOP *</label>
                                    <input
                                        required
                                        name="cfop"
                                        value={form.cfop}
                                        onChange={handleChange}
                                        className="input-glass mt-1 font-mono"
                                        placeholder="5102"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Cód. Fiscal de Operações</p>
                                </div>
                                <div>
                                    <label className="label-sm">Origem da Mercadoria</label>
                                    <select
                                        name="origem"
                                        value={form.origem}
                                        onChange={handleChange}
                                        className="input-glass mt-1 appearance-none"
                                    >
                                        <option value="0">0 - Nacional</option>
                                        <option value="1">1 - Estrangeira (Imp. Direta)</option>
                                        <option value="2">2 - Estrangeira (Adq. no Me. Interno)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-sm">CEST (Opcional)</label>
                                    <input
                                        name="cest"
                                        value={form.cest}
                                        onChange={handleChange}
                                        className="input-glass mt-1 font-mono"
                                        placeholder="Código CEST"
                                    />
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard title="Financeiro" icon={DollarSign}>
                            {/* Categoria movida para Informações Gerais */}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-sm">Preço de Custo (R$)</label>
                                    <input
                                        name="precoCusto"
                                        value={form.precoCusto}
                                        onChange={handleChange}
                                        className="input-glass mt-1.5 font-bold text-slate-700"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className={cn(
                                        "label-sm flex items-center gap-1.5",
                                        precoEditadoManualmente ? "text-amber-600" : "text-brand-600"
                                    )}>
                                        Preço de Venda (R$)
                                        {!precoEditadoManualmente && form.categoria && (
                                            <span className="text-[9px] bg-brand-50 text-brand-500 px-1.5 py-0.5 rounded font-bold">AUTO</span>
                                        )}
                                    </label>
                                    <input
                                        name="precoVenda"
                                        value={form.precoVenda}
                                        onChange={(e) => {
                                            handleChange(e);
                                            setPrecoEditadoManualmente(true);
                                        }}
                                        className={cn(
                                            "input-glass mt-1.5 font-bold",
                                            precoEditadoManualmente ? "text-amber-600 bg-amber-50/20" : "text-brand-600 bg-brand-50/20"
                                        )}
                                        placeholder="0,00"
                                    />
                                    {precoEditadoManualmente && form.categoria && (
                                        <button
                                            type="button"
                                            onClick={() => setPrecoEditadoManualmente(false)}
                                            className="text-[10px] text-brand-500 hover:underline mt-1"
                                        >
                                            ↩ Recalcular pela categoria
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Preview de preços por forma de pagamento */}
                            {defaultGateway && parseFloat(form.precoVenda.replace(',', '.')) > 0 && (
                                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <Info size={10} /> Preços por Forma de Pagamento
                                    </p>
                                    {(() => {
                                        const vendaCentavos = Math.round(parseFloat(form.precoVenda.replace(',', '.')) * 100);
                                        const fmt = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                        const pix = vendaCentavos; // base
                                        const debito = defaultGateway.taxa_debito_pct > 0
                                            ? Math.round(vendaCentavos / (1 - defaultGateway.taxa_debito_pct / 100))
                                            : vendaCentavos;
                                        const t12 = defaultGateway.taxas_credito?.[11];
                                        const credito12 = t12 && t12.taxa > 0
                                            ? Math.round(vendaCentavos / (1 - t12.taxa / 100))
                                            : vendaCentavos;
                                        return (
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                                    <Zap size={12} /> Pix: {fmt(pix)}
                                                </span>
                                                <span className="text-slate-300">|</span>
                                                <span className="flex items-center gap-1 text-blue-600 font-bold">
                                                    <CreditCard size={12} /> Débito: {fmt(debito)}
                                                </span>
                                                {t12 && (
                                                    <>
                                                        <span className="text-slate-300">|</span>
                                                        <span className="text-indigo-600 font-bold">
                                                            12x: {fmt(Math.round(credito12 / 12))}/mês
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </GlassCard>
                    </div>

                    {/* Coluna Direita: Específicos + Estoque */}
                    <div className="space-y-6">
                        <GlassCard title={isDevice ? "Especificações do Aparelho" : "Especificações Técnicas"} icon={Layers}>
                            <div className="space-y-4">
                                {/* Cor e Grade */}
                                {showColorAndGrade && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label-sm">Cor</label>
                                            <input
                                                name="cor"
                                                value={form.cor}
                                                onChange={handleChange}
                                                className="input-glass mt-1"
                                                placeholder="Ex: Space Gray"
                                            />
                                        </div>
                                        <div>
                                            <label className="label-sm">Grade</label>
                                            <select
                                                name="grade"
                                                value={form.grade}
                                                onChange={handleChange}
                                                className="input-glass mt-1 appearance-none"
                                            >
                                                <option value="">Nenhuma / Novo</option>
                                                <option value="A">Grade A (Excelente)</option>
                                                <option value="B">Grade B (Bom)</option>
                                                <option value="C">Grade C (Marcas de uso)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Apenas para Aparelhos (Smartphones, Tablets) */}
                                {isDevice && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="label-sm">Armazenamento</label>
                                                <input
                                                    name="capacidade"
                                                    value={form.capacidade}
                                                    onChange={handleChange}
                                                    className="input-glass mt-1"
                                                    placeholder="Ex: 128GB"
                                                />
                                            </div>
                                            <div>
                                                <label className="label-sm flex items-center gap-1.5"><Cpu size={12} className="text-slate-400" /> Memória RAM</label>
                                                <input
                                                    name="memoriaRam"
                                                    value={form.memoriaRam}
                                                    onChange={handleChange}
                                                    className="input-glass mt-1"
                                                    placeholder="Ex: 4GB"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="label-sm flex items-center gap-1.5"><Battery size={12} className="text-slate-400" /> Saúde Bateria (%)</label>
                                                <div className="relative mt-1">
                                                    <input
                                                        type="number"
                                                        name="saudeBateria"
                                                        value={form.saudeBateria}
                                                        onChange={handleChange}
                                                        className="input-glass pr-8"
                                                        placeholder="80 a 100"
                                                        min="0"
                                                        max="100"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label-sm">IMEI (Opcional)</label>
                                                <input
                                                    name="imei"
                                                    value={form.imei}
                                                    onChange={handleChange}
                                                    className="input-glass mt-1 font-mono text-xs"
                                                    placeholder="15 dígitos"
                                                    maxLength={15}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        <GlassCard title="Mídia (Foto do Produto)" icon={ImageIcon}>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file && profile) {
                                            try {
                                                setLoading(true);
                                                const url = await uploadProdutoImage(file, profile.empresa_id);
                                                setForm(prev => ({ ...prev, imagemUrl: url }));
                                            } catch (error) {
                                                console.error(error);
                                                alert("Erro ao enviar imagem");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }}
                                />
                                {form.imagemUrl ? (
                                    <div className="w-full h-32 rounded-lg overflow-hidden relative mb-2">
                                        <img src={form.imagemUrl} alt="Preview" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
                                            <ImageIcon className="text-slate-400" size={24} />
                                        </div>
                                        <p className="font-bold text-sm text-slate-700">Adicionar Foto Principal</p>
                                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Arraste uma imagem ou clique para fazer upload.</p>
                                    </>
                                )}

                                <input
                                    name="imagemUrl"
                                    value={form.imagemUrl}
                                    onChange={(e) => setForm(prev => ({ ...prev, imagemUrl: e.target.value }))}
                                    type="text"
                                    placeholder="Ou cole a URL da imagem aqui"
                                    className="input-glass mt-4 text-[10px] h-8 text-center relative z-20 hover:border-brand-300 focus:border-brand-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </GlassCard>

                        <GlassCard title="Gestão de Estoque" icon={BarChart3}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700">Qtd em Estoque</label>
                                    <input
                                        required
                                        type="number"
                                        name="estoqueQtd"
                                        value={form.estoqueQtd}
                                        onChange={handleChange}
                                        className="input-glass mt-1.5 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-amber-600">Alerta de Estoque Baixo</label>
                                    <input
                                        required
                                        type="number"
                                        name="estoqueMinimo"
                                        value={form.estoqueMinimo}
                                        onChange={handleChange}
                                        className="input-glass mt-1.5 border-amber-100"
                                    />
                                </div>
                            </div>
                        </GlassCard>

                        <div className="pt-4">
                            <button
                                disabled={loading}
                                className="btn-primary w-full h-12 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save size={18} />
                                )}
                                Salvar Produto
                            </button>
                            <Link href="/estoque" className="btn-secondary w-full h-12 mt-3 flex items-center justify-center">CANCELAR</Link>
                        </div>
                    </div>
                </div>
            </form>

            {/* Timeline do Aparelho */}
            {isDevice && form.imei && historico.length > 0 && (
                <div className="mt-12 mb-8 glass-card">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Activity className="text-indigo-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Timeline de Vida do Aparelho</h2>
                            <p className="text-sm text-slate-500">Histórico completo de eventos atrelados ao IMEI {form.imei}</p>
                        </div>
                    </div>

                    <div className="relative border-l-2 border-indigo-100 ml-5 space-y-8 pb-4 mt-8">
                        {historico.map((evento, idx) => (
                            <div key={evento.id} className="relative pl-8 animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-white border-4 border-indigo-500 shadow-[0_0_0_4px_white] shadow-indigo-100" />

                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 hover:border-indigo-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                                {evento.tipo_evento.replace('_', ' ')}
                                            </span>
                                            {evento.usuario_nome && (
                                                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                    👤 {evento.usuario_nome}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(evento.created_at).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <p className="text-slate-700 font-medium">
                                        {evento.descricao}
                                    </p>
                                    {evento.referencia_id && (
                                        <div className="mt-3 text-xs bg-white inline-block px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-500">
                                            Ref: {evento.referencia_id.substring(0, 8)}...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
