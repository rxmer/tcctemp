-- ============================================================
-- Previne agendamentos ativos SObrepostos no mesmo tenant.
-- Corrige a corrida: duas criacoes simultaneas em janelas
-- sobrepostas (mesma OU diferentes horas de inicio) passavam.
--
-- Executar UMA unica vez no SQL Editor do Supabase.
-- ============================================================

-- 0) (opcional) antes de aplicar, confira se ja existem
--    agendamentos ativos sobrepostos. Se esse SELECT retornar
--    linhas, a constraint na linha de ADICionar vai falhar --
--    cancele/ajuste os conflitos antes.
-- SELECT a1.agendamento_id, a2.agendamento_id, a1.data_agendamento,
--        a1.hora_agendamento, a2.hora_agendamento
--   FROM agendamentos a1
--   JOIN agendamentos a2 ON a2.tenant_id = a1.tenant_id
--    AND a2.data_agendamento = a1.data_agendamento
--    AND a1.agendamento_id < a2.agendamento_id
--    AND a1.status IN ('pendente','confirmado','em_andamento')
--    AND a2.status IN ('pendente','confirmado','em_andamento')
--    AND a1.deletado_em IS NULL AND a2.deletado_em IS NULL
--    AND (a1.hora_agendamento::time + make_interval(mins => COALESCE(a1.duracao_min, 30))) > a2.hora_agendamento::time;

-- 1) extensao: permite GiST com igualdade em uuid (tenant_id)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2) duracao do servico materializada no agendamento no momento
--    da criacao/troca de servico (o app agora grava duracao_min)
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS duracao_min INTEGER;

UPDATE agendamentos a
   SET duracao_min = COALESCE(s.duracao_min, 30)
  FROM servico s
 WHERE s.servico_id = a.servico_id
   AND a.duracao_min IS NULL;

-- 3) constraint de exclusao: nenhum par de agendamentos ATIVOS
--    do mesmo tenant pode ter janelas [inicio, inicio+duracao)
--    sobrepostas. Tenta-tentas concorrentes agora: um INSERT
--    falha com violacao de exclusao -> API responde 409.
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_sem_sobreposicao
  EXCLUDE USING gist (
    tenant_id WITH =,
    tsrange(
      data_agendamento + hora_agendamento,
      data_agendamento + hora_agendamento + make_interval(mins => COALESCE(duracao_min, 30))
    ) WITH &&
  )
  WHERE (status NOT IN ('cancelado','falta','finalizado') AND deletado_em IS NULL);