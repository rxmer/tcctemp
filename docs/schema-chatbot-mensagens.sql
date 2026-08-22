-- Histórico de mensagens do chatbot WhatsApp
-- Executar no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS chatbot_mensagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  session_id UUID NOT NULL REFERENCES chatbot_session(id) ON DELETE CASCADE,
  remetente TEXT NOT NULL CHECK (remetente IN ('cliente', 'bot', 'atendente')),
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_mensagem_session ON chatbot_mensagem(session_id, criado_em);
