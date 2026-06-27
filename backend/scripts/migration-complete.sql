-- =============================================
-- EstetiCar - Migration Completa
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. TENANTS
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  perfil TEXT DEFAULT 'funcionario',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id);

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  cliente_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  deletado_em TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_deletado ON clientes(deletado_em) WHERE deletado_em IS NULL;

-- 4. VEICULOS
CREATE TABLE IF NOT EXISTS veiculos (
  veiculo_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  placa TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER,
  cor TEXT,
  cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  deletado_em TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_veiculos_tenant ON veiculos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_veiculos_deletado ON veiculos(deletado_em) WHERE deletado_em IS NULL;

-- 5. SERVICO
CREATE TABLE IF NOT EXISTS servico (
  servico_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome_servico TEXT NOT NULL,
  descricao TEXT,
  preco_base NUMERIC NOT NULL,
  duracao_min INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  deletado_em TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_servico_tenant ON servico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_servico_deletado ON servico(deletado_em) WHERE deletado_em IS NULL;

-- 6. CONFIGURACAO_EXPEDIENTE
CREATE TABLE IF NOT EXISTS configuracao_expediente (
  expediente_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  abertura TEXT,
  fechamento TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_expediente_tenant ON configuracao_expediente(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expediente_tenant_dia ON configuracao_expediente(tenant_id, dia_semana);

-- 7. AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
  agendamento_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
  veiculo_id BIGINT NOT NULL REFERENCES veiculos(veiculo_id),
  servico_id BIGINT NOT NULL REFERENCES servico(servico_id),
  data_agendamento DATE NOT NULL,
  hora_agendamento TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_por UUID REFERENCES usuarios(id),
  deletado_em TIMESTAMPTZ DEFAULT NULL,
  lembrete_enviado TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant ON agendamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_deletado ON agendamentos(deletado_em) WHERE deletado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_agendamentos_lembrete ON agendamentos(lembrete_enviado) WHERE lembrete_enviado IS NULL;

-- 8. ORDENS_SERVICO
CREATE TABLE IF NOT EXISTS ordens_servico (
  os_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agendamento_id BIGINT REFERENCES agendamentos(agendamento_id),
  status TEXT DEFAULT 'em_andamento',
  observacoes TEXT,
  valor_total NUMERIC DEFAULT 0,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  deletado_em TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_os_tenant ON ordens_servico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_os_agendamento ON ordens_servico(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_os_deletado ON ordens_servico(deletado_em) WHERE deletado_em IS NULL;

-- 9. ITENS_ORDEM_SERVICO
CREATE TABLE IF NOT EXISTS itens_ordem_servico (
  item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  os_id BIGINT NOT NULL REFERENCES ordens_servico(os_id),
  servico_id BIGINT REFERENCES servico(servico_id),
  descricao TEXT NOT NULL,
  quantidade INTEGER DEFAULT 1,
  valor_unitario NUMERIC NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  deletado_em TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_itens_os_tenant ON itens_ordem_servico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_itens_os_os ON itens_ordem_servico(os_id);
CREATE INDEX IF NOT EXISTS idx_itens_os_deletado ON itens_ordem_servico(deletado_em) WHERE deletado_em IS NULL;

-- 10. FATURAMENTOS
CREATE TABLE IF NOT EXISTS faturamentos (
  faturamento_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  os_id BIGINT NOT NULL REFERENCES ordens_servico(os_id),
  valor_total NUMERIC NOT NULL,
  pago BOOLEAN DEFAULT FALSE,
  data_pagamento DATE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faturamentos_tenant ON faturamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_os ON faturamentos(os_id);

-- 11. CONTAS_PAGAR
CREATE TABLE IF NOT EXISTS contas_pagar (
  conta_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  pago BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  deletado_em TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_contas_tenant ON contas_pagar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contas_deletado ON contas_pagar(deletado_em) WHERE deletado_em IS NULL;

-- 12. NOTIFICACOES
CREATE TABLE IF NOT EXISTS notificacoes (
  notificacao_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  referencia_tipo TEXT,
  referencia_id TEXT,
  lida BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant ON notificacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(tenant_id, lida);

-- 13. CHATBOT_SESSION
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
  ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_chatbot_session_tenant ON chatbot_session(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_jid ON chatbot_session(remote_jid);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ativo ON chatbot_session(ativo);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ult_atv ON chatbot_session(ultima_atividade);

-- =============================================
-- DADOS INICIAIS (opcional)
-- =============================================

-- Criar tenant padrão
-- INSERT INTO tenants (nome, slug) VALUES ('EstetiCar', 'esteticar');

-- Criar usuário admin (depois de criar no Supabase Auth)
-- INSERT INTO usuarios (id, nome, email, tenant_id, perfil)
-- VALUES ('UUID_DO_AUTH_USER', 'Admin', 'admin@esteticar.com', 'UUID_DO_TENANT', 'admin');
