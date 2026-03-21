"use client";
import { useState } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  RefreshCw, Wifi, Lock, Unlock, Cloud, CloudOff,
  Smartphone, Calendar, AlertTriangle, CheckCircle2,
  Loader2, Info
} from "lucide-react";
import { cn } from "@/utils/cn";
import { verifyIMEI, type SickwResult } from "@/app/actions/imei-verify";
import { toast } from "sonner";

interface Props {
  imei: string;
  catalogItemId?: string;
  initialData?: SickwResult | null;
}

function StatusBadge({ value, positives, negatives }: {
  value: string | null;
  positives: string[];
  negatives: string[];
}) {
  if (!value) return <span className="text-xs text-slate-400 italic">Sem dados</span>;

  const isPositive = positives.some(p => value.toLowerCase().includes(p.toLowerCase()));
  const isNegative = negatives.some(n => value.toLowerCase().includes(n.toLowerCase()));

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold",
      isPositive ? "bg-emerald-50 text-emerald-700" :
      isNegative ? "bg-red-50 text-red-700" :
      "bg-slate-100 text-slate-600"
    )}>
      {isPositive ? <CheckCircle2 size={12} /> : isNegative ? <AlertTriangle size={12} /> : <Info size={12} />}
      {value}
    </span>
  );
}

export function IMEIVerifier({ imei, catalogItemId, initialData }: Props) {
  const [data, setData] = useState<SickwResult | null>(initialData || null);
  const [loading, setLoading] = useState(false);

  if (!imei || !/^\d{15}$/.test(imei)) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <ShieldAlert size={20} className="text-slate-400 shrink-0" />
        <p className="text-xs text-slate-500">IMEI não cadastrado neste aparelho.</p>
      </div>
    );
  }

  const handleVerify = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const result = await verifyIMEI(imei, catalogItemId, forceRefresh);
      if (result.success && result.data) {
        setData(result.data);
        toast.success(result.data.fromCache ? "Dados do cache" : "Verificação concluída!");
      } else {
        toast.error(result.error || "Erro na verificação");
      }
    } catch {
      toast.error("Erro ao conectar com a Sickw");
    } finally {
      setLoading(false);
    }
  };

  // Estado: sem verificação ainda
  if (!data) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <Shield size={20} className="text-slate-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-600">IMEI não verificado</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{imei}</p>
          </div>
          <button
            onClick={() => handleVerify(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </div>
      </div>
    );
  }

  // Estado: verificado — mostrar resultados
  return (
    <div className="space-y-3">
      {/* Header com status geral */}
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-2xl border",
        data.icloudStatus?.toLowerCase().includes('on')
          ? "bg-red-50 border-red-200"
          : "bg-emerald-50 border-emerald-200"
      )}>
        {data.icloudStatus?.toLowerCase().includes('on')
          ? <ShieldX size={20} className="text-red-500 shrink-0" />
          : <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
        }
        <div className="flex-1">
          <p className="text-xs font-black text-slate-800">
            {data.icloudStatus?.toLowerCase().includes('on')
              ? "Atenção — iCloud ativado"
              : "Aparelho verificado"}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">{imei}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          {data.fromCache && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">cache</span>}
          <button
            onClick={() => handleVerify(true)}
            disabled={loading}
            className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all"
            title="Reverificar"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Grid de informações */}
      <div className="grid grid-cols-2 gap-2">
        {/* Modelo */}
        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
            <Smartphone size={11} /> Modelo
          </div>
          <p className="text-xs font-bold text-slate-700">{data.appleModel || "—"}</p>
          {data.appleColor && <p className="text-[10px] text-slate-400">{data.appleColor}</p>}
        </div>

        {/* iCloud */}
        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
            <Cloud size={11} /> iCloud
          </div>
          <StatusBadge
            value={data.icloudStatus}
            positives={['off', 'clean', 'limpo', 'desativado']}
            negatives={['on', 'ativado', 'locked']}
          />
        </div>

        {/* SIM Lock */}
        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
            <Wifi size={11} /> SIM Lock
          </div>
          <StatusBadge
            value={data.simLock}
            positives={['unlocked', 'desbloqueado', 'livre']}
            negatives={['locked', 'bloqueado']}
          />
        </div>

        {/* Operadora */}
        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
            <Wifi size={11} /> Operadora
          </div>
          <p className="text-xs font-bold text-slate-700">{data.carrier || "—"}</p>
          {data.country && <p className="text-[10px] text-slate-400">{data.country}</p>}
        </div>

        {/* Data de compra */}
        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
            <Calendar size={11} /> Comprado em
          </div>
          <p className="text-xs font-bold text-slate-700">
            {data.purchaseDate
              ? new Date(data.purchaseDate).toLocaleDateString('pt-BR')
              : "—"
            }
          </p>
        </div>

        {/* Garantia */}
        <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
            <Shield size={11} /> Garantia Apple
          </div>
          <StatusBadge
            value={data.warrantyStatus}
            positives={['active', 'ativa', 'valid', 'covered']}
            negatives={['expired', 'expirada', 'vencida', 'out of warranty']}
          />
          {data.warrantyUntil && (
            <p className="text-[10px] text-slate-400">
              Até {new Date(data.warrantyUntil).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>

      {/* Data da verificação */}
      <p className="text-[10px] text-slate-400 text-right">
        Verificado em {new Date(data.verifiedAt).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}
