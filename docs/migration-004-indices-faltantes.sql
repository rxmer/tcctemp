CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_status ON agendamentos (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_agendamento ON ordens_servico (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant ON notificacoes (tenant_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos (cliente_id);
