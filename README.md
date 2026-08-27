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
│       └── styles/        # CSS Modules
```

## Funcionalidades

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
- **Chatbot WhatsApp** — menu contextual, agendar, consultar, cancelar, recuperação de sessão. Quando o cliente solicita atendente, o bot encaminha a notificação e oferece botões "Voltar ao bot" / "Continuar com atendente". Keywords como "menu", "0", "voltar" permitem retorno imediato ao bot. Sessões em atendimento humano voltam ao menu automaticamente após 30 min de inatividade
- **Widget de Conversas** — botão flutuante fixo no canto inferior direito com contador de mensagens não lidas. Painel com lista de conversas, chat inline com resposta manual do atendente e polling a cada 5s
- **Recuperação de senha** — fluxo por e-mail com link mágico, validação de e-mail cadastrado antes do envio, página de redefinição com sincronização entre abas e redefinição manual de senhas pelo admin
- **Notificações** — central com status de leitura, lembretes automáticos com reenvio (máx 3 tentativas). Sino com ações rápidas para agendamentos passados (marcar falta) e conversas WhatsApp
- **Autenticação** — JWT, dois perfis (admin/funcionário), proteção de rotas com `requireAdmin`, sessão em `sessionStorage`
- **Multi-tenant** — isolamento total por `tenant_id` derivado do token JWT em todas as consultas
- **Validação de entrada** — schemas Zod em todas as rotas de escrita (criação e atualização)
- **Segurança** — Helmet, CORS restrito, rate limiting (global + login + exportações), sanitização de erros internos, logs sem dados pessoais, Swagger apenas fora de produção
- **Manutenção automática** — limpeza de notificações antigas (>30 dias), expiração de sessões do chatbot (incluindo atendimento humano), lembretes com tolerância para reinicialização do servidor
- **Máscara de telefone** — formatação `(11) 99999-9999` em todo o sistema
- **Responsividade** — layout adaptável para mobile (≤ 768px), tabelas viram cards
- **API documentada** — Swagger/OpenAPI em `/api-docs`

## Regras de Negócio

- Status do agendamento: pendente → confirmado → em_andamento → finalizado | cancelado | falta
- Cancelamento com antecedência mínima de 2h
- Conflito de horário considera duração do serviço (sobreposição de janelas)
- Finalizar OS → gera faturamento automaticamente + agendamento vira finalizado
- Cancelar OS → agenda volta para confirmado
- Cliente/veículo/serviço não podem ser excluídos se vinculados a registros ativos
- Conta paga e faturamento recebido não podem ser pagos novamente
- Atendimento humano no chatbot: cliente pode voltar ao bot a qualquer momento via keywords ou botões; timeout de 30 min sem atividade retorna automaticamente ao menu

## Setup para Desenvolvimento

### 1. Pré-requisitos

- Node.js 20+
- Conta no Supabase (gratuita)

### 2. Supabase

Crie um projeto no Supabase e execute o SQL de criação das tabelas (disponível em `docs/schema.sql`).

Para o histórico de conversas do chatbot, execute também `docs/schema-chatbot-mensagens.sql`.

Para o status "faltou" nos agendamentos, execute `docs/schema-falta-status.sql`.

Para a recuperação de senha funcionar, configure em **Authentication → URL Configuration**:
- **Redirect URLs**: adicione `http://localhost:5173/**`
- Opcional: traduza o template **Emails → Templates → Reset Password** para português (a variável `{{ .ConfirmationURL }}` é o link mágico)

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
4. Widget de conversas aparece no canto inferior direito para acompanhar e responder mensagens

### 6. Banco de Dados

O schema completo está versionado em `docs/schema.sql`. Para criar as tabelas, execute o conteúdo no SQL Editor do Supabase.

### 7. Testes

```bash
cd backend && npm test    # 303 testes (21 arquivos)
cd frontend && npm test   # 277 testes (41 arquivos)
```

> **580 testes automatizados** (Vitest) — backend e frontend, 0 falhas.

## O que falta para produção

- [ ] **Deploy** — backend em Railway/Render, frontend na Vercel, banco no Supabase (já está)
- [ ] **Domínio próprio** — configurar domínio + SSL
- [ ] **Variáveis de ambiente** — configurar `NODE_ENV=production`, `CORS_ORIGIN` com o domínio (Swagger e `/api-docs` ficam desabilitados automaticamente em produção)
- [x] **Esquema SQL** — versionado em `docs/schema.sql`
- [ ] **Backup automático** — configurar backup diário do banco (Supabase já faz, mas verificar retenção)
- [ ] **WhatsApp Business API** — substituir Baileys pela API oficial do WhatsApp Business para maior estabilidade (opcional)
- [ ] **Monitoramento** — configurar logs centralizados e alertas de erro
- [x] **Rate limiting** — implementado com `express-rate-limit` (+ `trust proxy` para funcionar atrás de proxy/reverse proxy)
- [x] **Auditoria de segurança** — validação completa com Zod, controle de acesso por perfil em todas as rotas, sanitização de erros, headers de segurança

## Licença

Projeto acadêmico — TCC Curso de Desenvolvimento de Sistemas.
