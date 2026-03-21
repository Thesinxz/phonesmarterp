import { getIMEIVerification } from "@/app/actions/imei-verify";
import { createClient } from "@/lib/supabase/server";
import { IMEICertificate } from "@/components/imei/IMEICertificate";
import { notFound } from "next/navigation";

export default async function CertificadoIMEIPage({
  params,
  searchParams,
}: {
  params: { imei: string };
  searchParams: {
    item?: string;
    cliente?: string;
    venda?: string;
    valor?: string;
  };
}) {
  const verification = await getIMEIVerification(params.imei) as any;
  if (!verification) notFound();

  const supabase = await createClient();

  // Buscar dados do aparelho e da empresa
  const [itemRes, empresaRes] = await Promise.all([
    searchParams.item
      ? supabase.from('catalog_items').select('name').eq('id', searchParams.item).single() as any
      : Promise.resolve({ data: null }),
    supabase.from('empresas').select('nome, cnpj, telefone').eq('id', (verification as any).empresa_id).single() as any,
  ]);

  const productName = itemRes.data?.name || `IMEI ${params.imei}`;
  const empresa = empresaRes.data as any;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      {/* Botão imprimir — some no print */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold"
        >
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold"
        >
          Fechar
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', background: '#f4f4f5', minHeight: '100vh' }}>
        <div style={{ boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', borderRadius: '4px', overflow: 'hidden' }}>
          <IMEICertificate
            imei={params.imei}
            productName={productName}
            storeName={empresa?.nome || 'Phone Smart'}
            storeCnpj={empresa?.cnpj}
            storePhone={empresa?.telefone}
            data={{
              carrier: verification.carrier,
              country: verification.country,
              simLock: verification.sim_lock,
              icloudStatus: verification.icloud_status,
              appleModel: verification.apple_model,
              appleColor: verification.apple_color,
              purchaseDate: verification.purchase_date,
              warrantyStatus: verification.warranty_status,
              warrantyUntil: verification.warranty_until,
              rawData: verification.raw_data || {},
              verifiedAt: verification.verified_at,
              fromCache: true,
            }}
            customerName={searchParams.cliente}
            saleDate={searchParams.venda}
            saleValue={searchParams.valor ? parseInt(searchParams.valor) : undefined}
          />
        </div>
      </div>
    </>
  );
}
