# Relatório de Implementações Recentes — Esteticar

> Período: 23/08/2026 a 13/09/2026 (branch `novo-backend`)
> Sistema de gestão para estética automotiva com chatbot integrado ao WhatsApp.

---

## 1. Visão geral do que foi entregue

Nos últimos commits, o projeto evoluiu principalmente em **4 frentes**:

| Frente | Destaque |
|--------|----------|
| **Chatbot WhatsApp** | Sessões inteligentes (recuperação/expiração), anti-spam, atendimento humano com timeout, credenciais criptografadas |
| **Segurança** | Auditoria completa com 2 críticos e 6 altos corrigidos (autorização, validação Zod, logs, dependências) |
| **Performance** | Índices no Supabase, cache em memória, função RPC para contagem de não lidas, polling otimizado |
| **Frontend** | Redesign de relatórios, widget/fluxo de conversas WhatsApp, skeleton loading, responsividade global |

Ao final: **596 testes automatizados** (Vitest) rodando com 0 falhas (319 backend + 277 frontend).

---

## 2. Chatbot WhatsApp (núcleo do projeto)

### 2.1 Sessão expirada é **reutilizada**, não recriada
- `backend/src/chatbot/chatbot.service.js:1719-1737`
- Enquanto o vídeo mostra: quando uma sessão expira por inatividade, em vez de desativar e mandar mensagem de "encerrado", o bot **reaproveita a mesma sessão**, volta o estado para `MENU_PRINCIPAL` e limpa `state_data`. Zero recriação, zero perda do histórico do cliente.
- **Ponto interessante:** se o cliente está com atendente e o atendente **já respondeu**, a sessão NÃO expira (`atendenteEngajado` mantém `ultima_atividade` atualizada).

### 2.2 Timeout diferenciado para fluxo vs atendimento humano
- `backend/src/chatbot/chatbot.session.js:256-333`
- `SESSION_TIMEOUT_MINUTES = 5` para fluxos comuns; `ATENDENTE_TIMEOUT_MINUTES = 10` para humanos.
- `limparSessoesExpiradas`:
  - fluxo expirado → volta ao menu silenciosamente;
  - `FALANDO_COM_ATENDENTE` expirado → só volta ao menu se o atendente **não respondeu** (senão mantém o atendimento), e envia aviso ao cliente.
- **Fala para professor:** "Regra de negócio de recorrência: o cliente nunca fica preso esperando atendente; se o atendente não respondeu, o bot reassume."

### 2.3 Anti-spam com janela deslizante + lock de concorrência
- `backend/src/chatbot/chatbot.service.js:14-54` e `1688-1709`
- Máx. **10 mensagens/30s** por número (`isRateLimited`), com aviso único (`avisarRateLimit`) para não floodar o cliente.
- `messageLocks` por JID: mensagem é ignorada se um processamento anterior ainda está em andamento (evita resposta duplicada/concorrente).
- Texto truncado em **500 caracteres** antes de persistir/responder (`MAX_MENSAGEM_LENGTH`).

### 2.4 Credenciais do WhatsApp criptografadas em repouso
- `backend/src/chatbot/encrypted-auth-state.js`
- Implementa `useEncryptedMultiFileAuthState` (interface do Baileys) que grava `creds.json` e arquivos de sessão com **AES-256-GCM** (formato `encv1:`), IV aleatório de 12 bytes + tag de autenticação.
- Chave derivada via SHA-256 de `BAILEYS_AUTH_PASSWORD`; mutex por arquivo evita corrupção por escrita concorrente.
- **Fala para professor:** "O estado de autenticação do WhatsApp é um segredo; daí criptografá-lo em disco — mesmo que a pasta vaze, as credenciais estão cifradas."

### 2.5 Atendimento humano com retorno ao bot
- O cliente que pede atendente recebe botões "Voltar ao bot" / "Continuar com atendente"; keywords (`menu`, `0`, `voltar`) devolvem o controle ao bot a qualquer momento.
- Widget de conversas fixo (`ChatWidget.jsx`) + painel de conversas com polling (filtros por ordem, estado e busca em `frontend/src/pages/whatsapp-conversas.jsx`).
- Proteção: se o WhatsApp **não está conectado**, o backend bloqueia a listagem (guard) e o frontend mostra CTA de conexão (commit `3d3ad9c`, `whatsapp-conversas.jsx:58-70`).

---

## 3. Segurança (auditoria completa)

Relatório completo: `docs/relatorio-seguranca.md`. Todos os **2 críticos e 6 altos** resolvidos.

### 3.1 Autorização com fonte de verdade na tabela (crítico)
- `backend/src/middleware/auth.js:21-59`
- Antes: `perfil`/`tenant_id` vinham de `user_metadata` do JWT — **editável pelo próprio usuário** no Supabase.
- Agora: `authenticate` consulta a tabela `usuarios` (`perfil`, `tenant_id`) usando o `user.id` do token, com cache de 60s (`AUTH_PROFILE_TTL`). A metadata do JWT não decide mais autorização.
- **Fala para professor:** "Chatice clássica do Supabase: `user_metadata` é manipulável. A correção foi tratar a tabela `usuarios` como fonte de verdade autoritativa."

### 3.2 Validação Zod nas rotas de escrita e query strings
- `backend/src/utils/validation.js` (+72 linhas) e `backend/src/middleware/validate.js`
- `validateBody` aplicado em 7 rotas que consumiam `req.body` cru;
- `validateQuery` com schemas por rota (relatórios, financeiro, agendamentos, OS) — enum de status/tipo, datas com regex `YYYY-MM-DD`, paginação tipada, evitando cache poisoning e parâmetros inesperados.

### 3.3 Sanitização de erros e logs sem PII
- `errorHandler` responde mensagem genérica para erros internos/Postgres e loga detalhes internos; `AppError` ganhou `publicMessage`.
- Pino com `redact` ampliado (JIDs, telefones, nomes); logs do Baileys usam `phoneSuffix`/`textLength` em vez de texto cru.

### 3.4 Outros
- **Anti-spam do chatbot** (seção 2.3) — achado Alto corrigido.
- **IDOR cross-tenant**: `validarClienteVeiculo` confere `cliente_id` contra o tenant e `veiculo_id` contra cliente+tenant em agendamentos (`agendamentos.service.js`).
- **Enumeração de e-mail**: `/auth/verificar-email` sempre responde `{ enviado: true }`.
- **npm audit**: backend e frontend com **0 vulnerabilidades** em produção.
- Rate limiting em camadas (global, auth, exportação, comunicados).

---

## 4. Performance (E/S e polling)

### 4.1 Índices + RPC no banco
- `docs/migration-otimizacao-io.sql`
- 14 índices para relatórios/dashboard/lembretes/chatbot (ex.: `idx_agendamentos_tenant_status_data`, `idx_chatbot_mensagem_tenant_session`).
- Função `contar_nao_lidas(p_tenant UUID)` substitui a consulta **N+1** (2 queries por sessão ativa) por uma única chamada RPC parametrizada.

### 4.2 Cache e polling otimizado
- `cacheGetOrSet` reutilizado em perfil de usuário, nome da empresa, catálogo de serviços, dashboard.
- QR Code do WhatsApp com poll de 1s + burst pós-conexão (commit `49468e6`); contador de não lidas via RPC com polling eficiente.

---

## 5. Frontend

- **Relatórios redesenhados** (`relatorios.jsx`, `RelatorioBase.jsx`, gráficos `relatorios-*.jsx`): visão geral que agrega os 4 tipos (agendamentos, serviços, financeiro, clientes), exportação PDF/Excel **respeitando a tela de origem**, estado vazio amigável (`EmptyRelatorio.jsx`).
- **Fluxo de conversas WhatsApp** completo: lista com ordenação/busca/filtro por estado, detalhe com histórico, resposta manual do atendente e reinício.
- **Skeleton loading** em telas de listagem (commit `77e1cce`).
- **Recuperação de senha** por e-mail (magic link) + redefinição manual pelo admin, com validação de e-mail antes do envio.
- **Responsividade global** até 768px — tabelas viram cards (`data-label`), grids colapsam.

---

## 6. Pontos interessantes para destacar no vídeo (checklist rápido)

1. **Arquitetura do chatbot** — Baileys embutido no backend, máquina de estados no WhatsApp, persistência em `chatbot_session`/`chatbot_mensagem`.
2. **Regra de "não assombrar o cliente"** — timeout inteligente que reutiliza a sessão em vez de recriar (2.1/2.2).
3. **Segurança de verdade em TCC** — autorização pela tabela (3.1), Zod (3.2), criptografia de credenciais (2.4), audit limpo (3.4).
4. **N+1 resolvido com RPC** (4.1).
5. **596 testes automatizados** cobrindo serviço e UI — rodar `npm test` durante a gravação é um ótimo momento de vídeo.

---

## 7. Roteiro sugerido para a gravação

> Sugestão de sequência (duração total ~10-15 min). Sempre aponte o código na tela e cite o arquivo.

1. **Contexto (1 min)** — O que é o sistema, stack (React + Express + Supabase + Baileys) e dizer que o foco da entrega recente foi robustez: chatbot, segurança e performance.
2. **BACKEND — Chatbot (4 min)**
   - Mostre `chatbot.service.js` e o fluxo `processMessageInterno` (machine de estados: saudações, agendamento, cancelamento, atendente).
   - Destaque a reutilização de sessão expirada (2.1) e o handler de expiração em `chatbot.session.js` (2.2).
   - Mostre o anti-spam (janela de 10 msg/30s) e o lock de concorrência (2.3).
   - Abra `encrypted-auth-state.js` e explique AES-256-GCM nas credenciais (2.4).
3. **SEGURANÇA (3 min)**
   - `middleware/auth.js`: autorização pela tabela `usuarios` com cache (3.1).
   - `utils/validation.js` + `middleware/validate.js`: Zod nas rotas de escrita e query (3.2).
   - Cite o relatório `docs/relatorio-seguranca.md` e que `npm audit` está zerado.
4. **PERFORMANCE (2 min)**
   - `docs/migration-otimizacao-io.sql`: índices e a função `contar_nao_lidas` eliminando N+1 (4.1).
   - Cache em memória via `cacheGetOrSet`.
5. **CONTINUIDADE NO FRONT (3 min)** — opcional, se quiser mostrar produto
   - Painel de conversas WhatsApp + widget flutuante; relatórios com exportação por tela; responsividade mobile.
6. **ENCERRAMENTO (1 min)**
   - Rode `npm test` (backend e frontend) e mostre 596 testes passando.
   - Feche com as frentes pendentes/evolução futura (RLS real por tenant, rotação da `service_role`).

---

## 8. Comandos úteis para a gravação

```bash
# Backend (pasta backend)
npm test              # vitest — 319 testes

# Frontend (pasta frontend)
npm test              # vitest — 277 testes

# Segurança de dependências
npm audit --omit=dev  # 0 vulnerabilidades (backend e frontend)

# Histórico recente
git log --oneline -20
```