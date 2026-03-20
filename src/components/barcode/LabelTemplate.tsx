"use client";
import { useEffect, useRef } from "react";

export interface LabelItem {
  id: string;
  name: string;
  barcode: string;
  price?: number;
  sku?: string;
  qty?: number;
}

function LabelBarcode({ value, height = 36 }: { value: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    import('jsbarcode').then(({ default: JsBarcode }) => {
      try {
        JsBarcode(ref.current, value, {
          format: /^\d{13}$/.test(value) ? "EAN13" : "CODE128",
          width: 1.2, height, displayValue: true,
          fontSize: 7, margin: 2,
          background: "#ffffff", lineColor: "#000000",
        });
      } catch {
        try {
          JsBarcode(ref.current, value, {
            format: "CODE128", width: 1.2, height,
            displayValue: true, fontSize: 7, margin: 2,
          });
        } catch {}
      }
    });
  }, [value, height]);
  return <canvas ref={ref} />;
}

function LabelQR({ value, size = 44 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(ref.current, value, {
        width: size, margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    });
  }, [value, size]);
  return <canvas ref={ref} width={size} height={size} />;
}

/** Etiqueta A4 — Avery L7160 — 65 etiquetas por folha (38.1 × 21.2mm) */
export function LabelSheetA4({ items }: { items: LabelItem[] }) {
  const expanded: LabelItem[] = [];
  items.forEach(item => {
    for (let i = 0; i < (item.qty || 1); i++) expanded.push(item);
  });

  return (
    <div style={{
      width: '210mm', padding: '10.7mm 4.67mm',
      boxSizing: 'border-box', background: 'white', fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0',
      }}>
        {expanded.map((item, idx) => (
          <div key={`${item.id}-${idx}`} style={{
            width: '38.1mm', height: '21.2mm',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '1mm', boxSizing: 'border-box',
            overflow: 'hidden', borderRight: '0.5px solid #eee',
          }}>
            <p style={{
              fontSize: '5px', fontWeight: 'bold', textAlign: 'center',
              maxWidth: '36mm', overflow: 'hidden', whiteSpace: 'nowrap',
              textOverflow: 'ellipsis', margin: '0 0 0.5mm 0', color: '#222',
            }}>
              {item.name.toUpperCase()}
            </p>
            <LabelBarcode value={item.barcode} height={28} />
            {item.price !== undefined && item.price > 0 && (
              <p style={{ fontSize: '6px', fontWeight: 'bold', color: '#16a34a', margin: '0.5mm 0 0 0' }}>
                R$ {(item.price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Etiqueta Térmica 40×25mm (Zebra, Argox, etc.) */
export function LabelThermal({ item }: { item: LabelItem }) {
  return (
    <div style={{
      width: '40mm', height: '25mm', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '1.5mm', boxSizing: 'border-box',
      background: 'white', fontFamily: 'Arial, sans-serif',
    }}>
      <p style={{
        fontSize: '6px', fontWeight: 'bold', textAlign: 'center',
        maxWidth: '38mm', overflow: 'hidden', whiteSpace: 'nowrap',
        textOverflow: 'ellipsis', margin: 0, color: '#111',
      }}>
        {item.name.toUpperCase()}
      </p>
      <div style={{ display: 'flex', gap: '2mm', alignItems: 'center' }}>
        <LabelBarcode value={item.barcode} height={28} />
        <LabelQR value={item.barcode} size={40} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <p style={{ fontSize: '5px', color: '#666', margin: 0, fontFamily: 'monospace' }}>
          {item.sku || item.barcode}
        </p>
        {item.price !== undefined && item.price > 0 && (
          <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>
            R$ {(item.price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    </div>
  );
}
