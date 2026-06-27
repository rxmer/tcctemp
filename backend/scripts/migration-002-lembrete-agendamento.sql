ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS lembrete_enviado TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_agendamentos_lembrete ON agendamentos(lembrete_enviado) WHERE lembrete_enviado IS NULL;
