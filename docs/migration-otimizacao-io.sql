-- ============================================================
-- Esteticar — Otimização de E/S de disco
-- Executar no SQL Editor do Supabase
--
-- O script está dividido em 3 partes. Se o editor der timeout,
-- rode cada PARTE separadamente (na ordem). Todos os comandos
-- usam IF NOT EXISTS, então é seguro executar mais de uma vez.
-- ============================================================




-- ============================================================
-- PARTE 1 — ÍNDICES (agendamentos, faturamentos, contas,
--            ordens de serviço, itens de OS)
-- ============================================================

-- Agendamentos: queries de relatório, dashboard e lembretes
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_status_data
  ON agendamentos (tenant_id, status, data_agendamento);

-- Faturamentos: relatório financeiro + cobrança de pendentes
CREATE INDEX IF NOT EXISTS idx_faturamentos_tenant_criado
  ON faturamentos (tenant_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_faturamentos_tenant_pago
  ON faturamentos (tenant_id, pago);

-- Contas a pagar: não possuía nenhum índice
CREATE INDEX IF NOT EXISTS idx_contas_pagar_tenant_pago_vencimento
  ON contas_pagar (tenant_id, pago, data_vencimento);

-- Ordens de serviço: dashboard + relatórios
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tenant_status
  ON ordens_servico (tenant_id, status);

-- Itens de ordem de serviço: relatório de serviços
CREATE INDEX IF NOT EXISTS idx_itens_os_tenant_criado
  ON itens_ordem_servico (tenant_id, criado_em);




-- ============================================================
-- PARTE 2 — ÍNDICES (notificações, chatbot, comunicados)
-- ============================================================

-- Notificações: consultas de deduplicação dos jobs (evita N+1)
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant_tipo_ref
  ON notificacoes (tenant_id, tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida_criado
  ON notificacoes (lida, criado_em);

-- Chatbot: contagem de não lidas
CREATE INDEX IF NOT EXISTS idx_chatbot_session_tenant_ativo
  ON chatbot_session (tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_chatbot_mensagem_tenant_session
  ON chatbot_mensagem (tenant_id, session_id, criado_em);

-- Comunicados: consulta por disparo em andamento
CREATE INDEX IF NOT EXISTS idx_comunicados_tenant_status
  ON comunicados (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_comunicados_destinatarios_comunicado_status
  ON comunicados_destinatarios (comunicado_id, status);




-- ============================================================
-- PARTE 3 — FUNÇÃO RPC: contagem de mensagens não lidas
-- Substitui a consulta N+1 (2 queries por sessão ativa) por
-- uma única chamada.
-- ============================================================
CREATE OR REPLACE FUNCTION contar_nao_lidas(p_tenant UUID)
RETURNS TABLE(session_id UUID, nao_lidas BIGINT)
LANGUAGE sql
STABLE
AS $$
  WITH sessoes_ativas AS (
    SELECT id
    FROM chatbot_session
    WHERE tenant_id = p_tenant
      AND ativo = true
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