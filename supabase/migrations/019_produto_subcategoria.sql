-- Adicionando a coluna subcategoria à tabela de produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS subcategoria TEXT;
