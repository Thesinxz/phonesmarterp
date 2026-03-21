"use client";
import { type SickwResult } from "@/app/actions/imei-verify";

interface Props {
  imei: string;
  productName: string;
  storeName: string;
  storeCnpj?: string;
  storePhone?: string;
  data: SickwResult;
  saleDate?: string;
  customerName?: string;
  saleValue?: number;
}

export function IMEICertificate({
  imei, productName, storeName, storeCnpj,
  storePhone, data, saleDate, customerName, saleValue,
}: Props) {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const isClean =
    !data.icloudStatus?.toLowerCase().includes('on') &&
    data.simLock?.toLowerCase().includes('unlocked');

  return (
    <div
      id="imei-certificate"
      style={{
        width: '210mm', minHeight: '148mm',
        padding: '12mm 14mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        background: '#fff',
        boxSizing: 'border-box',
        color: '#111',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm', borderBottom: '1px solid #e5e7eb', paddingBottom: '6mm' }}>
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#1e3a8a' }}>
            {storeName}
          </h1>
          {storeCnpj && <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0 0' }}>CNPJ: {storeCnpj}</p>}
          {storePhone && <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0 0' }}>Tel: {storePhone}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
            CERTIFICADO DE PROCEDÊNCIA
          </p>
          <p style={{ fontSize: '9px', color: '#9ca3af', margin: '2px 0 0' }}>
            Verificação IMEI — {today}
          </p>
        </div>
      </div>

      {/* Status geral */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', borderRadius: '8px', marginBottom: '6mm',
        background: isClean ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${isClean ? '#86efac' : '#fca5a5'}`,
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: isClean ? '#22c55e' : '#ef4444', flexShrink: 0,
        }} />
        <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0, color: isClean ? '#15803d' : '#dc2626' }}>
          {isClean
            ? 'Aparelho verificado — sem bloqueios detectados'
            : 'Atenção — bloqueio(s) detectado(s) neste aparelho'
          }
        </p>
      </div>

      {/* Informações do aparelho */}
      <div style={{ marginBottom: '5mm' }}>
        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '0.5px' }}>
          Dados do Aparelho
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {[
            { label: 'Produto', value: productName },
            { label: 'IMEI', value: imei },
            { label: 'Modelo Apple', value: data.appleModel || '—' },
            { label: 'Cor', value: data.appleColor || '—' },
            { label: 'Data de Compra', value: data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString('pt-BR') : '—' },
            { label: 'Garantia Apple', value: data.warrantyStatus || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: '4px', fontSize: '10px', lineHeight: '1.4' }}>
              <span style={{ color: '#9ca3af', minWidth: '80px', flexShrink: 0 }}>{label}:</span>
              <span style={{ fontWeight: 'bold', color: '#111' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status técnico */}
      <div style={{ marginBottom: '5mm' }}>
        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '0.5px' }}>
          Status de Verificação
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
          {[
            { label: 'SIM Lock', value: data.simLock, ok: data.simLock?.toLowerCase().includes('unlocked') },
            { label: 'iCloud', value: data.icloudStatus, ok: !data.icloudStatus?.toLowerCase().includes('on') },
            { label: 'Operadora', value: data.carrier, ok: true },
            { label: 'País', value: data.country, ok: true },
          ].map(({ label, value, ok }) => (
            <div key={label} style={{
              padding: '5px 8px', borderRadius: '6px', textAlign: 'center',
              background: value ? (ok ? '#f0fdf4' : '#fef2f2') : '#f9fafb',
              border: `1px solid ${value ? (ok ? '#86efac' : '#fca5a5') : '#e5e7eb'}`,
            }}>
              <p style={{ fontSize: '8px', color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase' }}>{label}</p>
              <p style={{ fontSize: '9px', fontWeight: 'bold', margin: 0, color: value ? (ok ? '#15803d' : '#dc2626') : '#9ca3af' }}>
                {value || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dados da venda (se houver) */}
      {(customerName || saleDate || saleValue) && (
        <div style={{ marginBottom: '5mm', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '0.5px' }}>
            Dados da Venda
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            {customerName && <div style={{ fontSize: '10px' }}><span style={{ color: '#9ca3af' }}>Cliente: </span><b>{customerName}</b></div>}
            {saleDate && <div style={{ fontSize: '10px' }}><span style={{ color: '#9ca3af' }}>Data: </span><b>{saleDate}</b></div>}
            {saleValue && <div style={{ fontSize: '10px' }}><span style={{ color: '#9ca3af' }}>Valor: </span><b>R$ {(saleValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div>}
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '4mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <p style={{ fontSize: '8px', color: '#9ca3af', margin: 0, maxWidth: '120mm' }}>
          Verificação realizada via Sickw IMEI Check. Este certificado atesta as informações disponíveis
          na base de dados da Apple no momento da verificação e não substitui garantia contratual.
        </p>
        <div style={{ textAlign: 'right' }}>
          <div style={{ width: '40mm', borderTop: '1px solid #111', paddingTop: '3px' }}>
            <p style={{ fontSize: '8px', color: '#6b7280', margin: 0, textAlign: 'center' }}>Assinatura / Carimbo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
