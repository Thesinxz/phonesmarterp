"use client";
import { useState } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  RefreshCw, Wifi, Lock, Unlock, Cloud, CloudOff,
  Smartphone, Calendar, AlertTriangle, CheckCircle2,
  Loader2, Info
} from "lucide-react";
import { cn } from "@/utils/cn";
import { verifyIMEI, saveIMEIVerificationManually, type SickwResult } from "@/app/actions/imei-verify";
import { toast } from "sonner";
import { lookupTAC, validateIMEILuhn, type TACInfo } from "@/utils/tac-lookup";
import { parseGenericIMEIText, isDeviceClean, warrantyLabel } from "@/utils/imei-parser";
import { useEffect } from "react";

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
  
  // States para a Abordagem Híbrida
  const [tacInfo, setTacInfo] = useState<TACInfo | null>(null);
  const [tacLoading, setTacLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Lookup automático de TAC (modelo/marca)
  useEffect(() => {
    if (!imei || !validateIMEILuhn(imei)) return;

    setTacLoading(true);
    const serial = initialData?.rawData?.serial?.response?.serial || '';
    const url = `/api/tac/${imei}${serial ? `?serial=${serial}` : ''}`;
    
    fetch(url)
      .then(r => r.json())
      .then(data => setTacInfo(data))
      .catch(() => setTacInfo(null))
      .finally(() => setTacLoading(false));
  }, [imei, initialData?.rawData?.serial?.response?.serial]);

  // Parser em tempo real do texto colado
  const parsedFromPaste = parseGenericIMEIText(pasteText);

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

  const handleSaveManual = async () => {
    if (!parsedFromPaste) return;
    setIsSavingManual(true);
    try {
      const result = await saveIMEIVerificationManually({
        imei,
        catalogItemId,
        data: {
          carrier: parsedFromPaste.lockedCarrier,
          country: parsedFromPaste.purchaseCountry,
          simLock: parsedFromPaste.simLockStatus,
          icloudStatus: (parsedFromPaste as any).icloudStatus || (isDeviceClean(parsedFromPaste.modelDescription) ? 'OFF' : null),
          appleModel: parsedFromPaste.model || parsedFromPaste.modelDescription,
          appleColor: (parsedFromPaste as any).color || null,
          purchaseDate: parsedFromPaste.purchaseDate,
          warrantyStatus: parsedFromPaste.warrantyStatus,
          rawData: { manual: true, text: pasteText, parsed: parsedFromPaste }
        }
      });
      if (result.success) {
        toast.success("Verificação salva com sucesso!");
        // Recarregar os dados (neste caso, simular atualização local ou refresh)
        window.location.reload();
      } else {
        toast.error(result.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar verificação");
    } finally {
      setIsSavingManual(false);
    }
  };

  // Estado: sem verificação detalhada ainda
  if (!data) {
    return (
      <div className="space-y-4">
        {/* Identificação automática pelo TAC */}
        {imei && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Smartphone size={16} className={cn(
              "shrink-0",
              tacLoading ? "text-slate-300 animate-pulse" : "text-brand-500"
            )} />
            <div className="flex-1 min-w-0">
              {tacLoading ? (
                <div className="h-3 bg-slate-200 rounded animate-pulse w-32" />
              ) : tacInfo?.model ? (
                <>
                  <p className="text-xs font-black text-slate-700 truncate">
                    {tacInfo.model}
                    {tacInfo.storage && (
                      <span className="ml-1 text-slate-400 font-normal">{tacInfo.storage}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {tacInfo.brand}
                    {tacInfo.source === 'local' && ' · base local'}
                    {tacInfo.source === 'apple_api' && ' · Apple'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  {tacInfo?.brand && tacInfo.brand !== 'Desconhecido'
                    ? `${tacInfo.brand} — modelo não identificado`
                    : 'Modelo não identificado pelo TAC'
                  }
                </p>
              )}
            </div>
            {!validateIMEILuhn(imei) && (
              <span className="text-[10px] text-red-500 font-bold shrink-0">IMEI inválido</span>
            )}
          </div>
        )}

        {/* Instruções e Paste */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-blue-800">
              Como obter informações completas
            </p>
            <ol className="text-[11px] text-blue-700 mt-1 space-y-1 list-decimal list-inside">
              <li>
                Acesse um dos sites gratuitos abaixo com o IMEI{' '}
                {imei && <span className="font-mono font-black">{imei}</span>}:
              </li>
            </ol>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { name: 'sickw.com', url: `https://sickw.com/?imei=${imei || ''}` },
                { name: 'imei.info', url: `https://www.imei.info/?imei=${imei || ''}` },
                { name: 'imeipro.info', url: `https://www.imeipro.info/?imei=${imei || ''}` },
              ].map(site => (
                <a
                  key={site.name}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-blue-600 underline hover:text-blue-800"
                >
                  {site.name}
                </a>
              ))}
            </div>
            <p className="text-[11px] text-blue-700 mt-2">
              2. Copie todo o resultado e cole no campo abaixo:
            </p>
            
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Cole aqui o resultado da verificação..."
              className="w-full mt-2 p-2 h-20 text-[10px] font-mono border border-blue-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
            />

            {parsedFromPaste ? (
              <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Resumo Identificado</p>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">{parsedFromPaste.model || parsedFromPaste.modelDescription}</p>
                  <p className="text-[10px] text-slate-500">SN: {parsedFromPaste.serialNumber || '—'}</p>
                </div>
                <button
                  onClick={handleSaveManual}
                  disabled={isSavingManual}
                  className="w-full mt-3 h-9 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingManual ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Salvar Verificação
                </button>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-blue-100 flex items-center justify-between">
                <span className="text-[10px] text-blue-400 italic">Ou use o serviço pago automático:</span>
                <button
                  onClick={() => handleVerify(false)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[11px] font-bold hover:bg-brand-600 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                  Sickw Automático
                </button>
              </div>
            )}
          </div>
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
