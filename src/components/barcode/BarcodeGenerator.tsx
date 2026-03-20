"use client";
import { useState } from "react";
import { Barcode, RefreshCw, Check, Copy } from "lucide-react";
import { cn } from "@/utils/cn";
import { generateEAN13, generateSKU, generatePartSKU, validateEAN13 } from "@/utils/barcode";
import { BarcodeDisplay } from "./BarcodeDisplay";
import { toast } from "sonner";

interface Props {
  itemType?: "celular" | "peca" | "acessorio";
  partType?: string;
  imei?: string;
  currentBarcode?: string;
  onGenerated: (barcode: string, sku: string) => void;
}

export function BarcodeGenerator({
  itemType,
  partType,
  imei,
  currentBarcode,
  onGenerated,
}: Props) {
  const [preview, setPreview] = useState(currentBarcode || "");
  const [mode, setMode] = useState<"ean13" | "sku" | "imei" | "manual">(
    itemType === "celular" && imei ? "imei" :
    itemType === "peca" ? "sku" : "ean13"
  );
  const [manualInput, setManualInput] = useState("");

  const generate = () => {
    let code = "";
    if (mode === "ean13") {
      code = generateEAN13();
    } else if (mode === "sku") {
      code = generatePartSKU(partType);
    } else if (mode === "imei" && imei) {
      code = imei;
    } else if (mode === "manual") {
      code = manualInput.trim();
    }
    if (code) setPreview(code);
  };

  const handleApply = () => {
    if (!preview) { toast.error("Gere ou digite um código primeiro"); return; }
    const sku = mode === "ean13" ? generateSKU() : preview;
    onGenerated(preview, sku);
    toast.success("Código aplicado ao produto!");
  };

  const copy = () => {
    navigator.clipboard.writeText(preview);
    toast.success("Código copiado!");
  };

  return (
    <div className="space-y-4">
      {/* Seletor de modo */}
      <div className="flex flex-wrap gap-2">
        {([
          { v: "ean13", l: "EAN-13 (automático)" },
          { v: "sku",   l: "SKU interno" },
          ...(imei ? [{ v: "imei", l: "Usar IMEI" }] : []),
          { v: "manual", l: "Digitar código" },
        ] as { v: typeof mode; l: string }[]).map(opt => (
          <button
            key={opt.v}
            type="button"
            onClick={() => { setMode(opt.v); setPreview(""); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2",
              mode === opt.v
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {/* Input manual */}
      {mode === "manual" && (
        <input
          type="text"
          value={manualInput}
          onChange={(e) => { setManualInput(e.target.value); setPreview(e.target.value); }}
          className="input-glass font-mono text-sm w-full"
          placeholder="Digite o código (EAN-13, SKU, etc.)"
        />
      )}

      {/* Botão gerar */}
      {mode !== "manual" && (
        <button
          type="button"
          onClick={generate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
        >
          <RefreshCw size={14} />
          {mode === "imei" ? "Usar IMEI como código" : "Gerar código"}
        </button>
      )}

      {/* Preview do código */}
      {preview && (
        <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
          <BarcodeDisplay value={preview} size="md" showEAN showQR />
          <div className="flex items-center gap-2 justify-between">
            <p className="font-mono text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
              {preview}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={copy}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                <Copy size={14} />
              </button>
              <button type="button" onClick={generate}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Aplicar ao produto
          </button>
        </div>
      )}
    </div>
  );
}
