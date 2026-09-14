-- ============================================================
-- Esteticar — Chatbot: conversas filtradas pelo numero conectado
-- Executar no SQL Editor do Supabase.
--
-- Todos os comandos usam IF NOT EXISTS, seguro rodar mais de uma vez.
-- Registros antigos (sem numero_origem) ficam ocultos do painel.
-- ============================================================

ALTER TABLE chatbot_session ADD COLUMN IF NOT EXISTS numero_origem TEXT;

CREATE INDEX IF NOT EXISTS idx_chatbot_session_numero_origem
  ON chatbot_session (tenant_id, numero_origem, ultima_atividade DESC);

-- Contagem de nao lidas passa a aceitar numero_origem (retrocompativel:
-- se p_numero for null, mantem o comportamento antigo de listar todas)
CREATE OR REPLACE FUNCTION contar_nao_lidas(p_tenant UUID, p_numero TEXT DEFAULT NULL)
RETURNS TABLE(session_id UUID, nao_lidas BIGINT)
LANGUAGE sql
STABLE
AS $$
  WITH sessoes_ativas AS (
    SELECT id
    FROM chatbot_session
    WHERE tenant_id = p_tenant
      AND ativo = true
      AND (p_numero IS NULL OR numero_origem = p_numero)
  ),
  ultima_msg_atendente AS (
    SELECT DISTINCT ON (session_id)
      session_id,
      criado_em
    FROM chatbot_mensagem
    WHERE remetente <> 'cliente'
    ORDER BY session_id, criado_em DESC
  )
  SELECT
    sa.id,
    COUNT(m.id)::BIGINT AS nao_lidas
  FROM sessoes_ativas sa
  LEFT JOIN ultima_msg_atendente u ON u.session_id = sa.id
  LEFT JOIN chatbot_mensagem m
    ON m.session_id = sa.id
   AND m.remetente = 'cliente'
   AND m.criado_em > COALESCE(u.criado_em, '1970-01-01T00:00:00Z')
  GROUP BY sa.id
  HAVING COUNT(m.id) > 0;
$$;