-- Adds soft-delete support to itens_ordem_servico
-- Run this in Supabase SQL Editor

ALTER TABLE itens_ordem_servico
ADD COLUMN deletado_em TIMESTAMPTZ DEFAULT NULL;
