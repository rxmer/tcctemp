-- Adiciona o status "falta" aos agendamentos (cliente não compareceu)
-- Execute no SQL Editor do Supabase.

ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;

ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_check
  CHECK (status IN ('pendente','confirmado','em_andamento','finalizado','cancelado','falta'));
