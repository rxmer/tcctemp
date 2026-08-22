-- ============================================================
-- Esteticar — Comunicados em massa via WhatsApp
-- Executar no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS comunicados (
  comunicado_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  mensagem TEXT NOT NULL,
  filtro TEXT NOT NULL DEFAULT 'todos',
  total_destinatarios INT NOT NULL DEFAULT 0,
  enviados INT NOT NULL DEFAULT 0,
  falhas INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enviando',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS comunicados_destinatarios (
  id BIGSERIAL PRIMARY KEY,
  comunicado_id BIGINT NOT NULL REFERENCES comunicados(comunicado_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  cliente_id BIGINT,
  cliente_nome TEXT NOT NULL,
  telefone TEXT,
  jid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT,
  enviado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comunicados_tenant ON comunicados (tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_destinatarios ON comunicados_destinatarios (comunicado_id);
