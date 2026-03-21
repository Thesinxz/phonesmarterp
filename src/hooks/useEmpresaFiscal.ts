"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { RegimeFiscal } from "@/components/inventory/FiscalPanel";

interface EmpresaFiscal {
  regime: RegimeFiscal;
  tributacoes: { id: string; nome: string }[];
  loading: boolean;
}

export function useEmpresaFiscal(): EmpresaFiscal {
  const { profile } = useAuth();
  const [regime, setRegime] = useState<RegimeFiscal>("simples_nacional");
  const [tributacoes, setTributacoes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.empresa_id) return;
    const supabase = createClient();

    Promise.all([
      (supabase
        .from("empresas")
        .select("regime_fiscal")
        .eq("id", profile.empresa_id)
        .single() as any),
      (supabase
        .from("tributacoes")
        .select("id, nome")
        .eq("empresa_id", profile.empresa_id)
        .eq("ativo", true)
        .order("nome") as any),
    ]).then(([empresaRes, tributRes]: any[]) => {
      if (empresaRes.data?.regime_fiscal) {
        setRegime(empresaRes.data.regime_fiscal as RegimeFiscal);
      }
      setTributacoes(tributRes.data || []);
      setLoading(false);
    });
  }, [profile?.empresa_id]);

  return { regime, tributacoes, loading };
}
