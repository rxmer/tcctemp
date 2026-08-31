# EstetiCar — Documentação Detalhada do Projeto

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#3-tecnologias-utilizadas)
4. [Estrutura de Diretórios](#4-estrutura-de-diretórios)
5. [Banco de Dados](#5-banco-de-dados)
6. [Backend — API REST](#6-backend--api-rest)
7. [Frontend — Aplicação React](#7-frontend--aplicação-react)
8. [Autenticação e Segurança](#8-autenticação-e-segurança)
9. [Chatbot WhatsApp](#9-chatbot-whatsapp)
10. [Sistema de Notificações](#10-sistema-de-notificações)
11. [Relatórios e Exportação](#11-relatórios-e-exportação)
12. [Cache e Performance](#12-cache-e-performance)
13. [Testes Automatizados](#13-testes-automatizados)
14. [Regras de Negócio](#14-regras-de-negócio)
15. [Variáveis de Ambiente](#15-variáveis-de-ambiente)
16. [Scripts NPM](#16-scripts-npm)
17. [Guia de Configuração](#17-guia-de-configuração)

---

## 1. Visão Geral

**EstetiCar** é um sistema web completo para gerenciamento de negócios de estética automotiva (detailing). O projeto foi desenvolvido como TCC (Técnico em Desenvolvimento de Sistemas) e inclui:

- **Painel administrativo** para gestão completa do negócio
- **API REST** com regras de negócio robustas
- **Chatbot WhatsApp** para atendimento automatizado ao cliente
- **Relatórios financeiros** com exportação para Excel e PDF
- **Sistema multi-tenant** — cada negócio opera de forma isolada

O sistema permite gerenciar clientes, veículos, serviços, agendamentos, ordens de serviço, finanças, funcionários, expediente e configurações da empresa.

---

## 2. Arquitetura do Sistema

### Diagrama de Alto Nível

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│                  │  JWT   │                  │ Service│                  │
│    FRONTEND      │───────▶│    BACKEND       │───────▶│    SUPABASE      │
│  (React + Vite)  │        │  (Node/Express)  │  Role  │ (PostgreSQL +    │
│                  │        │                  │        │  Auth)           │
│ • Auth direta    │        │ • Regras negócio │        │                  │
│   c/ Supabase    │        │ • Validação Zod  │        │ • 13 tabelas     │
│ • Chamadas API   │        │ • Chatbot        │        │ • Auth (JWT)     │
│   via api.js     │        │ • Relatórios     │        │                  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
                                    │
                                    │ Protocolo WhatsApp
                                    ▼
                           ┌──────────────────┐
                           │    WhatsApp       │
                           │  (Baileys WS)    │
                           └──────────────────┘
```

### Fluxo de Autenticação

1. O **frontend** autentica diretamente com o **Supabase Auth** (fluxo PKCE)
2. O Supabase emite um JWT `access_token`
3. O **frontend** envia o JWT no header `Authorization: Bearer <token>` para a API backend
4. O **backend** valida o JWT via `supabaseAdmin.auth.getUser(token)`
5. Extrai `user_metadata.tenant_id` e `user_metadata.perfil` (admin/funcionario)
6. Todas as consultas ao banco filtram por `tenant_id` (multi-tenancy)

### Padrão Multi-Tenancy

Cada linha no banco de dados está vinculada a um `tenant_id` (UUID). O tenant é extraído dos metadados do usuário autenticado. Isso garante total isolamento entre os negócios cadastrados.

---

## 3. Tecnologias Utilizadas

### Frontend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| **React** | 18.3.1 | Framework de UI |
| **Vite** | 8.0.10 | Build tool e dev server |
| **React Router** | 6.30.3 | Roteamento client-side |
| **Supabase JS SDK** | 2.105.3 | Autenticação (PKCE) |
| **Recharts** | 3.9.0 | Gráficos do dashboard |
| **Lucide React** | 1.21.0 | Biblioteca de ícones |
| **QRCode.react** | 4.2.0 | Exibição de QR code WhatsApp |
| **Vitest** | 4.1.9 | Testes unitários |
| **@testing-library/react** | 16.3.2 | Testes de componentes |
| **jsdom** | 29.1.1 | Ambiente DOM para testes |
| **CSS Modules** | — | Estilização com escopo |

### Backend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| **Node.js** | 20+ | Runtime |
| **Express** | 4.21.2 | Framework HTTP |
| **Supabase JS SDK** | 2.105.3 | Acesso ao banco (service role) |
| **@whiskeysockets/baileys** | 7.0.0-rc13 | Protocolo WhatsApp Web |
| **baileys_helper** | 1.0.6 | Helper para botões/listas WhatsApp |
| **Zod** | 4.4.3 | Validação de schemas de requisição |
| **Pino** | 10.3.1 | Logging estruturado |
| **Helmet** | 8.0.0 | Headers de segurança |
| **CORS** | 2.8.5 | Configuração de origem cruzada |
| **express-rate-limit** | 7.5.1 | Rate limiting |
| **express-async-errors** | 3.1.1 | Propagação de erros async |
| **ioredis** | 5.11.1 | Cache Redis (opcional) |
| **exceljs** | 4.4.0 | Exportação Excel |
| **pdfkit** | 0.19.1 | Exportação PDF |
| **supertest** | 7.2.2 | Testes HTTP |

### Banco de Dados

| Tecnologia | Finalidade |
|---|---|
| **PostgreSQL** (via Supabase) | Banco de dados principal |
| **Supabase Auth** | Autenticação JWT (PKCE) |
| **Redis** (opcional) | Camada de cache |

---

## 4. Estrutura de Diretórios

```
esteticar/
├── README.md                          # Documentação principal
├── package.json                       # Dependências raiz
│
├── backend/                           # API REST Node.js/Express
│   ├── .env                           # Variáveis de ambiente
│   ├── .env.example                   # Template de variáveis
│   ├── package.json                   # Dependências backend
│   ├── vitest.config.js               # Configuração de testes
│   ├── scripts/
│   │   ├── migration-complete.sql     # Schema completo (13 tabelas)
│   │   ├── migration-001-*.sql        # Migração: soft delete itens OS
│   │   └── migration-002-*.sql        # Migração: lembrete agendamento
│   └── src/
│       ├── index.js                   # Entry point (servidor + jobs)
│       ├── app.js                     # Setup Express (middleware + rotas)
│       ├── config/                    # Configurações
│       │   ├── env.js                 # Loader de variáveis
│       │   ├── supabase.js            # Cliente Supabase admin
│       │   ├── logger.js              # Config Pino logger
│       │   └── cache.js               # Camada de cache
│       ├── middleware/                 # Middlewares Express
│       │   ├── auth.js                # JWT auth + verificação admin
│       │   ├── errorHandler.js        # Handler global de erros
│       │   └── validate.js            # Validação Zod
│       ├── utils/                     # Utilitários
│       │   ├── errors.js              # Classe AppError
│       │   ├── validation.js          # Schemas Zod
│       │   └── cache.js               # Helpers de cache
│       ├── controllers/               # Controllers (14 arquivos)
│       ├── routes/                    # Rotas (14 grupos)
│       ├── services/                  # Services (15+ arquivos)
│       ├── chatbot/                   # Módulo WhatsApp
│       │   ├── baileys.client.js      # Socket WhatsApp
│       │   ├── chatbot.service.js     # Lógica máquina de estados
│       │   ├── chatbot.session.js     # CRUD de sessões
│       │   ├── chatbot.controller.js  # Endpoints REST
│       │   └── chatbot.routes.js
│       └── __tests__/                 # Testes backend (17 arquivos)
│
├── frontend/                          # SPA React
│   ├── .env                           # Variáveis de ambiente
│   ├── index.html                     # Entry HTML
│   ├── package.json                   # Dependências frontend
│   ├── vite.config.js                 # Config Vite
│   ├── vitest.config.js               # Config testes
│   ├── eslint.config.js               # Config ESLint
│   ├── public/                        # Assets estáticos
│   │   ├── esteticar.png              # Logo
│   │   ├── favicon.svg
│   │   └── icons.svg
│   └── src/
│       ├── main.jsx                   # Root React
│       ├── App.jsx                    # Router + lazy loading
│       ├── lib/
│       │   └── supabase.js            # Cliente Supabase (auth)
│       ├── context/                   # Contexts React
│       │   ├── AuthContext.jsx         # Provider de autenticação
│       │   ├── useAuth.js             # Hook de autenticação
│       │   └── ThemeContext.jsx        # Provider de tema
│       ├── hooks/                     # Custom hooks
│       │   ├── useFeedback.js         # Toast/notificações
│       │   └── useConfirm.jsx         # Modal de confirmação
│       ├── services/                  # Camada de chamadas API
│       │   ├── api.js                 # Base apiFetch com JWT refresh
│       │   └── *.service.js           # Services por domínio
│       ├── components/                # Componentes reutilizáveis
│       │   ├── AppLayout.jsx          # Layout sidebar + outlet
│       │   ├── ProtectedRoute.jsx     # Guard de autenticação
│       │   ├── NotificacaoBell.jsx    # Sino de notificações
│       │   ├── ui/                    # Componentes UI básicos
│       │   └── crud/                  # Componentes CRUD
│       ├── pages/                     # 16 páginas (lazy-loaded)
│       ├── styles/                    # Estilos globais + modules
│       │   ├── global.css             # Design tokens dark/light
│       │   ├── pages/                 # CSS modules por página
│       │   └── components/            # CSS modules de componentes
│       └── __tests__/                 # Testes frontend (25+ arquivos)
```

---

## 5. Banco de Dados

### Tabelas (13 no total)

| Tabela | Descrição | Colunas Principais |
|---|---|---|
| **tenants** | Organizações multi-tenant | `id` (UUID PK), `nome`, `slug` |
| **usuarios** | Usuários do sistema | `id` (UUID, FK Auth), `nome`, `email`, `tenant_id`, `perfil` |
| **clientes** | Clientes | `cliente_id` (bigint), `nome`, `telefone`, `email`, `tenant_id`, `deletado_em` |
| **veiculos** | Veículos vinculados a clientes | `veiculo_id` (bigint), `placa`, `marca`, `modelo`, `ano`, `cor`, `cliente_id`, `tenant_id` |
| **servico** | Catálogo de serviços | `servico_id` (bigint), `nome_servico`, `preco_base`, `duracao_min`, `ativo`, `tenant_id` |
| **configuracao_expediente** | Horário de funcionamento | `expediente_id`, `dia_semana` (0-6), `abertura`, `fechamento`, `ativo`, `tenant_id` |
| **agendamentos** | Agendamentos | `agendamento_id`, `cliente_id`, `veiculo_id`, `servico_id`, `data_agendamento`, `hora_agendamento`, `status`, `tenant_id` |
| **ordens_servico** | Ordens de serviço | `os_id`, `agendamento_id`, `status`, `valor_total`, `tenant_id` |
| **itens_ordem_servico** | Itens da OS | `item_id`, `os_id`, `servico_id`, `descricao`, `quantidade`, `valor_unitario`, `tenant_id` |
| **faturamentos** | Faturamentos | `faturamento_id`, `os_id`, `valor_total`, `pago`, `data_pagamento`, `tenant_id` |
| **contas_pagar** | Contas a pagar | `conta_id`, `descricao`, `valor`, `data_vencimento`, `pago`, `tenant_id` |
| **notificacoes** | Notificações in-app | `notificacao_id`, `tenant_id`, `tipo`, `titulo`, `mensagem`, `lida` |
| **configuracao_empresa** | Configurações da empresa | `tenant_id` (PK), `nome_fantasia`, `cnpj`, `telefone`, `email`, `endereco`, `logo_url` |
| **chatbot_session** | Sessões do chatbot | `id` (UUID), `tenant_id`, `remote_jid`, `client_phone`, `state`, `state_data` (JSONB) |

### Padrão Soft Delete

A maioria das tabelas utiliza `deletado_em TIMESTAMPTZ DEFAULT NULL` para exclusão lógica. Registros ativos têm `deletado_em IS NULL`.

### Fluxo de Status dos Agendamentos

```
pendente → confirmado → em_andamento → finalizado
                                       → cancelado (a partir de pendente ou confirmado)
```

### Fluxo de Status das Ordens de Serviço

```
aberta → em_andamento → finalizada → cancelada
```

---

## 6. Backend — API REST

### Organização (Padrão MVC)

O backend segue o padrão **Controller → Service → Supabase**:

- **Controllers**: Recebem a requisição, delegam ao service, retornam resposta HTTP
- **Services**: Contêm toda a lógica de negócio
- **Supabase**: Camada de acesso ao banco (via cliente admin com service role)

### Middlewares

| Middleware | Arquivo | Finalidade |
|---|---|---|
| **Autenticação** | `middleware/auth.js` | Valida JWT e extrai tenant_id |
| **Tratamento de erros** | `middleware/errorHandler.js` | Handler global assíncrono |
| **Validação Zod** | `middleware/validate.js` | Valida body/params/query com Zod |

### Rotas da API (14 grupos sob `/api`)

#### Auth (`/api/auth`)
| Método | Caminho | Autenticação | Descrição |
|---|---|---|---|
| POST | `/signup` | Não (rate-limit) | Criar tenant + usuário admin |
| GET | `/me` | Sim | Obter perfil do usuário + tenant |

#### Clientes (`/api/clientes`)
| Método | Caminho | Admin | Descrição |
|---|---|---|---|
| GET | `/` | Não | Listar clientes |
| POST | `/` | Sim | Criar cliente (validado Zod) |
| PUT | `/:id` | Sim | Atualizar cliente |
| DELETE | `/:id` | Sim | Soft delete cliente |

#### Veículos (`/api/veiculos`)
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Listar veículos |
| POST | `/` | Criar veículo (validado Zod) |
| PUT | `/:id` | Atualizar veículo |
| DELETE | `/:id` | Soft delete veículo |

#### Serviços (`/api/servicos`)
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Listar serviços |
| POST | `/` | Criar serviço |
| PUT | `/:id` | Atualizar serviço |
| DELETE | `/:id` | Soft delete serviço |
| PATCH | `/:id/toggle` | Ativar/desativar serviço |

#### Agendamentos (`/api/agendamentos`)
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Listar agendamentos (com filtros) |
| POST | `/` | Criar agendamento (verificação de conflito) |
| PUT | `/:id` | Atualizar agendamento (fluxo de status) |
| DELETE | `/:id` | Soft delete agendamento |

#### Ordens de Serviço (`/api/ordens-servico`)
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Listar ordens de serviço |
| GET | `/:id` | Obter OS por ID |
| POST | `/` | Criar OS |
| PUT | `/:id` | Atualizar OS (finalização gera faturamento) |
| DELETE | `/:id` | Deletar OS |
| POST | `/:id/itens` | Adicionar item |
| DELETE | `/:id/itens/:itemId` | Remover item |

#### Financeiro (`/api/financeiro`)
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/resumo` | Resumo financeiro |
| GET | `/contas` | Listar contas a pagar |
| POST | `/contas` | Criar conta |
| PUT | `/contas/:id` | Atualizar conta |
| PATCH | `/contas/:id/pagar` | Marcar como paga |
| DELETE | `/contas/:id` | Deletar conta |
| GET | `/faturamentos` | Listar faturamentos |
| PATCH | `/faturamentos/:id/receber` | Marcar como recebido |

#### Dashboard (`/api/dashboard`)
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/resumo` | Resumo do dashboard |

#### Relatórios (`/api/relatorios`) — Somente Admin
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/geral` | Relatório geral |
| GET | `/agendamentos` | Relatório de agendamentos |
| GET | `/servicos` | Relatório de serviços |
| GET | `/financeiro` | Relatório financeiro |
| GET | `/status` | Relatório de status |
| GET | `/clientes-frequentes` | Clientes frequentes |
| GET | `/exportar/excel` | Exportar para Excel |
| GET | `/exportar/pdf` | Exportar para PDF |

#### Notificações (`/api/notificacoes`)
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Listar notificações |
| GET | `/contar` | Contar não lidas |
| PATCH | `/:id/lida` | Marcar como lida |
| POST | `/marcar-todas-lidas` | Marcar todas como lidas |

#### Expediente (`/api/expediente`) — Somente Admin
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Listar expediente |
| PUT | `/` | Atualizar todos os dias |
| PUT | `/:dia_semana` | Atualizar dia específico |

#### Datas Bloqueadas (`/api/datas-bloqueadas`) — Somente Admin
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Listar datas bloqueadas |
| POST | `/` | Bloquear data |
| DELETE | `/:id` | Desbloquear data |
| GET | `/verificar` | Verificar se data está bloqueada |

#### Configuração Empresa (`/api/configuracao-empresa`) — Somente Admin
| Método | Caminho | Descrição |
|---|---|---|
| GET | `/` | Obter configuração |
| PUT | `/` | Salvar configuração |

#### Chatbot (`/api/chatbot`)
| Método | Caminho | Admin | Descrição |
|---|---|---|---|
| GET | `/status` | Não | Status da conexão WhatsApp |
| POST | `/connect` | Sim | Iniciar conexão WhatsApp |
| POST | `/disconnect` | Sim | Desconectar WhatsApp |
| GET | `/sessions` | Não | Listar sessões do chatbot |
| GET | `/sessions/:id` | Não | Detalhes da sessão |
| POST | `/sessions/:id/reply` | Sim | Enviar mensagem ao cliente |
| POST | `/:id/reset` | Sim | Resetar sessão ao menu |

### Jobs em Background (executados no `index.js`)

| Job | Intervalo | Descrição |
|---|---|---|
| **Lembrete de agendamentos** | A cada 5 minutos | Envia lembretes WhatsApp para agendamentos confirmados nas próximas hora |
| **Limpeza de sessões** | A cada 5 minutos | Reseta sessões expiradas do chatbot (timeout de 30 minutos) |

---

## 7. Frontend — Aplicação React

### Páginas (16, todas com lazy-loading)

| Página | Rota | Acesso |
|---|---|---|
| Login | `/login` | Público |
| Cadastro | `/cadastro` | Público |
| Dashboard | `/dashboard` | Autenticado |
| Clientes | `/clientes` | Autenticado |
| Veículos | `/veiculos` | Autenticado |
| Serviços | `/servicos` | Autenticado |
| Agendamentos | `/agendamentos` | Autenticado |
| Ordens de Serviço | `/ordens-servico` | Autenticado |
| Financeiro | `/financeiro` | Autenticado |
| Funcionários | `/funcionarios` | Somente Admin |
| Expediente | `/expediente` | Somente Admin |
| Feriados | `/feriados` | Somente Admin |
| Configuração Empresa | `/configuracao-empresa` | Somente Admin |
| Relatórios | `/relatorios` | Somente Admin |
| WhatsApp | `/whatsapp` | Somente Admin |
| WhatsApp Conversas | `/whatsapp/conversas` | Somente Admin |

### Componentes Reutilizáveis

#### UI (`components/ui/`)

| Componente | Descrição |
|---|---|
| **Input** | Campo de formulário com label e estado de erro |
| **Button** | Botões com variantes primary/ghost |
| **Card** | Card de conteúdo |
| **PageHeader** | Título da página + botão de ação |
| **Alert** | Alertas success/error/info com animação |
| **Spinner** | Spinners full-page e inline |
| **Pagination** | Navegação entre páginas |
| **Calendar** | Componente de seleção de data |
| **Skeleton** | Loading skeleton (variantes table e card) |

#### CRUD (`components/crud/`)

| Componente | Descrição |
|---|---|
| **DataTable** | Tabela de dados reutilizável com ações |
| **Card** / **CardHeader** | Card específico para CRUD |

### Custom Hooks

| Hook | Descrição |
|---|---|
| `useAuth()` | Acesso ao contexto de autenticação (user, tenant, signIn, signOut, isAdmin) |
| `useTheme()` | Toggle de tema (dark/light) |
| `useFeedback()` | Notificações toast com auto-dismiss |
| `useConfirm()` | Modal de confirmação baseado em Promise com trap de teclado |

### Camada de Services (Frontend)

O arquivo `services/api.js` implementa a função `apiFetch` que:
- Adiciona automaticamente o header `Authorization` com o JWT
- Faz refresh automático do token quando expira
- Trata erros de rede e autenticação

Cada domínio tem seu próprio service file que chama `apiFetch`:
- `auth.service.js`, `clientes.service.js`, `veiculos.service.js`, `servicos.service.js`
- `agendamentos.service.js`, `ordens-servico.service.js`, `financeiro.service.js`
- `funcionarios.service.js`, `dashboard.service.js`, `expediente.service.js`
- `datas-bloqueadas.service.js`, `configuracao-empresa.service.js`
- `relatorios.service.js`, `notificacoes.service.js`, `whatsapp.service.js`

### Estilização

- **Design System Global** em `styles/global.css` com custom properties (tokens) para temas dark/light
- **CSS Modules** para estilos com escopo por componente
- **Fontes**: Rajdhani (display/headings) + Inter (texto corrido)
- **Esquema de cores**: Dourado (#d4a843) como acento sobre fundos dark/light

### Contexts React

| Context | Descrição |
|---|---|
| `AuthContext` | Provider de autenticação — gerencia signIn/signOut/signUp via Supabase |
| `ThemeContext` | Provider de tema — alterna entre dark e light |

---

## 8. Autenticação e Segurança

### Fluxo de Autenticação

1. **Login**: O usuário envia email/senha → Supabase autentica → retorna JWT
2. **Registro**: Cria tenant + usuário admin em transação no banco
3. **Requisições API**: Frontend envia `Authorization: Bearer <token>` → backend valida com Supabase
4. **Refresh**: Token é renovado automaticamente pelo frontend antes de expirar

### Controle de Acesso

- **Admin**: Acesso total (configurações, relatórios, funcionários, expediente, chatbot)
- **Funcionário**: Acesso operacional (clientes, veículos, agendamentos, OS, financeiro básico)

### Segurança

| Recurso | Implementação |
|---|---|
| **Helmet** | Headers de segurança HTTP |
| **CORS** | Configuração de origens permitidas |
| **Rate Limiting** | 300 req/15min (geral), 10 req/15min (exportações) |
| **Validação Zod** | Todas as entradas validadas antes de processar |
| **Soft Delete** | Dados nunca são deletados fisicamente |
| **JWT Validation** | Validação server-side de cada token recebido |

---

## 9. Chatbot WhatsApp

### Arquitetura

O chatbot é implementado como uma **máquina de estados finitos** usando a biblioteca Baileys para conexão WebSocket com o WhatsApp Web.

### Componentes

| Arquivo | Descrição |
|---|---|
| `baileys.client.js` | Gerencia a conexão WebSocket com WhatsApp Web |
| `chatbot.service.js` | Lógica principal da máquina de estados (~1500 linhas) |
| `chatbot.session.js` | CRUD de sessões no banco de dados |
| `chatbot.controller.js` | Endpoints REST para gerenciamento |
| `chatbot.routes.js` | Rotas HTTP do chatbot |

### Máquina de Estados

```
MENU_PRINCIPAL
├── ESCOLHENDO_SERVICO
│   ├── DIGITANDO_NOME → DIGITANDO_TELEFONE
│   └── ESCOLHENDO_VEICULO
│       ├── DIGITANDO_VEICULO_MARCA → DIGITANDO_VEICULO_MODELO → DIGITANDO_VEICULO_PLACA
│       └── ESCOLHENDO_DATA → ESCOLHENDO_HORARIO → CONFIRMANDO_AGENDAMENTO → AGENDAMENTO_CONFIRMADO
├── CONSULTANDO_AGENDAMENTOS
├── CANCELANDO_AGENDAMENTO → CONFIRMANDO_CANCELAMENTO
└── FALANDO_COM_ATENDENTE
```

### Funcionalidades

- **Detecção de linguagem natural**: Saudações, despedidas, agradecimentos
- **Match por palavras-chave**: lavagem, polimento, cristalização, etc.
- **Geração de datas/horários disponíveis**: Baseado no expediente e agendamentos existentes
- **Banco de dados de marcas/modelos**: Audi, BMW, Chevrolet, Fiat, Ford, Honda, Hyundai, Jeep, Kia, etc.
- **Timeout de sessão**: 30 minutos com reset automático
- **Deduplicação de mensagens**: Via locks
- **Transferência para atendente humano**
- **Recuperação de sessão**: Após reconexão do WhatsApp

### Fluxo de Agendamento via WhatsApp

1. Cliente envia mensagem → Bot identifica saudação e apresenta menu
2. Cliente escolhe serviço → Bot mostra opções de veículos cadastrados ou pede dados
3. Cliente seleciona veículo → Bot mostra datas disponíveis
4. Cliente escolhe data → Bot mostra horários disponíveis
5. Cliente escolhe horário → Bot confirma agendamento
6. Agendamento é criado no banco de dados

---

## 10. Sistema de Notificações

### Notificações In-App

- Armazenadas na tabela `notificacoes` com `tenant_id`
- Tipos: agendamento, financeiro, sistema, etc.
- Endpoint para marcar como lida (individual ou todas)
- Componente `NotificacaoBell` exibe sino com contador no header

### Lembretes WhatsApp

- Jobs em background verificam agendamentos confirmados nas próximas hora
- Envia mensagem de lembrete via WhatsApp para o cliente
- Máximo de 3 tentativas por lembrete
- Controle via campos `lembrete_enviado` e `lembrete_tentativas` no agendamento

---

## 11. Relatórios e Exportação

### Tipos de Relatório

| Relatório | Descrição |
|---|---|
| **Geral** | Visão geral do negócio |
| **Agendamentos** | Análise de agendamentos por período |
| **Serviços** | Desempenho por tipo de serviço |
| **Financeiro** | Receitas, despesas, lucro |
| **Status** | Distribuição de status de agendamentos/OS |
| **Clientes Frequentes** | Ranking de clientes por frequência |

### Exportação

- **Excel**: Gerado com `exceljs` — planilhas formatadas com dados do relatório
- **PDF**: Gerado com `pdfkit` — documentos formatados com headers e tabelas
- Rate limit separado: 10 exportações a cada 15 minutos

---

## 12. Cache e Performance

### Estratégia de Cache

- **Redis**: Utilizado quando `REDIS_URL` está configurado
- **In-Memory**: Fallback com `Map` quando Redis não está disponível
- **Keys namespaced**: `report:{tenantId}:*`, `notif:{tenantId}:*`
- **TTL padrão**: 300 segundos (5 minutos)

### Otimizações Frontend

- **Lazy-loading**: Todas as páginas carregadas sob demanda via `React.lazy()`
- **Code splitting**: Vite gera chunks separados por página
- **CSS Modules**: Estilos com escopo evitam conflitos

### Rate Limiting

| Endpoint | Limite | Janela |
|---|---|---|
| API geral | 300 requests | 15 minutos |
| Exportações | 10 requests | 15 minutos |
| Signup | Limite rigoroso | 15 minutos |

---

## 13. Testes Automatizados

### Backend (17 arquivos de teste)

- `setup.js`: Mock completo do cliente Supabase com `vi.mock()`
- Utiliza `supertest` para testes HTTP
- Cobre todos os services e controllers
- Total: ~241 testes automatizados

| Arquivo | Cobertura |
|---|---|
| `auth.test.js` | Autenticação e registro |
| `agendamentos.test.js` | Agendamentos |
| `clientes.test.js` | Clientes |
| `veiculos.test.js` | Veículos |
| `servicos.test.js` | Serviços |
| `funcionarios.test.js` | Funcionários |
| `financeiro.test.js` | Financeiro |
| `ordens_servico.test.js` | Ordens de serviço |
| `relatorios.test.js` | Relatórios |
| `notificacoes.test.js` | Notificações |
| `expediente.test.js` | Expediente |
| `datas-bloqueadas.test.js` | Datas bloqueadas |
| `configuracao-empresa.test.js` | Config empresa |
| `integration.test.js` | Testes de integração |
| `cache.test.js` | Cache |
| `chatbot.service.test.js` | Lógica do chatbot |
| `chatbot.session.test.js` | Sessões do chatbot |

### Frontend (25+ arquivos de teste)

- Testes de componentes (`*.test.jsx`) com `@testing-library/react`
- Testes de services (`*.test.js`) com `vi.mock()` para stub de `apiFetch`
- Ambiente `jsdom` com matchers `@testing-library/jest-dom`

---

## 14. Regras de Negócio

### Agendamentos

- **Cancelamento**: Mínimo de 2 horas de antecedência
- **Conflito de horário**: Verificação de sobreposição considerando duração do serviço
- **Status**: Fluxo obrigatório pendente → confirmado → em_andamento → finalizado/cancelado

### Ordens de Serviço

- **Finalização**: Gera automaticamente registro de faturamento; agendamento fica "finalizado"
- **Cancelamento**: Agendamento retorna para "confirmado"

### Exclusão Protegida

- Clientes, veículos e serviços não podem ser deletados se vinculados a registros ativos
- Contas pagas e faturamentos recebidos não podem ser alterados

### Validações

- **Telefone**: Formato 12-13 dígitos (55 + DDD + número)
- **Placa**: Formato Mercosul ou legado (ABC1D23 ou ABC1234)

---

## 15. Variáveis de Ambiente

### Backend (`.env`)

```env
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_JWT_SECRET=taH3qpIe3cdFm89+RAs/S86Be91...
```

Opcionais:
```env
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
LOG_LEVEL=info
```

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_API_URL=http://localhost:3001
```

---

## 16. Scripts NPM

### Backend (`cd backend`)

| Script | Comando | Finalidade |
|---|---|---|
| `dev` | `nodemon --ignore baileys_auth_* src/index.js` | Servidor de desenvolvimento |
| `start` | `node src/index.js` | Servidor de produção |
| `test` | `vitest run` | Executar testes |
| `test:watch` | `vitest` | Testes em watch mode |

### Frontend (`cd frontend`)

| Script | Comando | Finalidade |
|---|---|---|
| `dev` | `vite` | Dev server (porta 5173) |
| `build` | `vite build` | Build de produção |
| `lint` | `eslint .` | Lint do código |
| `preview` | `vite preview` | Preview da build |
| `test` | `vitest run` | Executar testes |
| `test:watch` | `vitest` | Testes em watch mode |

---

## 17. Guia de Configuração

### Pré-requisitos

- Node.js 20+
- npm
- Conta no Supabase (com banco PostgreSQL)
- Redis (opcional, para cache)

### Passo a Passo

1. **Clonar o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd esteticar
   ```

2. **Configurar Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Editar .env com suas credenciais Supabase
   npm install
   npm run dev
   ```

3. **Configurar Frontend**
   ```bash
   cd frontend
   cp .env.example .env
   # Editar .env com suas credenciais Supabase
   npm install
   npm run dev
   ```

4. **Configurar Banco de Dados**
   - Executar o script `backend/scripts/migration-complete.sql` no Supabase SQL Editor
   - As migrações adicionais (`migration-001`, `migration-002`) também devem ser executadas

5. **Acessar**
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3001`

### Checklist de Produção

- [ ] Variáveis de ambiente configuradas para produção
- [ ] CORS configurado para domínio de produção
- [ ] Rate limiting habilitado
- [ ] HTTPS habilitado
- [ ] Redis configurado para cache
- [ ] Supabase com backups habilitados
- [ ] Logs monitorados
