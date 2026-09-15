-- ============================================================
-- Esteticar — Notificacoes: referencia_id passa a aceitar texto
-- Executar no SQL Editor do Supabase.
--
-- O chatbot grava referencia_id = session.id (UUID) para as
-- notificacoes de "Falar com Atendente" / conversas, mas a coluna
-- foi criada como INTEGER no banco. Os inserts do chatbot
-- quebravam com "invalid input syntax for type integer" e eram
-- descartados silenciosamente (.catch(() => {})), entao essas
-- notificacoes nunca apareciam no painel.
--
-- O docs/schema.sql ja declara referencia_id como TEXT; esta
-- migration alinha o banco vivo com o schema documentado.
-- Valores numericos existentes (agendamento/conta/os/faturamento)
-- continuam funcionando: todo o codigo ja compara referencia_id
-- como texto (String(id)) e o frontend so usa para "marcar falta".
-- ============================================================

ALTER TABLE notificacoes
  ALTER COLUMN referencia_id TYPE TEXT
  USING referencia_id::TEXT;