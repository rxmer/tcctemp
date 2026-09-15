-- ============================================================
-- Esteticar — Schema do Banco de Dados
-- PostgreSQL via Supabase
--
-- ATTENCAO: este arquivo reflete o schema REAL atualmente no
-- Supabase (extraido via OpenAPI/PostgREST e validado por probes).
-- Aplicar via SQL Editor do Supabase apenas em projetos novos,
-- ou executar os trechos como das atlas (veja commentarios).
--
-- Tabelas que nao existem mais no banco real foram removidas
-- (ex.: valid_transitions). Funcoes RPC (contar_nao_lidas etc.)
-- estao documentadas em docs/migration-*.sql.
-- ============================================================

-- ============================================================
-- EXTENSOES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  telefone VARCHAR,
  email VARCHAR,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ
);

-- ============================================================
-- USUARIOS
-- id = UUID do usuario no Supabase Auth (auth.users.id).
-- O Auth ID projeta em public.usuarios via trigger acionado no
-- insert de auth.users (criado manualmente no dashboard); o perfil
-- chega com o DEFAULT 'funcionario' e o app corrige via upsert.
-- Este script NAO recria esse trigger (ele e externo ao schema).
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  perfil VARCHAR NOT NULL DEFAULT 'funcionario' CHECK (perfil IN ('admin', 'funcionario')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ
);

-- ============================================================
-- CONFIGURACAO DA EMPRESA (1:1 por tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracao_empresa (
  tenant_id UUID PRIMARY KEY,
  nome_fantasia TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  logo_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SERVICOS
-- ============================================================
CREATE TABLE IF NOT EXISTS servico (
  servico_id SERIAL PRIMARY KEY,
  nome_servico VARCHAR NOT NULL,
  descricao TEXT,
  preco_base NUMERIC NOT NULL,
  duracao_min INTEGER NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deletado_em TIMESTAMPTZ,
  tenant_id UUID NOT NULL
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  cliente_id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_telefone_tenant
  ON clientes (telefone, tenant_id)
  WHERE deletado_em IS NULL;

-- ============================================================
-- VEICULOS
-- ============================================================
CREATE TABLE IF NOT EXISTS veiculos (
  veiculo_id BIGSERIAL PRIMARY KEY,
  placa TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER,
  cor TEXT,
  cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_veiculos_placa_tenant
  ON veiculos (placa, tenant_id)
  WHERE deletado_em IS NULL;

-- ============================================================
-- CONFIGURACAO DE EXPEDIENTE
-- Dias fechados NAO possuem linha (o app nao insere registro).
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracao_expediente (
  expediente_id BIGSERIAL PRIMARY KEY,
  dia_semana INTEGER NOT NULL,
  abertura TIME NOT NULL,
  fechamento TIME NOT NULL,
  ativo BOOLEAN DEFAULT true,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT configuracao_expediente_dia_semana_tenant_id_key UNIQUE (tenant_id, dia_semana)
);

-- ============================================================
-- DATAS BLOQUEADAS
-- ============================================================
CREATE TABLE IF NOT EXISTS datas_bloqueadas (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  data DATE NOT NULL,
  motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT datas_bloqueadas_tenant_id_data_key UNIQUE (tenant_id, data)
);

-- ============================================================
-- NOTIFICACOES
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  notificacao_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tipo VARCHAR NOT NULL,
  titulo VARCHAR NOT NULL,
  mensagem TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  referencia_tipo VARCHAR,
  referencia_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTAS A PAGAR
-- ============================================================
CREATE TABLE IF NOT EXISTS contas_pagar (
  conta_id BIGSERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  pago BOOLEAN DEFAULT false,
  observacoes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ
);

-- ============================================================
-- AGENDAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  agendamento_id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
  veiculo_id BIGINT NOT NULL REFERENCES veiculos(veiculo_id),
  servico_id BIGINT NOT NULL REFERENCES servico(servico_id),
  data_agendamento DATE NOT NULL,
  hora_agendamento TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'confirmado', 'em_andamento', 'finalizado', 'cancelado', 'falta')),
  observacoes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_por UUID NOT NULL REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ,
  lembrete_enviado TIMESTAMPTZ,
  lembrete_tentativas INTEGER DEFAULT 0,
  duracao_min INTEGER
);

-- GARANTIA DE NAO-OVERLAP DE AGENDAMENTOS ATIVOS (por tenant)
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_sem_sobreposicao
  EXCLUDE USING gist (
    tenant_id WITH =,
    tsrange(
      data_agendamento + hora_agendamento,
      data_agendamento + hora_agendamento + make_interval(mins => COALESCE(duracao_min, 30))
    ) WITH &&
  )
  WHERE (status NOT IN ('cancelado', 'falta', 'finalizado') AND deletado_em IS NULL);

-- ============================================================
-- ORDENS DE SERVICO
-- ============================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
  os_id BIGSERIAL PRIMARY KEY,
  agendamento_id BIGINT NOT NULL REFERENCES agendamentos(agendamento_id),
  status TEXT NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento', 'finalizado', 'cancelado')),
  valor_total NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ
);

-- ============================================================
-- ITENS DA ORDEM DE SERVICO
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_ordem_servico (
  item_id BIGSERIAL PRIMARY KEY,
  os_id BIGINT NOT NULL REFERENCES ordens_servico(os_id),
  servico_id BIGINT REFERENCES servico(servico_id),
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL,
  tenant_id UUID NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  deletado_em TIMESTAMPTZ
);

-- ============================================================
-- FATURAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS faturamentos (
  faturamento_id BIGSERIAL PRIMARY KEY,
  os_id BIGINT NOT NULL REFERENCES ordens_servico(os_id),
  valor_total NUMERIC NOT NULL,
  pago BOOLEAN DEFAULT false,
  data_pagamento DATE,
  observacoes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHATBOT SESSION
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  remote_jid TEXT NOT NULL,
  client_phone TEXT,
  client_name TEXT,
  cliente_id BIGINT REFERENCES clientes(cliente_id),
  state TEXT DEFAULT 'MENU',
  state_data JSONB DEFAULT '{}',
  ultima_mensagem TEXT,
  ultima_atividade TIMESTAMPTZ DEFAULT now(),
  criado_em TIMESTAMPTZ DEFAULT now(),
  ativo BOOLEAN DEFAULT true,
  atendente_engajado BOOLEAN DEFAULT false,
  numero_origem TEXT
);

CREATE INDEX IF NOT EXISTS idx_chatbot_session_tenant ON chatbot_session (tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_jid ON chatbot_session (remote_jid);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ativo ON chatbot_session (ativo);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_ult_atv ON chatbot_session (ultima_atividade);
CREATE INDEX IF NOT EXISTS idx_chatbot_session_numero_origem ON chatbot_session (tenant_id, numero_origem, ultima_atividade DESC);

-- ============================================================
-- CHATBOT MENSAGENS
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot_mensagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  session_id UUID NOT NULL REFERENCES chatbot_session(id) ON DELETE CASCADE,
  remetente TEXT NOT NULL CHECK (remetente IN ('cliente', 'bot', 'atendente')),
  texto TEXT NOT NULL,
  tipo_media TEXT,
  media_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_mensagem_session ON chatbot_mensagem (session_id, criado_em);

-- ============================================================
-- COMUNICADOS (envio em massa via WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS comunicados (
  comunicado_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  mensagem TEXT NOT NULL,
  filtro TEXT NOT NULL DEFAULT 'todos',
  total_destinatarios INTEGER NOT NULL DEFAULT 0,
  enviados INTEGER NOT NULL DEFAULT 0,
  falhas INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enviando',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  numero_origem TEXT
);

CREATE TABLE IF NOT EXISTS comunicados_destinatarios (
  id BIGSERIAL PRIMARY KEY,
  comunicado_id BIGINT NOT NULL REFERENCES comunicados(comunicado_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  cliente_id BIGINT,
  cliente_nome TEXT NOT NULL,
  telefone TEXT,
  jid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT,
  enviado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comunicados_tenant ON comunicados (tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_destinatarios ON comunicados_destinatarios (comunicado_id);

-- ============================================================
-- INDICES ADICIONAIS (performance usada pelo app)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos (data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_status ON agendamentos (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_agendamento ON ordens_servico (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_os ON faturamentos (os_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant ON notificacoes (tenant_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_servico_tenant ON servico (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_tenant ON contas_pagar (tenant_id, data_vencimento);