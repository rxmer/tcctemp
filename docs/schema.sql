-- ============================================================
-- Esteticar — Schema do Banco de Dados
-- PostgreSQL via Supabase
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USUÁRIOS (gerenciado pelo Supabase Auth + tabela auxiliar)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  tenant_id UUID NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'funcionario' CHECK (perfil IN ('admin', 'funcionario')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  cliente_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  deletado_em TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_telefone_tenant
  ON clientes (telefone, tenant_id)
  WHERE deletado_em IS NULL;

-- ============================================================
-- VEÍCULOS
-- ============================================================
CREATE TABLE IF NOT EXISTS veiculos (
  veiculo_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
  placa TEXT,
  marca TEXT,
  modelo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  deletado_em TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_veiculos_placa_tenant
  ON veiculos (placa, tenant_id)
  WHERE placa IS NOT NULL AND deletado_em IS NULL;

-- ============================================================
-- SERVIÇOS
-- ============================================================
CREATE TABLE IF NOT EXISTS servico (
  servico_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  nome_servico TEXT NOT NULL,
  preco_base NUMERIC(10,2) NOT NULL DEFAULT 0,
  duracao_min INTEGER NOT NULL DEFAULT 60,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  deletado_em TIMESTAMPTZ
);

-- ============================================================
-- CONFIGURAÇÃO DE EXPEDIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracao_expediente (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  abertura TIME,
  fechamento TIME,
  aberto BOOLEAN DEFAULT true,
  UNIQUE (tenant_id, dia_semana)
);

-- ============================================================
-- AGENDAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  agendamento_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
  veiculo_id BIGINT REFERENCES veiculos(veiculo_id),
  servico_id BIGINT REFERENCES servico(servico_id),
  data_agendamento DATE NOT NULL,
  hora_agendamento TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmado','em_andamento','finalizado','cancelado')),
  observacoes TEXT,
  fonte TEXT DEFAULT 'painel',
  usuario_id UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  deletado_em TIMESTAMPTZ
);

-- ============================================================
-- ORDENS DE SERVIÇO
-- ============================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
  ordem_servico_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agendamento_id BIGINT NOT NULL REFERENCES agendamentos(agendamento_id),
  status TEXT NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento','finalizado','cancelado')),
  observacoes TEXT,
  valor_total NUMERIC(10,2),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ITENS DA ORDEM DE SERVIÇO
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_ordem_servico (
  id BIGSERIAL PRIMARY KEY,
  ordem_servico_id BIGINT NOT NULL REFERENCES ordens_servico(ordem_servico_id),
  descricao TEXT NOT NULL,
  quantidade INTEGER DEFAULT 1,
  valor_unitario NUMERIC(10,2) DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FATURAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS faturamentos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ordem_servico_id BIGINT NOT NULL REFERENCES ordens_servico(ordem_servico_id),
  valor NUMERIC(10,2) NOT NULL,
  recebido BOOLEAN DEFAULT false,
  data_recebimento TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTAS A PAGAR
-- ============================================================
CREATE TABLE IF NOT EXISTS contas_pagar (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  vencimento DATE NOT NULL,
  pago BOOLEAN DEFAULT false,
  data_pagamento TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  referencia_tipo TEXT,
  referencia_id TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHATBOT SESSION
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  remote_jid TEXT NOT NULL,
  client_phone TEXT,
  client_name TEXT,
  cliente_id BIGINT REFERENCES clientes(cliente_id),
  state TEXT NOT NULL DEFAULT 'MENU_PRINCIPAL',
  state_data JSONB DEFAULT '{}',
  ultima_atividade TIMESTAMPTZ DEFAULT NOW(),
  ultima_mensagem TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_session_tenant ON chatbot_session (tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_jid ON chatbot_session (remote_jid);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ativo ON chatbot_session (ativo);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ult_atv ON chatbot_session (ultima_atividade);

-- ============================================================
-- DATAS BLOQUEADAS
-- ============================================================
CREATE TABLE IF NOT EXISTS datas_bloqueadas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  data DATE NOT NULL,
  motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, data)
);

-- ============================================================
-- CONFIGURAÇÃO DA EMPRESA
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracao_empresa (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  nome_fantasia TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  logo_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VALID TRANSITIONS (chatbot state machine)
-- ============================================================
CREATE TABLE IF NOT EXISTS valid_transitions (
  id BIGSERIAL PRIMARY KEY,
  current_state TEXT NOT NULL,
  next_state TEXT NOT NULL
);

-- ============================================================
-- ÍNDICES ADICIONAIS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos (data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_status ON agendamentos (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_agendamento ON ordens_servico (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_os ON faturamentos (ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant ON notificacoes (tenant_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_servico_tenant ON servico (tenant_id);
