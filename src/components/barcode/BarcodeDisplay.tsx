"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/utils/cn";

interface Props {
  value: string;           // código EAN-13 ou SKU
  showEAN?: boolean;       // mostrar barcode EAN-13
  showQR?: boolean;        // mostrar QR Code
  size?: "sm" | "md" | "lg";
  className?: string;
  productName?: string;    // nome para exibir abaixo (opcional)
  price?: number;          // preço em centavos (opcional)
}

const SIZES = {
  sm: { width: 100, height: 40, qr: 48 },
  md: { width: 160, height: 60, qr: 72 },
  lg: { width: 220, height: 80, qr: 96 },
};

export function BarcodeDisplay({
  value,
  showEAN = true,
  showQR = true,
  size = "md",
  className,
  productName,
  price,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const s = SIZES[size];

  useEffect(() => {
    if (!value) return;

    // Renderizar EAN-13 com JsBarcode
    if (showEAN && canvasRef.current) {
      import('jsbarcode').then(({ default: JsBarcode }) => {
        try {
          JsBarcode(canvasRef.current, value, {
            format: value.length === 13 && /^\d+$/.test(value) ? "EAN13" : "CODE128",
            width: 1.5,
            height: s.height,
            displayValue: true,
            fontSize: 10,
            margin: 4,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch (e) {
          // Fallback para Code128 se EAN-13 inválido
          try {
            JsBarcode(canvasRef.current, value, {
              format: "CODE128",
              width: 1.5,
              height: s.height,
              displayValue: true,
              fontSize: 10,
              margin: 4,
            });
          } catch {}
        }
      });
    }

    // Renderizar QR Code
    if (showQR && qrRef.current) {
      import('qrcode').then((QRCode) => {
        QRCode.toCanvas(qrRef.current, value, {
          width: s.qr,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });
      });
    }
  }, [value, showEAN, showQR, s.height, s.qr]);

  if (!value) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400",
        size === "sm" ? "h-12 w-24" : size === "md" ? "h-16 w-40" : "h-24 w-56",
        className
      )}>
        Sem código
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex items-center gap-3">
        {showEAN && (
          <canvas
            ref={canvasRef}
            className="rounded"
            style={{ maxWidth: s.width }}
          />
        )}
        {showQR && (
          <canvas
            ref={qrRef}
            width={s.qr}
            height={s.qr}
            className="rounded"
          />
        )}
      </div>
      {productName && (
        <p className="text-[10px] text-slate-600 font-bold truncate max-w-[200px] text-center">
          {productName}
        </p>
      )}
      {price !== undefined && price > 0 && (
        <p className="text-xs font-black text-emerald-600">
          R$ {(price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  );
}
