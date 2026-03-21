"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Brand, PricingSegment, ProductType } from "@/types/database";
import { toast } from "sonner";

export function useCatalogData() {
  const { profile } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [segments, setSegments] = useState<PricingSegment[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile?.empresa_id) return;
    setLoading(true);
    const supabase = createClient();
    try {
      const [bRes, sRes, tRes] = await Promise.all([
        supabase.from('brands').select('*').eq('empresa_id', profile.empresa_id).order('name'),
        supabase.from('pricing_segments').select('*').eq('empresa_id', profile.empresa_id).order('name'),
        supabase.from('product_types').select('*').eq('empresa_id', profile.empresa_id).order('name')
      ]);

      if (bRes.error) throw bRes.error;
      if (sRes.error) throw sRes.error;
      if (tRes.error) throw tRes.error;

      setBrands(bRes.data || []);
      setSegments(sRes.data || []);
      setProductTypes(tRes.data || []);
    } catch (error) {
      console.error("Error fetching catalog data:", error);
      toast.error("Erro ao carregar dados do catálogo");
    } finally {
      setLoading(false);
    }
  }, [profile?.empresa_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    brands,
    segments,
    productTypes,
    loading,
    refresh
  };
}
