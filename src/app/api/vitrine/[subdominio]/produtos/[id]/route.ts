import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ProdutoVitrine, ParcelaInfo, VitrineConfig } from "@/types/vitrine";
import type { PaymentGateway, CategoriaMargin } from "@/types/configuracoes";

/**
 * GET /api/vitrine/[subdominio]/produtos/[id]
 * 
 * API PÚBLICA — sem autenticação necessária.
 * Retorna detalhes de um único produto da empresa com preços calculados.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ subdominio: string; id: string }> }
) {
    try {
        const { subdominio, id } = await params;

        if (!subdominio || subdominio.length < 2 || !id) {
            return NextResponse.json(
                { error: "Parâmetros inválidos" },
                { status: 400 }
            );
        }

        // 1. Buscar empresa pelo subdomínio
        const { data: empresa, error: empresaError } = await supabaseAdmin
            .from("empresas")
            .select("id, nome, logo_url, subdominio")
            .eq("subdominio", subdominio)
            .single();

        if (empresaError || !empresa) {
            return NextResponse.json(
                { error: "Loja não encontrada" },
                { status: 404 }
            );
        }

        // 2. Buscar configuração da vitrine e financeiro
        const { data: configs } = await supabaseAdmin
            .from("configuracoes")
            .select("chave, valor")
            .eq("empresa_id", empresa.id)
            .in("chave", ["vitrine", "financeiro", "whatsapp"]);

        const vitrineConfigRaw = configs?.find(c => c.chave === "vitrine")?.valor as VitrineConfig | undefined;
        const financeiroRaw = configs?.find(c => c.chave === "financeiro")?.valor as any;
        const whatsappRaw = configs?.find(c => c.chave === "whatsapp")?.valor as any;

        const vitrineConfig: VitrineConfig = {
            enabled: vitrineConfigRaw?.enabled ?? true,
            titulo: vitrineConfigRaw?.titulo ?? "Nossos Produtos",
            mensagem_whatsapp: vitrineConfigRaw?.mensagem_whatsapp ?? "Olá! Vi um produto na vitrine e gostaria de mais informações.",
            mostrar_grade: vitrineConfigRaw?.mostrar_grade ?? true,
            max_parcelas: vitrineConfigRaw?.max_parcelas ?? 12,
            cor_tema: vitrineConfigRaw?.cor_tema ?? "#6366f1",
            produtos_destaque: vitrineConfigRaw?.produtos_destaque ?? [],
        };

        if (!vitrineConfig.enabled) {
            return NextResponse.json(
                { error: "Vitrine desativada" },
                { status: 403 }
            );
        }

        const gateways: PaymentGateway[] = financeiroRaw?.gateways ?? [];
        const defaultGateway = gateways.find(g => g.is_default && g.enabled) ?? gateways[0];

        const taxaPix = defaultGateway?.taxa_pix_pct ?? 0;
        const taxaDebito = defaultGateway?.taxa_debito_pct ?? 0;
        const taxasCredito = defaultGateway?.taxas_credito ?? [];

        // 4. Buscar produto específico
        const { data: p, error: prodError } = await supabaseAdmin
            .from("produtos")
            .select("*")
            .eq("id", id)
            .eq("empresa_id", empresa.id)
            .eq("exibir_vitrine", true)
            .gt("estoque_qtd", 0)
            .single();

        if (prodError || !p) {
            return NextResponse.json(
                { error: "Produto não encontrado ou indisponível" },
                { status: 404 }
            );
        }

        // 5. Calcular preços
        const precoBase = p.preco_venda_centavos;
        const precoPix = precoBase;
        const precoDebito = taxaDebito > 0
            ? Math.round(precoBase / (1 - taxaDebito / 100))
            : precoBase;

        const maxParcelas = Math.min(vitrineConfig.max_parcelas, taxasCredito.length);
        const parcelas: ParcelaInfo[] = [];

        for (let i = 0; i < maxParcelas; i++) {
            const taxa = taxasCredito[i]?.taxa ?? 0;
            const valorTotalParcelado = taxa > 0
                ? Math.round(precoBase / (1 - taxa / 100))
                : precoBase;
            const valorParcela = Math.round(valorTotalParcelado / (i + 1));

            parcelas.push({
                qtd: i + 1,
                valor_parcela: valorParcela,
                valor_total: valorTotalParcelado,
                taxa,
            });
        }

        const categorias: CategoriaMargin[] = financeiroRaw?.categorias ?? [];
        const catConfig = p.categoria ? categorias.find((c: CategoriaMargin) => c.nome === p.categoria) : null;

        const response: { produto: ProdutoVitrine; empresa: any; config: VitrineConfig } = {
            empresa: {
                nome: empresa.nome,
                logo_url: empresa.logo_url,
                subdominio: empresa.subdominio,
                whatsapp: whatsappRaw?.phone_number_id ?? null,
            },
            config: vitrineConfig,
            produto: {
                id: p.id,
                nome: p.nome,
                cor: p.cor,
                capacidade: p.capacidade,
                grade: p.grade,
                categoria: p.categoria ?? null,
                subcategoria: p.subcategoria ?? null,
                condicao: p.condicao ?? null,
                memoria_ram: p.memoria_ram ?? null,
                garantia_dias: catConfig?.garantia_padrao_dias ?? 0,
                em_estoque: true,
                poucas_unidades: p.estoque_qtd <= (p.estoque_minimo || 1),
                preco_pix: precoPix,
                preco_debito: precoDebito,
                parcelas,
                imagem_url: p.imagem_url ?? null,
                imagens: p.imagem_url ? [p.imagem_url] : [],
                descricao: p.descricao ?? null,
            }
        };

        return NextResponse.json(response, {
            status: 200,
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                "Access-Control-Allow-Origin": "*",
            },
        });

    } catch (error: any) {
        console.error("[Vitrine Product API] Erro inesperado:", error);
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
