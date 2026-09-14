-- Migração: notas de voz (áudio) nas conversas do WhatsApp
-- Adiciona suporte a mídia na tabela chatbot_mensagem
-- Executar no SQL Editor do Supabase

ALTER TABLE chatbot_mensagem
  ADD COLUMN IF NOT EXISTS tipo_media TEXT NULL,
  ADD COLUMN IF NOT EXISTS media_url TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_chatbot_mensagem_media
  ON chatbot_mensagem(tipo_media) WHERE tipo_media IS NOT NULL;