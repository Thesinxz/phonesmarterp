-- Migration 091: Ensure default units for all companies and support address fields
-- 1. Create default units for companies that don't have any
INSERT INTO public.units (empresa_id, name, has_repair_lab, has_parts_stock, has_sales)
SELECT id, 'Matriz', true, true, true
FROM public.empresas e
WHERE NOT EXISTS (
    SELECT 1 FROM public.units u WHERE u.empresa_id = e.id
);

-- 2. Ensure all users have a unit_id assigned if possible
UPDATE public.usuarios u
SET unit_id = (SELECT id FROM public.units WHERE empresa_id = u.empresa_id LIMIT 1)
WHERE unit_id IS NULL;
