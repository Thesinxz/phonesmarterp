import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProdutoVitrine, ParcelaInfo, VitrineConfig, VitrineResponse } from "@/types/vitrine";
import type { PaymentGateway, CategoriaMargin } from "@/types/configuracoes";

/**
 * GET /api/vitrine/[subdominio]/produtos
 * 
 * API PÚBLICA — sem autenticação necessária.
 * Retorna produtos da empresa com preços calculados (Pix, Débito, Parcelas).
 * NUNCA expõe: preco_custo, IMEI, fornecedor_id, quantidades exatas.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { subdominio: string } }
) {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const { subdominio } = params;

        if (!subdominio || subdominio.length < 2) {
            return NextResponse.json(
                { error: "Subdomínio inválido" },
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

        // Config padrão da vitrine
        const vitrineConfig: VitrineConfig = {
            enabled: vitrineConfigRaw?.enabled ?? true,
            titulo: vitrineConfigRaw?.titulo ?? "Nossos Produtos",
            mensagem_whatsapp: vitrineConfigRaw?.mensagem_whatsapp ?? "Olá! Vi um produto na vitrine e gostaria de mais informações.",
            mostrar_grade: vitrineConfigRaw?.mostrar_grade ?? true,
            max_parcelas: vitrineConfigRaw?.max_parcelas ?? 12,
            cor_tema: vitrineConfigRaw?.cor_tema ?? "#6366f1",
            produtos_destaque: vitrineConfigRaw?.produtos_destaque ?? [],
        };

        // Verificar se a vitrine está habilitada
        if (!vitrineConfig.enabled) {
            return NextResponse.json(
                { error: "Vitrine desativada" },
                { status: 403 }
            );
        }

        // 3. Buscar gateway padrão para cálculo de preços
        const gateways: PaymentGateway[] = financeiroRaw?.gateways ?? [];
        const defaultGateway = gateways.find(g => g.is_default && g.enabled) ?? gateways[0];

        const taxaPix = defaultGateway?.taxa_pix_pct ?? 0;
        const taxaDebito = defaultGateway?.taxa_debito_pct ?? 0;
        const taxasCredito = defaultGateway?.taxas_credito ?? [];

        // 4. Buscar produtos com estoque > 0 e que devem ser exibidos
        const { data: produtosRaw, error: prodError } = await supabaseAdmin
            .from("produtos")
            .select("id, nome, cor, capacidade, grade, categoria, preco_venda_centavos, estoque_qtd, estoque_minimo, imagem_url, condicao, memoria_ram")
            .eq("empresa_id", empresa.id)
            .eq("exibir_vitrine", true)
            .gt("estoque_qtd", 0)
            .order("nome", { ascending: true });

        if (prodError) {
            console.error("[Vitrine API] Erro ao buscar produtos:", prodError);
            return NextResponse.json(
                { error: "Erro ao carregar produtos" },
                { status: 500 }
            );
        }

        // 5. Calcular preços públicos para cada produto e agrupá-los
        const groupedMap = new Map<string, ProdutoVitrine>();
        const stockInfoMap = new Map<string, { total: number, min: number }>();

        (produtosRaw ?? []).forEach((p: any) => {
            // Chave de agrupamento: Nome + Cor + Capacidade + Grade + Condição + Categoria
            const groupKey = `${p.nome}-${p.cor}-${p.capacidade}-${p.grade}-${p.condicao}-${p.categoria}`.toLowerCase();
            
            if (groupedMap.has(groupKey)) {
                // Se já existe, apenas soma o estoque para o cálculo de "poucas unidades"
                const stock = stockInfoMap.get(groupKey)!;
                stock.total += p.estoque_qtd;
                stock.min = Math.min(stock.min, p.estoque_minimo || 1);
                
                // Atualiza o estado de "poucas unidades" do item agrupado
                const groupedItem = groupedMap.get(groupKey)!;
                groupedItem.poucas_unidades = stock.total <= stock.min;
                return;
            }

            const precoBase = p.preco_venda_centavos;
            const precoPix = precoBase;
            const precoDebito = taxaDebito > 0 ? Math.round(precoBase / (1 - taxaDebito / 100)) : precoBase;

            const maxParcelas = Math.min(vitrineConfig.max_parcelas, taxasCredito.length);
            const parcelas: ParcelaInfo[] = [];

            for (let i = 0; i < maxParcelas; i++) {
                const taxa = taxasCredito[i]?.taxa ?? 0;
                const valorTotalParcelado = taxa > 0 ? Math.round(precoBase / (1 - taxa / 100)) : precoBase;
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

            const finalItem: ProdutoVitrine = {
                id: p.id, // O ID do primeiro produto do grupo servirá como ID do card
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
            };

            groupedMap.set(groupKey, finalItem);
            stockInfoMap.set(groupKey, { total: p.estoque_qtd, min: p.estoque_minimo || 1 });
        });

        const produtos = Array.from(groupedMap.values());

        // Ordenar: destaques primeiro, depois por nome
        const destaqueSet = new Set(vitrineConfig.produtos_destaque);
        produtos.sort((a, b) => {
            const aDestaque = destaqueSet.has(a.id) ? 0 : 1;
            const bDestaque = destaqueSet.has(b.id) ? 0 : 1;
            if (aDestaque !== bDestaque) return aDestaque - bDestaque;
            return a.nome.localeCompare(b.nome);
        });

        // Extrair categorias únicas para filtro da vitrine
        const categoriasDisponiveis = Array.from(
            new Set(produtos.map(p => p.categoria).filter((c): c is string => c !== null))
        ).sort();

        // 6. Montar resposta
        const response: VitrineResponse = {
            empresa: {
                id: empresa.id,
                nome: empresa.nome,
                logo_url: empresa.logo_url,
                subdominio: empresa.subdominio,
                whatsapp: whatsappRaw?.phone_number_id ?? null,
            },
            config: vitrineConfig,
            produtos,
            categorias_disponiveis: categoriasDisponiveis,
            gateway_nome: defaultGateway?.nome ?? "Padrão",
        };

        // Headers de cache: 60 segundos (CDN/browser cache)
        return NextResponse.json(response, {
            status: 200,
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
                "Access-Control-Allow-Origin": "*", // Público
            },
        });

    } catch (error: any) {
        console.error("[Vitrine API] Erro inesperado:", error);
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
