"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

export interface CatalogCategory {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  parent_id: string | null;
  item_type: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  default_pricing_segment_id?: string | null;
  children?: CatalogCategory[];
}

export function useCatalogCategories(itemType?: string) {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [tree, setTree] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.empresa_id) return;
    const supabase = createClient();

    let query = supabase
      .from('catalog_categories')
      .select('*')
      .eq('empresa_id', profile.empresa_id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (itemType && itemType !== 'todos') {
      query = query.or(`item_type.eq.${itemType},item_type.eq.todos`);
    }

    const { data } = await (query as any);
    const flat = (data || []) as CatalogCategory[];
    setCategories(flat);

    // Montar árvore
    const roots = flat.filter(c => !c.parent_id);
    const buildTree = (nodes: CatalogCategory[]): CatalogCategory[] =>
      nodes.map(node => ({
        ...node,
        children: buildTree(flat.filter(c => c.parent_id === node.id)),
      }));
    setTree(buildTree(roots));
    setLoading(false);
  }, [profile?.empresa_id, itemType]);

  useEffect(() => { load(); }, [load]);

  return { categories, tree, loading, reload: load };
}
