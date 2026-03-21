"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench, DollarSign, Package, MapPin,
  ShieldCheck, Barcode, Eye, Plus
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useEmpresaFiscal } from "@/hooks/useEmpresaFiscal";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PriceGroup } from "@/components/ui/PriceFields";
import { FiscalPanel } from "@/components/inventory/FiscalPanel";
import { CategorySelector } from "@/components/catalog/CategorySelector";
import { BrandSelector } from "@/components/catalog/BrandSelector";
import { BarcodeGenerator } from "@/components/barcode/BarcodeGenerator";
import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";
import { PartTypeSelector } from "@/components/parts/PartTypeSelector";
import { QualitySelector } from "@/components/parts/QualitySelector";
import { CompatibleModelsSelector, type CompatibleModel } from "@/components/parts/CompatibleModelsSelector";
import { PartStockSidebar } from "@/components/parts/PartStockSidebar";
import { generatePartSKU } from "@/utils/barcode";
import { cn } from "@/utils/cn";

const INITIAL_FORM = {
  // Identificação
  name: '',
  part_type: '',
  quality: 'oem',
  category_id: '',
  status: 'ativo',
  description: '',
  vitrine_enabled: false,
  image_url: '',

  // Compatibilidade
  brand_id: '',
  brand_name: '', // Mantido para compatibilidade se necessário, mas brand_id é o foco
  specific_model: '',
  compatible_models: [] as CompatibleModel[],
  supplier_ref: '',

  // Preços
  cost_price: '0,00',
  sale_price: '0,00',
  wholesale_price_brl: '0,00',

  // Estoque
  quantity: '1',
  min_stock: '1',
  reorder_point: '3',
  storage_location: '',

  // Garantia e fornecedor
  warranty_days_part: '90',
  supplier_lead_days: '3',

  // Fiscal
  ncm: '85177099',
  cfop_estadual_saida: '5102',
  cfop_interestadual_saida: '6102',
  cfop_estadual_entrada: '',
  cfop_interestadual_entrada: '',
  cst_csosn: '',
  cest: '',
  origin_code: '0',
  codigo_beneficio_fiscal: '',
  tributacao_id: '',

  // Barcode
  barcode: '',
  sku: '',
};

export default function NovaPecaPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { regime, tributacoes } = useEmpresaFiscal();
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);

  const set = (field: keyof typeof INITIAL_FORM, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    set(e.target.name as any, e.target.value);

  // Custo e venda em centavos
  const costCents = Math.round(
    parseFloat(form.cost_price.replace(/\./g, '').replace(',', '.')) * 100
  ) || 0;
  const saleCents = Math.round(
    parseFloat(form.sale_price.replace(/\./g, '').replace(',', '.')) * 100
  ) || 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!form.name.trim()) { toast.error("Informe o nome da peça"); return; }
    if (!form.part_type) { toast.error("Selecione o tipo de peça"); return; }
    if (!profile?.empresa_id) return;

    isSubmittingRef.current = true;
    setSaving(true);

    const finalBarcode = form.barcode || generatePartSKU(form.part_type);
    const finalSku = form.sku || generatePartSKU(form.part_type);

    const supabase = createClient();

    // Buscar unidade ativa
    const { data: units } = await (supabase
      .from('unidades')
      .select('id')
      .eq('empresa_id', profile.empresa_id)
      .limit(1) as any);

    const unitId = (units as any)?.[0]?.id;

    const itemData: Record<string, any> = {
      empresa_id: profile.empresa_id,
      item_type: 'peca',
      name: form.name.trim(),
      part_type: form.part_type,
      quality: form.quality,
      category_id: form.category_id || null,
      status: form.status,
      description: form.description || null,
      vitrine_enabled: form.vitrine_enabled,
      image_url: form.image_url || null,

      brand_id: form.brand_id || null,
      brand_name: form.brand_name || null,
      specific_model: form.specific_model || null,
      compatible_models: form.compatible_models,
      supplier_ref: form.supplier_ref || null,

      cost_price: costCents,
      sale_price: saleCents,
      wholesale_price_brl: Math.round(
        parseFloat(form.wholesale_price_brl.replace(/\./g, '').replace(',', '.')) * 100
      ) || 0,

      stock_qty: parseInt(form.quantity) || 1,
      min_stock: parseInt(form.min_stock) || 1,
      reorder_point: parseInt(form.reorder_point) || 3,
      storage_location: form.storage_location || null,

      warranty_days_part: parseInt(form.warranty_days_part) || 90,
      supplier_lead_days: parseInt(form.supplier_lead_days) || null,

      ncm: form.ncm || null,
      cfop: form.cfop_estadual_saida || null,
      cfop_estadual_saida: form.cfop_estadual_saida || null,
      cfop_interestadual_saida: form.cfop_interestadual_saida || null,
      cfop_estadual_entrada: form.cfop_estadual_entrada || null,
      cfop_interestadual_entrada: form.cfop_interestadual_entrada || null,
      cst_csosn: form.cst_csosn || null,
      cest: form.cest || null,
      origin_code: form.origin_code,
      codigo_beneficio_fiscal: form.codigo_beneficio_fiscal || null,
      tributacao_id: form.tributacao_id || null,

      barcode: finalBarcode,
      sku: finalSku,
    };

    const { data: newItem, error } = await (supabase
      .from('catalog_items') as any)
      .insert(itemData)
      .select('id')
      .single();

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      isSubmittingRef.current = false;
      setSaving(false);
      return;
    }

    if (unitId && newItem?.id) {
      await (supabase.from('unit_stock') as any).upsert({
        catalog_item_id: newItem.id,
        unit_id: unitId,
        qty: parseInt(form.quantity) || 1,
      }, { onConflict: 'catalog_item_id,unit_id' });
    }

    toast.success("Peça cadastrada com sucesso!");
    router.push('/estoque');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20">
      <PageHeader
        title="Nova Peça"
        subtitle="Cadastro de peça para assistência técnica"
        back={{ href: '/estoque' }}
        actions={[
          {
            label: 'Cancelar',
            href: '/estoque',
            variant: 'secondary' as const,
          },
          {
            label: saving ? 'Salvando...' : 'Salvar Peça',
            onClick: () => handleSubmit(),
            variant: 'primary' as const,
            disabled: saving,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ COLUNA PRINCIPAL (2/3) ═══ */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Identificação */}
          <GlassCard title="Identificação" icon={Wrench}>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Nome da Peça *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="input-glass w-full text-base font-bold"
                  placeholder="Ex: Tela iPhone 15 Pro Max Original"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                  Tipo de Peça *
                </label>
                <PartTypeSelector
                  value={form.part_type}
                  onChange={(v) => set('part_type', v)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                  Qualidade
                </label>
                <QualitySelector
                  value={form.quality}
                  onChange={(v) => set('quality', v)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                    Categoria
                  </label>
                  <CategorySelector
                    value={form.category_id}
                    onChange={(v) => set('category_id', v)}
                    itemType="peca"
                    allowCreate
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="input-glass w-full"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="sob_encomenda">Sob Encomenda</option>
                    <option value="descontinuado">Descontinuado</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Descrição (visível na vitrine)
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                  className="input-glass w-full resize-none"
                  placeholder="Informações visíveis para o cliente na vitrine online..."
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => set('vitrine_enabled', !form.vitrine_enabled)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                    form.vitrine_enabled ? "bg-brand-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
                    form.vitrine_enabled ? "left-7" : "left-1"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Eye size={15} /> Exibir na Vitrine Online
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Permite que clientes vejam e solicitem esta peça online
                  </p>
                </div>
              </label>
            </div>
          </GlassCard>

          {/* 2. Compatibilidade */}
          <GlassCard title="Compatibilidade" icon={Wrench}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                    Marca do Aparelho
                  </label>
                  <BrandSelector
                    value={form.brand_id}
                    onChange={(id) => set('brand_id', id)}
                    allowCreate
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                    Modelo Principal
                  </label>
                  <input
                    name="specific_model"
                    value={form.specific_model}
                    onChange={handleChange}
                    className="input-glass w-full"
                    placeholder="Ex: iPhone 15 Pro Max"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Modelos Compatíveis
                </label>
                <CompatibleModelsSelector
                  value={form.compatible_models}
                  onChange={(v) => set('compatible_models', v)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Referência do Fornecedor
                  <span className="text-slate-300 font-normal ml-1">(código do fornecedor)</span>
                </label>
                <input
                  name="supplier_ref"
                  value={form.supplier_ref}
                  onChange={handleChange}
                  className="input-glass w-full font-mono"
                  placeholder="Ex: APL-SCR-15PM-OR"
                />
              </div>
            </div>
          </GlassCard>

          {/* 3. Preços */}
          <GlassCard title="Preços e Atacado" icon={DollarSign}>
            <PriceGroup
              costValue={form.cost_price}
              saleValue={form.sale_price}
              onCostChange={(v) => set('cost_price', v)}
              onSaleChange={(v) => set('sale_price', v)}
              wholesaleValue={form.wholesale_price_brl}
              onWholesaleChange={(v) => set('wholesale_price_brl', v)}
              showMargin
            />
          </GlassCard>

          {/* 4. Estoque e localização */}
          <GlassCard title="Estoque e Localização" icon={Package}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Quantidade Atual *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  min="0"
                  className="input-glass w-full font-bold text-lg"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Estoque Mínimo
                  <span className="text-slate-300 font-normal ml-1">(alerta)</span>
                </label>
                <input
                  type="number"
                  name="min_stock"
                  value={form.min_stock}
                  onChange={handleChange}
                  min="0"
                  className="input-glass w-full"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Ponto de Reposição
                  <span className="text-slate-300 font-normal ml-1">(sugerir compra)</span>
                </label>
                <input
                  type="number"
                  name="reorder_point"
                  value={form.reorder_point}
                  onChange={handleChange}
                  min="0"
                  className="input-glass w-full"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  <MapPin size={11} className="inline mr-1" />
                  Localização Física
                </label>
                <input
                  name="storage_location"
                  value={form.storage_location}
                  onChange={handleChange}
                  className="input-glass w-full font-mono"
                  placeholder="Ex: Gaveta A3, Prateleira 2"
                />
              </div>
            </div>
          </GlassCard>

          {/* 5. Garantia e fornecedor */}
          <GlassCard title="Garantia e Fornecedor" icon={ShieldCheck}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Garantia ao Cliente (dias)
                </label>
                <input
                  type="number"
                  name="warranty_days_part"
                  value={form.warranty_days_part}
                  onChange={handleChange}
                  min="0"
                  className="input-glass w-full"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                  Prazo de Entrega Fornecedor (dias)
                </label>
                <input
                  type="number"
                  name="supplier_lead_days"
                  value={form.supplier_lead_days}
                  onChange={handleChange}
                  min="0"
                  className="input-glass w-full"
                />
              </div>
            </div>
          </GlassCard>

          {/* 6. Fiscal */}
          <FiscalPanel
            value={{
              ncm: form.ncm,
              cfopEstadualSaida: form.cfop_estadual_saida,
              cfopInterestadualSaida: form.cfop_interestadual_saida,
              cfopEstadualEntrada: form.cfop_estadual_entrada,
              cfopInterestadualEntrada: form.cfop_interestadual_entrada,
              cstCsosn: form.cst_csosn,
              cest: form.cest,
              origemProduto: form.origin_code,
              codigoBeneficioFiscal: form.codigo_beneficio_fiscal,
              tributacaoId: form.tributacao_id,
            }}
            onChange={(field, val) => {
              const map: Record<string, string> = {
                ncm: 'ncm',
                cfopEstadualSaida: 'cfop_estadual_saida',
                cfopInterestadualSaida: 'cfop_interestadual_saida',
                cfopEstadualEntrada: 'cfop_estadual_entrada',
                cfopInterestadualEntrada: 'cfop_interestadual_entrada',
                cstCsosn: 'cst_csosn',
                cest: 'cest',
                origemProduto: 'origin_code',
                codigoBeneficioFiscal: 'codigo_beneficio_fiscal',
                tributacaoId: 'tributacao_id',
              };
              set(map[field] as any, val);
            }}
            regime={regime}
            tributacoes={tributacoes}
          />

          {/* 7. Código de barras */}
          <GlassCard title="Código de Barras / SKU" icon={Barcode}>
            {(form.barcode || form.sku) && (
              <div className="flex justify-center mb-4">
                <BarcodeDisplay
                  value={form.barcode || form.sku}
                  size="md"
                  showEAN
                  showQR
                  productName={form.name}
                  price={saleCents}
                />
              </div>
            )}
            <BarcodeGenerator
              itemType="peca"
              partType={form.part_type}
              currentBarcode={form.barcode}
              onGenerated={(barcode, sku) => {
                set('barcode', barcode);
                set('sku', sku);
              }}
            />
            <details className="mt-3">
              <summary className="text-[10px] font-black text-slate-400 uppercase cursor-pointer hover:text-slate-600">
                Editar manualmente
              </summary>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                    Código de Barras
                  </label>
                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    className="input-glass w-full font-mono text-sm"
                    placeholder="EAN‑13 ou código livre"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                    SKU Interno
                  </label>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    className="input-glass w-full font-mono text-sm uppercase"
                  />
                </div>
              </div>
            </details>
          </GlassCard>
        </div>

        {/* ═══ SIDEBAR (1/3) ═══ */}
        <div className="space-y-4">
          {/* Foto */}
          <GlassCard title="Foto do Produto" icon={Plus}>
            <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-brand-300 transition-all group">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt="Foto da peça"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <>
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📷</div>
                  <p className="text-xs font-bold text-slate-500">Clique para upload</p>
                  <p className="text-[10px] text-slate-400 mt-1">JPG, PNG até 5MB</p>
                </>
              )}
            </div>
          </GlassCard>

          {/* Sidebar de estoque */}
          <PartStockSidebar
            costPrice={costCents}
            salePrice={saleCents}
            currentQty={parseInt(form.quantity) || 0}
            minQty={parseInt(form.min_stock) || 0}
          />
        </div>
      </div>

      {/* Botão salvar fixo no mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-lg z-40">
        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 bg-brand-500 text-white rounded-2xl font-black text-sm hover:bg-brand-600 transition-all disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Peça'}
        </button>
      </div>
    </form>
  );
}
