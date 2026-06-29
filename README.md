# Esteticar — Sistema de Gestão para Estética Automotiva

Sistema web com chatbot integrado ao WhatsApp para gestão completa de estéticas automotivas de pequeno porte.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | ReactJS + Vite |
| Backend | Node.js + ExpressJS |
| Banco | PostgreSQL (Supabase) |
| Chatbot | Baileys (WhatsApp Web) |
| Autenticação | Supabase Auth (JWT) |

## Estrutura

```
/
├── backend/               # API REST (ExpressJS)
│   ├── src/
│   │   ├── controllers/   # Controladores das rotas
│   │   ├── services/      # Regras de negócio
│   │   ├── routes/        # Definição de rotas
│   │   ├── middleware/     # Auth, validação, erros
│   │   ├── chatbot/       # Chatbot WhatsApp
│   │   ├── config/        # Configurações (Supabase, cache, logger)
│   │   ├── utils/         # Helpers e validação Zod
│   │   └── __tests__/     # Testes automatizados (Vitest)
│   └── .env.example
├── frontend/              # SPA React
│   └── src/
│       ├── pages/         # Páginas da aplicação
│       ├── components/    # Componentes reutilizáveis
│       ├── services/      # API client
│       ├── hooks/         # Custom hooks
│       ├── context/       # Auth, Theme
│       └── styles/        # CSS Modules
```

## Funcionalidades

- **Clientes** — cadastro, edição, exclusão com validação de telefone único
- **Veículos** — vinculados a clientes, placa única, impedir exclusão com agendamentos futuros
- **Serviços** — catálogo com preço base e duração, ativar/desativar
- **Agendamentos** — calendário + lista, conflito com duração, expediente, feriados, fluxo de status
- **Ordens de Serviço** — vinculadas a agendamentos, itens, geração automática de faturamento
- **Financeiro** — contas a pagar, faturamentos, resumo com saldo
- **Relatórios** — agendamentos por período, serviços mais realizados, receitas vs despesas, status, clientes frequentes
- **Expediente** — horários por dia da semana
- **Feriados** — bloqueio de datas especiais
- **Configuração da Empresa** — personalização com logo, nome, CNPJ, endereço, telefone
- **Chatbot WhatsApp** — menu contextual, agendar, consultar, cancelar, recuperação de sessão, transferência para atendente
- **Notificações** — central com status de leitura, lembretes automáticos com reenvio (máx 3 tentativas)
- **Autenticação** — JWT, dois perfis (admin/funcionário), proteção de rotas
- **Validação de entrada** — schemas Zod em todas as rotas de criação
- **Máscara de telefone** — formatação `(11) 99999-9999` em todo o sistema

## Regras de Negócio

- Status do agendamento: pendente → confirmado → em_andamento → finalizado | cancelado
- Cancelamento com antecedência mínima de 2h
- Conflito de horário considera duração do serviço (sobreposição de janelas)
- Finalizar OS → gera faturamento automaticamente + agendamento vira finalizado
- Cancelar OS → agenda volta para confirmado
- Cliente/veículo/serviço não podem ser excluídos se vinculados a registros ativos
- Conta paga e faturamento recebido não podem ser pagos novamente

## Setup para Desenvolvimento

### 1. Pré-requisitos

- Node.js 20+
- Conta no Supabase (gratuita)

### 2. Supabase

Crie um projeto no Supabase e execute o SQL de criação das tabelas (disponível em `docs/schema.sql` ou no SQL Editor do Supabase).

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais do Supabase
npm install
npm run dev
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Edite VITE_API_URL e VITE_SUPABASE_*
npm install
npm run dev
```

### 5. Chatbot WhatsApp

1. Acesse o sistema → WhatsApp → Conectar
2. Escaneie o QR Code com o WhatsApp do negócio
3. O chatbot estará ativo para os clientes

### 6. Migrações SQL (executar no SQL Editor do Supabase)

```sql
-- Configuração da empresa
CREATE TABLE IF NOT EXISTS configuracao_empresa (
  tenant_id UUID PRIMARY KEY,
  nome_fantasia TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  logo_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Remover DDI 55 dos telefones existentes (2026)
UPDATE clientes SET telefone = RIGHT(telefone, LENGTH(telefone) - 2) WHERE telefone LIKE '55%' AND LENGTH(telefone) >= 12;
UPDATE configuracao_empresa SET telefone = RIGHT(telefone, LENGTH(telefone) - 2) WHERE telefone LIKE '55%' AND LENGTH(telefone) >= 12;
```

### 7. Testes

```bash
cd backend
npm test
```

> **241 testes automatizados** (Vitest) — 17 arquivos de teste, 0 falhas.

## O que falta para produção

- [ ] **Deploy** — backend em Railway/Render, frontend na Vercel, banco no Supabase (já está)
- [ ] **Domínio próprio** — configurar domínio + SSL
- [ ] **Variáveis de ambiente** — configurar `NODE_ENV=production`, `CORS_ORIGIN` com o domínio
- [ ] **Swagger/OpenAPI** — documentar todos os endpoints da API
- [ ] **Esquema SQL** — extrair dump das migrations do Supabase para um arquivo `schema.sql`
- [ ] **Backup automático** — configurar backup diário do banco (Supabase já faz, mas verificar retenção)
- [ ] **WhatsApp Business API** — substituir Baileys pela API oficial do WhatsApp Business para maior estabilidade (opcional)
- [ ] **Monitoramento** — configurar logs centralizados e alertas de erro
- [ ] **Rate limiting** — ajustar limites conforme necessidade (já implementado com `express-rate-limit`)

## Licença

Projeto acadêmico — TCC Curso de Desenvolvimento de Sistemas.
