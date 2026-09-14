-- ============================================================
-- Esteticar — Comunicados: historico filtrado por numero conectado
-- Executar no SQL Editor do Supabase.
--
-- Todos os comandos usam IF NOT EXISTS, seguro rodar mais de uma vez.
-- Registros antigos (sem numero_origem) ficam ocultos do historico.
-- ============================================================

ALTER TABLE comunicados ADD COLUMN IF NOT EXISTS numero_origem TEXT;

CREATE INDEX IF NOT EXISTS idx_comunicados_numero_origem
  ON comunicados (tenant_id, numero_origem, criado_em DESC);