-- Tabela para armazenar sessões do chatbot WhatsApp
CREATE TABLE IF NOT EXISTS chatbot_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  remote_jid TEXT NOT NULL,
  client_phone TEXT,
  client_name TEXT,
  cliente_id BIGINT REFERENCES clientes(cliente_id),
  state TEXT DEFAULT 'MENU_PRINCIPAL',
  state_data JSONB DEFAULT '{}',
  ultima_mensagem TEXT,
  ultima_atividade TIMESTAMPTZ DEFAULT NOW(),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE,
  atendente_engajado BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chatbot_session_tenant ON chatbot_session(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_jid ON chatbot_session(remote_jid);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ativo ON chatbot_session(ativo);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ult_atv ON chatbot_session(ultima_atividade);

-- Adiciona coluna em bancos onde a tabela já existia (idempotente)
ALTER TABLE chatbot_session ADD COLUMN IF NOT EXISTS atendente_engajado BOOLEAN DEFAULT FALSE;

-- Atualizar sessões existentes que usam 'MENU' para 'MENU_PRINCIPAL'
UPDATE chatbot_session SET state = 'MENU_PRINCIPAL' WHERE state = 'MENU';
