# Esteticar — Sistema de Gestão para Estética Automotiva

Sistema web com chatbot integrado ao WhatsApp para gestão completa de estéticas automotivas de pequeno porte.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | ReactJS + Vite |
| Backend | Node.js + ExpressJS |
| Banco | PostgreSQL (Supabase) |
| Chatbot | Baileys (WhatsApp Web) embutido no backend |
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
│   │   ├── chatbot/       # Chatbot WhatsApp (Baileys embutido)
│   │   ├── config/        # Configurações (Supabase, cache, logger, swagger)
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
│       ├── utils/         # Helpers de formatação e de estado (chatbot)
│       └── styles/        # CSS Modules
```

## Funcionalidades

- **Dashboard** — visão geral com indicadores do dia (agendamentos de hoje, serviços realizados, total de clientes, faturamento do mês) e lista dos próximos agendamentos
- **Clientes** — cadastro, edição, exclusão (admin), validação de telefone único
- **Veículos** — vinculados a clientes, placa única, impedir exclusão com agendamentos futuros
- **Serviços** — catálogo com preço base e duração, ativar/desativar (admin)
- **Agendamentos** — calendário + lista, conflito com duração, expediente, feriados, fluxo de status
- **Ordens de Serviço** — vinculadas a agendamentos, itens, geração automática de faturamento
- **Financeiro** — contas a pagar, faturamentos, resumo com saldo (admin)
- **Relatórios** — agendamentos, serviços, receitas vs despesas, status, clientes frequentes (admin). Exportação PDF/Excel por tipo (cada tela gera apenas sua seção) ou relatório completo pela visão geral
- **Expediente** — horários por dia da semana (admin)
- **Feriados** — bloqueio de datas especiais (admin)
- **Configuração da Empresa** — personalização com logo, nome, CNPJ, endereço, telefone (admin)
- **Comunicados** — envio de mensagens em massa via WhatsApp com filtros de destinatários. Histórico de disparos limitado ao número do WhatsApp conectado e tela bloqueada quando não há conexão (mostra orientação com botão para ir à tela de conexão)
- **WhatsApp** — tela de conexão com QR Code de 60s, rotação automática limitada a 3 (~3 min) e recarga manual quando expirado; as conversas, comunicados e o widget dependem do número conectado
- **Chatbot WhatsApp** — menu contextual, agendar, consultar, cancelar, recuperação de sessão. Datas bloqueadas (feriados/recesso) são removidas das opções de data e o bot orienta o cliente ao escolhê-las. Quando o cliente solicita atendente, o bot encaminha a notificação e oferece botões "Voltar ao bot" / "Continuar com atendente". Keywords como "menu", "0", "voltar" permitem retorno imediato ao bot. Sessões em atendimento humano voltam ao menu automaticamente após 10 min de inatividade (se o atendente não tiver respondido; com resposta do atendente, a conversa continua)
- **Conversas WhatsApp** — lista em estilo inbox com avatar, prévia da última mensagem (cliente, "Você:" ou "Bot:", incluindo 🎤 áudio), contador de não lidas por conversa e tempo relativo. Abas de filtro (Todas, Não lidas, Com atendente, No menu, Agendando), busca, ordenação ("Não lidas primeiro", "Mais recentes", "Nome A-Z") e paginação. Ao selecionar uma conversa, o histórico com resposta manual do atendente abre ao lado em formato mestre-detalhe
- **Widget de Conversas** — botão flutuante fixo no canto inferior direito com contador de mensagens não lidas. Painel com lista de conversas, chat inline com resposta manual do atendente, polling a cada 5s e CTA "Conectar WhatsApp" quando não há número conectado (direciona à tela de conexão e fecha o painel)
- **Recuperação de senha** — fluxo por e-mail com link mágico, validação de e-mail cadastrado antes do envio, página de redefinição com sincronização entre abas e redefinição manual de senhas pelo admin
- **Perfil** — troca de senha do usuário logado (confirmação da senha atual)
- **Notificações** — central com status de leitura, lembretes automáticos com reenvio (máx 3 tentativas). Sino com ações rápidas para agendamentos passados (marcar falta) e conversas WhatsApp
- **Autenticação** — JWT, dois perfis (admin/funcionário), proteção de rotas com `requireAdmin`, sessão em `sessionStorage`
- **Multi-tenant** — isolamento total por `tenant_id` derivado do token JWT em todas as consultas
- **Validação de entrada** — schemas Zod em todas as rotas de escrita (criação e atualização)
- **Segurança** — Helmet, CORS restrito, rate limiting por token JWT no app (600 req/15min) + login e exportações, sanitização de erros internos, logs sem dados pessoais, credenciais do WhatsApp criptografadas em repouso (AES-256-GCM via `BAILEYS_AUTH_PASSWORD`), Swagger apenas fora de produção
- **Manutenção automática** — limpeza de notificações antigas (>30 dias), expiração de sessões do chatbot (incluindo atendimento humano), lembretes com tolerância para reinicialização do servidor
- **Máscara de telefone** — formatação `(11) 99999-9999` em todo o sistema
- **Responsividade** — layout adaptável para mobile (≤ 768px), tabelas viram cards
- **API documentada** — Swagger/OpenAPI em `/api-docs`

## Regras de Negócio

- Status do agendamento: pendente → confirmado → em_andamento → finalizado | cancelado | falta
- Cancelamento com antecedência mínima de 2h
- Conflito de horário considera duração do serviço (sobreposição de janelas)
- Finalizar OS → gera faturamento automaticamente + agendamento vira finalizado (funcionário pode finalizar; **a consulta/edição de dados financeiros é exclusiva do admin**)
- Cancelar OS → agenda volta para confirmado
- Cliente/veículo/serviço não podem ser excluídos se vinculados a registros ativos
- Conta paga e faturamento recebido não podem ser pagos novamente
- Atendimento humano no chatbot: cliente pode voltar ao bot a qualquer momento via keywords ou botões; timeout de 10 min sem resposta do atendente retorna automaticamente ao menu

## Arquitetura

```
┌────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)              │
│  Login/recuperação ──► Supabase Auth (direto, PKCE)         │
│  Demais dados     ──► fetch /api ... (backend)              │
└──────────────────────┬─────────────────────────────────────┘
                       │ Bearer JWT
                       ▼
┌────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express)                    │
│  1. Autentica o token via Supabase (supabaseAdmin)          │
│  2. Aplica RBAC (admin/funcionário) — requireAdmin          │
│  3. Regras de negócio (expediente, conflitos, status, etc.) │
│  4. Acessa o banco com service role key                     │
│  └─ chatbot Baileys (WhatsApp Web) embutido no processo     │
└──────────────────────┬─────────────────────────────────────┘
                       ▼
┌────────────────────────────────────────────────────────────┐
│           SUPABASE (Auth + PostgreSQL)                      │
│  Tabelas: tenants, usuarios, clientes, veiculos, servicos, │
│  agendamentos, ordens_servico, financeiro, chatbot_session,│
│  chatbot_mensagem, comunicados, notificacoes e mais        │
└────────────────────────────────────────────────────────────┘
```

- A autenticação usa Supabase Auth direto no frontend (login, cadastro, recuperação de senha); o backend valida o token a cada request e deriva `tenant_id`/`perfil` da tabela `usuarios`.
- O banco só é acessado pelo backend com `service_role_key` (bypassa RLS); o frontend nunca recebe a chave.
- O isolamento multi-tenant é aplicado nas queries por `tenant_id` e reforçado por autorização por perfil nas rotas.

## Setup para Desenvolvimento

### 1. Pré-requisitos

- Node.js 20+
- Conta no Supabase (gratuita)

### 2. Supabase

Crie um projeto no Supabase e execute o SQL de criação das tabelas (disponível em `docs/schema.sql`) — ele já inclui clientes, veículos, serviços, agendamentos, ordens de serviço, financeiro, chatbot (`chatbot_session` e `chatbot_mensagem`), comunicados em massa e configurações.

Para o status "faltou" nos agendamentos, execute `docs/schema-falta-status.sql`.

Para notas de voz (áudio) nas conversas, execute `docs/migracao-audio-chatbot.sql`.

Para notificações do chatbot (que referenciam sessões por UUID), execute `docs/migration-notificacoes-referencia-id-text.sql` — alinha `notificacoes.referencia_id` com `TEXT` conforme o schema.

Para a recuperação de senha funcionar, configure em **Authentication → URL Configuration**:
- **Redirect URLs**: adicione `http://localhost:5173/**`
- Opcional: traduza o template **Emails → Templates → Reset Password** para português (a variável `{{ .ConfirmationURL }}` é o link mágico)

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais do Supabase
# Opcional: defina BAILEYS_AUTH_PASSWORD para criptografar o estado de autenticação do WhatsApp em repouso
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
4. Widget de conversas aparece no canto inferior direito para acompanhar e responder mensagens

O QR Code tem validade de 60s com rotação automática limitada a 3 (~3 min); ao expirar, a tela oferece a opção de recarregar para gerar um novo. O botão **"Desconectar"** sempre apaga a autenticação salva, então a próxima conexão exigirá um novo QR Code.

### 6. Banco de Dados

O schema completo está versionado em `docs/schema.sql`. Para criar as tabelas, execute o conteúdo no SQL Editor do Supabase.

### 7. Testes

```bash
cd backend && npm test    # 468 testes (30 arquivos)
cd frontend && npm test   # 318 testes (45 arquivos)
```

> **786 testes automatizados** (Vitest) — backend e frontend, 0 falhas.

## O que falta para produção

- [ ] **Deploy** — backend em Railway/Render, frontend na Vercel, banco no Supabase (já está)
- [ ] **Domínio próprio** — configurar domínio + SSL
- [ ] **Variáveis de ambiente** — configurar `NODE_ENV=production`, `CORS_ORIGIN` com o domínio (Swagger e `/api-docs` ficam desabilitados automaticamente em produção) e `BAILEYS_AUTH_PASSWORD` (criptografa as credenciais do WhatsApp)
- [x] **Esquema SQL** — versionado em `docs/schema.sql`
- [ ] **Backup automático** — configurar backup diário do banco (Supabase já faz, mas verificar retenção)
- [ ] **WhatsApp Business API** — substituir Baileys pela API oficial do WhatsApp Business para maior estabilidade (opcional)
- [ ] **Monitoramento** — configurar logs centralizados e alertas de erro
- [x] **Rate limiting** — implementado com `express-rate-limit` (+ `trust proxy` para funcionar atrás de proxy/reverse proxy)
- [x] **Auditoria de segurança** — validação completa com Zod, controle de acesso por perfil em todas as rotas, sanitização de erros, headers de segurança

## Licença

Projeto acadêmico — TCC Curso de Desenvolvimento de Sistemas.
