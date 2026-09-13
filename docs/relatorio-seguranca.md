# Relatório de Avaliação de Segurança — Esteticar

## Resumo Executivo

O sistema apresenta uma base de segurança razoável (queries 100% parametrizadas via query-builder do Supabase, `requireAdmin` bem distribuído nas áreas críticas, sanitização de erros 5xx e de códigos do Postgres, rate limiting global/auth/exportação, reais e segredos fora do git). A avaliação original apontou **2 achados críticos** (chave `service_role` commitada em `.env.example` e confiança em `user_metadata` do JWT) e **6 altos** (chatbot sem anti-spam, isolamento multi-tenant do WhatsApp, IDOR de agendamentos, `service_role` em todas as queries anulando RLS, enumeração de e-mail e vulnerabilidades de dependências). **Todos foram endereçados** nesta rodada de correções (detalhes no status de cada achado), restando ações fora do repositório: rotacionar a `service_role` no painel do Supabase e a evolução opcional de RLS real por tenant.

## Metodologia

Análise baseada no **código-fonte** (backend `src/` e frontend `src/`), com evidências arquivo:linha, mais `npm audit` em backend e frontend (escopo de produção, `--omit=dev`). Não foi auditada a configuração do projeto Supabase (GoTrue/RLS), pois está fora do repositório — itens dependentes dessa configuração são marcados como *suspeito* ou *informativo*. Classificação: Crítico > Alto > Médio > Baixo > Informativo.

## Achados

### CRÍTICO

#### [Crítico] Chave `service_role` real commitada em `backend/.env.example` — **Corrigido (repo)**
- **Categoria:** Segredos e configuração de ambiente
- **Status:** Corrigido no repositório — `backend/.env.example` e `frontend/.env.example` agora contêm apenas placeholders. **Ação manual pendente:** rotacionar a `service_role` no painel do Supabase (a chave antiga exposta no commit `e3bd84a` deve ser invalidada).
- **Descrição:** `backend/.env.example` está versionado e contém a chave `service_role` real do Supabase (idêntica ao `.env`), entrando no commit `e3bd84a "chore: preencher .env.example com credenciais do projeto"`. A `service_role` bypass RLS e dá acesso administrativo total ao banco. Quem tiver acesso ao repositório tem a chave mestra.
- **Evidência:** `backend/.env.example:1-2` (JWT com `role: service_role`, igual a `backend/.env:3`); commit `e3bd84a`.
- **Recomendação:** Rotacionar a chave `service_role` imediatamente no painel do Supabase, substituir os valores de `.env.example` por placeholders (`<sua-chave-service-role>`), atualizar `.env.example` do frontend com placeholders, e adicionar um arquivo `docs/credenciais.md` explicando onde obter cada chave. Considerar remover o histórico ou rotacionar como medida padrão de credencial vazada.

#### [Crítico] Autorização baseada em `user_metadata` do JWT sem conferência com a tabela `usuarios` — **Corrigido**
- **Categoria:** Autenticação e sessão / Autorização e multi-tenancy
- **Status:** Corrigido — `authenticate` agora consulta `usuarios` (`id`, `tenant_id`, `perfil`) a partir do `user.id` do token (com cache de 60s) e usa a tabela como fonte de verdade; `user_metadata` não influencia mais `req.perfil`/`req.tenantId`.
- **Descrição:** O middleware deriva `tenant_id` e `perfil` de `user.user_metadata` do token. No Supabase, `user_metadata` é editável pelo próprio usuário (`supabase.auth.updateUser({ data: ... })`). Não há revalidação de `usuario.perfil`/`usuario.tenant_id` na tabela `usuarios`. Um usuário que altere o próprio metadata para `perfil: "admin"` (ou para outro `tenant_id`) passa a ter autorização de admin e/ou escopo em outro tenant. O frontend ainda usa fonte divergente (`isAdmin` auditável vem da tabela `usuarios` via `/auth/me`, enquanto o backend decide pelo JWT).
- **Evidência:** `backend/src/middleware/auth.js:22-26` e `:38-43` (requireAdmin lê só `req.perfil` da metadata); `frontend/src/context/AuthContext.jsx:85` (`isAdmin` da tabela, inconsistente com autorização real); `frontend/src/pages/perfil.jsx:36` demonstra o uso de `supabase.auth.updateUser(...)` no cliente.
- **Recomendação:** Em cada request autenticado, consultar `usuarios` (por `auth.uid()`/`user.id`) e usar **o perfil e o tenant_id da tabela** como fonte de verdade, ignorando `user_metadata` para decisões de autorização. Como tudo usa `service_role`, basta um `select("perfil, tenant_id").eq("id", userId).maybeSingle()` no `authenticate`, guardado num `cache` curto.

### ALTO

#### [Alto] Chatbot WhatsApp sem anti-spam, sem limite por número e sem limite de tamanho de texto — **Corrigido**
- **Categoria:** Chatbot WhatsApp (Baileys)
- **Status:** Corrigido — janela de rate limit de 10 msg/30s por número com backoff e aviso ao usuário; `messageLocks` agora é utilizado de fato (lock por `remoteJid` durante o processamento); mensagens truncadas em 500 caracteres antes de persistir/responder.
- **Descrição:** O handler de mensagens não tem cooldown, blacklist, limite de volume por número nem truncamento de texto. O texto é gravado integralmente no banco. Há um `messageLocks` declarado e **nunca utilizado** (sem lock de concorrência efetivo). O único controle (`ERRO_MAXIMO = 3`) apenas sugere atendente, não bloqueia abuso.
- **Evidência:** `backend/src/chatbot/baileys.client.js:238-333` (handler sem checagens de volume; único filtro é `msg.key?.fromMe` linha 253); `backend/src/chatbot/chatbot.service.js:14` (`messageLocks` sem uso); `:66` (`ERRO_MAXIMO = 3`); `backend/src/chatbot/chatbot.session.js:141-152` (grava texto sem limite).
- **Recomendação:** Implementar janela de mensagens por número (ex.: máx. 10 msg/30s com backoff), truncar/validar comprimento (ex.: 500 chars), e remover ou usar de fato o `messageLocks`.

#### [Alto] Isolamento multi-tenant do WhatsApp quebrado por instância única global do Baileys — **Corrigido (documentado)**
- **Categoria:** Chatbot WhatsApp (Baileys) / Autorização
- **Status:** Corrigido/documentado — `startBaileys` impede iniciar conexão com outro tenant enquanto uma conexão ativa estiver em uso (erro explícito); `sendWhatsAppMessage` agora recebe `tenantId` e recusa envio se o socket global pertence a outro estabelecimento; `limparSessoesExpiradas` filtra por `tenant_id` da sessão.
- **Descrição:** O socket do Baileys é um singleton global (`socket`/`currentTenantId`). Conectar o WhatsApp de um tenant derruba o do anterior. O job `limparSessoesExpiradas` busca sessões **sem filtro de tenant** e envia mensagens via socket global, podendo mandar mensagem de um tenant usando o WhatsApp de outro (vazamento de contexto e de canal).
- **Evidência:** `backend/src/chatbot/baileys.client.js:16-17` (`let socket = null; let currentTenantId = null;`); `:91-95` (`startBaileys` derruba socket anterior); `backend/src/chatbot/chatbot.session.js:194-224` (consulta sem `.eq("tenant_id", ...)`) e `:245-248` (`sendWhatsAppMessage` global para sessão de qualquer tenant).
- **Recomendação:** Filtrar `limparSessoesExpiradas` por tenant e garantir que o envio use a sessão do tenant correto; interditar o início de uma nova conexão enquanto outra estiver ativa (ou documentar fortemente o limite de 1 tenant por instância).

#### [Alto] IDOR cross-tenant: `cliente_id`/`veiculo_id` não validados no create/update de agendamentos — **Corrigido**
- **Categoria:** Autorização e multi-tenancy
- **Status:** Corrigido — novas funções `validarClienteVeiculo` conferem `cliente_id` contra o `tenant_id` e `veiculo_id` contra `tenant_id` + `cliente_id` antes de persistir em criar/atualizar agendamentos.
- **Descrição:** Ao criar/atualizar agendamentos, apenas `servico_id` é conferido contra o tenant; `cliente_id` e `veiculo_id` vêm do body sem verificação de pertencimento. Como o `.select()` embebe os relacionamentos, a resposta devolve os dados do cliente/veículo de outro tenant (IDs inteiros, enumeráveis).
- **Evidência:** `backend/src/services/agendamentos.service.js:119-124` (valida só serviço no tenant) e `:158-172`/`:373-380` (insert/update com embed de clientes/veiculos em relação sem filtro de tenant); `backend/src/utils/validation.js:21-23` (IDs `z.number().int().positive()`).
- **Recomendação:** Validar que `cliente_id` pertence ao tenant (e `veiculo_id` ao cliente) antes de persistir; não embeder relações sem filtro de tenant.

#### [Alto] Service Role Key em todas as queries anula a RLS (defesa em profundidade ausente) — **Mitigado (curto prazo)**
- **Categoria:** Autorização e multi-tenancy
- **Status:** Mitigado — o critério central do achado (autorização derivada de `user_metadata` manipulável) foi corrigido com a fonte de verdade na tabela `usuarios`. RLS real por `tenant_id` segue como evolução futura (configuração do console Supabase, fora do escopo deste repo).
- **Descrição:** Todo acesso ao banco usa `SUPABASE_SERVICE_ROLE_KEY`, contornando qualquer RLS configurada. A única barreira multi-tenant é o filtro manual em código — qualquer query sem filtro (ou com filtro manipulável, ver achado de `user_metadata`) vaza dados entre empresas.
- **Evidência:** `backend/src/config/supabase.js:4-5` (`createClient(url, serviceKey)`).
- **Recomendação:** Considerar RLS real por `tenant_id` (via `auth.uid()` e um claim JWT customizado) para que mesmo a `service_role` (ou um erro de filtro) não exponha dados de outro tenant; ou ao menos auditar todas as queries com helper que force o filtro. Como mitigação de curto prazo, priorizar a correção do achado de `user_metadata`.

#### [Alto] Enumeração de contas via `/auth/verificar-email` e mensagens distintas no fluxo de senha — **Corrigido**
- **Categoria:** Autenticação e sessão
- **Status:** Corrigido — `verificarEmail` sempre responde `{ enviado: true }`, sem retornar `existe`; o frontend trata o fluxo de forma uniforme. O log interno registra apenas o domínio do e-mail.
- **Descrição:** `POST /api/auth/verificar-email` (público) responde `{ existe: true/false }`; a UI usa isso para diferenciar "e-mail não cadastrado" de "link enviado". O signup expõe "já existe uma conta com este e-mail". Combinado, permite confirmar cadastros (protected apenas por rate limit genérico).
- **Evidência:** `backend/src/routes/auth.routes.js:18` (rota sem auth); `backend/src/services/auth.service.js:69-77` (retorna `existe`); `frontend/src/pages/Login.jsx:62-68` (usa `existe` para mensagens distintas); `frontend/src/lib/authErrors.js:5` ("already registered").
- **Recomendação:** Responder sempre com a mesma mensagem/fluxo independente de o e-mail existir e retirar o campo `existe` do retorno da rota (ou tornar a rota exclusiva do fluxo legítimo com o mesmo path do reset no Supabase).

#### [Alto] Vulnerabilidades conhecidas em produção: `npm audit` backend (10: 4 high) e frontend (4: 1 high) — **Corrigido**
- **Categoria:** Dependências
- **Status:** Corrigido — `npm audit --omit=dev` em backend e frontend retorna **0 vulnerabilidades**; dependências com vulnerabilidades foram atualizadas/eliminadas.
- **Descrição:** Backend: `brace-expansion` (DoS), `fast-uri` (SSRF/host confusion, via deps), `js-yaml` (CPU DoS), `sharp` (libheif), `body-parser`/`qs` (DoS), `protobufjs`, `uuid`/`exceljs`. Frontend: `ws` (memory DoS/leak, versão trazida por devDependencies de build) e `@remix-run/router` (open redirect).
- **Evidência:** `npm audit --omit=dev` em `backend/` (10 vulns: 6 moderate, 4 high) e `frontend/` (4 vulns: 3 moderate, 1 high). Estouro do plano grátis do Supabase não está relacionado; são correções de dependências.
- **Recomendação:** `npm audit fix` no backend e frontend; para breaking (ex.: `exceljs` → `uuid`), avaliar o upgrade controlado. Reavaliar `sharp` e verificar se já está na versão corrigida (`>=0.35.4`).

### MÉDIO

#### [Médio] Rotas de escrita sem schema Zod que consomem `req.body` — **Corrigido**
- **Categoria:** Validação de entrada e injeção
- **Status:** Corrigido — `validateBody` aplicado nas 7 rotas: `POST /api/servicos` (`criarServico`), `POST/PUT /api/ordens-servico` (`criarOS`/`atualizarOS`), `PUT /api/financeiro/contas/:id` (`atualizarContaPagar`), `PATCH /api/financeiro/faturamentos/:id/receber` (`receberFaturamento`), `PUT /api/funcionarios/:id` (`atualizarFuncionario`), `POST /api/chatbot/sessions/:id/reply` (`enviarRespostaChatbot`, agora com limite de 1000 chars).
- **Descrição:** 23 das 41 rotas de escrita não têm `validateBody`/Zod; 7 delas consomem `req.body` sem validação de tipos/tamanhos: `POST /api/servicos`, `POST /api/ordens-servico`, `PUT /api/ordens-servico/:id`, `PUT /api/financeiro/contas/:id`, `PATCH /api/financeiro/faturamentos/:id/receber`, `PUT /api/funcionarios/:id`, `POST /api/chatbot/sessions/:id/reply` (este sem limite de tamanho e com texto indo direto ao WhatsApp/banco).
- **Evidência:** `backend/src/routes/servicos.routes.js:10`, `ordens_servico.routes.js:10,13`, `financeiro.routes.js:14,19`, `funcionarios.routes.js:12`, `chatbot/chatbot.routes.js:16`; falta de `validateBody` através dos controllers correspondentes.
- **Recomendação:** Adicionar `validateBody` com os schemas Zod para todas essas rotas (espelhando os padrões já existentes em `validateBody`).

#### [Médio] Query strings de filtro/paginação sem validação (relatórios, financeiro, agendamentos, OS) — **Corrigido**
- **Categoria:** Validação de entrada e injeção
- **Status:** Corrigido — middleware `validateQuery` com schemas por rota (`relatorios` com enum `agrupar_por`/`tipo`, `financeiro` com `pago`/páginação, `agendamentos` e `ordensServicos` com `status`/`cliente_id`/páginação); datas validadas por regex `YYYY-MM-DD`; `search` agora usa whitelist (`sanitizarPesquisa`) nos services de clientes/veículos/serviços.
- **Descrição:** `data_inicio`, `data_fim`, `status`, `pago`, `agrupar_por`, `tipo` são repassados crus do `req.query` para o Supabase e para chaves de cache (risco de cache poisoning e parâmetros com formato inesperado). Paginação usa coerção numérica, mas `search` usa blacklist incompleta.
- **Evidência:** `backend/src/controllers/relatorios.controller.js:54-61`, `agendamentos.controller.js:36-44`, `financeiro.controller.js:24-30,75-81,99-103`, `ordens_servico.controller.js:19-24`; aplicação em services (ex.: `financeiro.service.js:31-32`, `agendamentos.service.js:220-234`).
- **Recomendação:** Validar datas (formato ISO/regex), enumerar `status`/`tipo`, limitar tamanho das strings e usar apenas valores esperados na composição de chave de cache.

#### [Médio] `AppError` com status < 500 devolve `err.message` cru ao cliente — **Corrigido**
- **Categoria:** Exposição de dados e logging
- **Status:** Corrigido — o `errorHandler` loga o `err.message` interno e, para mensagens com prefixo `Erro ...` (padrão das interpolações de `error.message` do Supabase), responde mensagem genérica; `AppError` agora aceita `publicMessage` opcional para controle explícito.
- **Descrição:** Vários `AppError` interpolam `error.message` do Supabase/PostgREST, vazando detalhes internos de query/estrutura para o cliente (erros 400 padrão).
- **Evidência:** `backend/src/middleware/errorHandler.js:7-12` (`return res.status(err.statusCode).json({ error: err.message })` para <500); `backend/src/services/auth.service.js:20,35,51,86,96` e `chatbot.session.js:41,54,66,78,176,186` (interpolação `Erro ao ...: ${error.message}`).
- **Recomendação:** Em `AppError`, separar a mensagem interna (log) da mensagem exposta ao cliente; o `errorHandler` pode logar `err.message` interno e responder mensagem genérica por categoria.

#### [Médio] Logs com dados pessoais (nome completo e telefones de clientes) — **Corrigido**
- **Categoria:** Exposição de dados e logging
- **Status:** Corrigido — pino redact ampliado (`remoteJid`, `ownNumber`, `jid`, `text`, `cliente`, `nome`, `pushName`, `req.body`); logs de debug do Baileys passam a registrar apenas `textLength`; JIDs substituídos por `phoneSuffix`/`jidSuffix`; lembrete loga `clienteId` em vez do nome.
- **Descrição:** Logs registram nome completo de clientes, sufixo/telefone (JID completo em um caso). O pino só redacta `authorization`/`cookie`. Em `LOG_LEVEL=debug`, textos integrais de mensagens do WhatsApp são logados.
- **Evidência:** `backend/src/services/lembretes.service.js:95` (nome completo); `backend/src/chatbot/baileys.client.js:313,319` (sufixo do telefone); `chatbot.service.js:1662` (JID completo); `config/logger.js:18` (redact parcial); `baileys.client.js:279,282,295,302` (texto cru em debug).
- **Recomendação:** Adicionar campos sensíveis ao `redact` do pino (telefone, nome); nos pontos de debug, reduzir a `phoneSuffix`/`textLength` (como já feito em `:313`), nunca logar JID/mensagens completas.

#### [Médio] Timeout de atendimento humano é 5 min, não 30 min — **Aceito (decisão de produto)**
- **Categoria:** Chatbot WhatsApp (Baileys)
- **Status:** Aceito (decisão de produto) e **Corrigido (centralização)** — o timeout foi **mantido em 5 min** por decisão de produto (evitar que o cliente fique aguardando indefinidamente o atendente) e agora existe **uma única constante** `SESSION_TIMEOUT_MINUTES` definida em `chatbot.session.js` e importada pelo `chatbot.service.js`.
- **Descrição:** O código retorna ao menu após **5 minutos** sem resposta do atendente. Impacto funcional (recorrência para o cliente), não de segurança direta.
- **Evidência:** `backend/src/chatbot/chatbot.session.js:191` (`export const SESSION_TIMEOUT_MINUTES = 5`); `chatbot.service.js` importa a constante (removida a antiga `SESSION_TIMEOUT_MINUTOS` duplicada); README.md:52,74 (documentado como 5 min).
- **Recomendação:** (Concluída) Centralizar o valor em uma única constante — resolvido com a exportação única em `chatbot.session.js`.

#### [Médio] Funcionário pode finalizar OS e criar faturamento sem `requireAdmin` — **Aceito (decisão de produto)**
- **Categoria:** Autorização e multi-tenancy
- **Status:** Aceito (decisão de produto) — **manter**: funcionário pode finalizar OS (`status: "finalizado"`), o que gera o faturamento automaticamente (fluxo comum em oficinas/estéticas automotivas: apenas a conclusão do serviço cria o lançamento financeiro). A **consulta/edição de dados financeiros continua admin-only** (`requireAdmin` em relatórios e financeiro). Documentado no README.
- **Descrição:** `PUT /api/ordens-servico/:id` não exige admin; ao mandar `status: "finalizado"`, o service insere em `faturamentos`. É a única via em que um não-admin altera dados financeiros.
- **Evidência:** `backend/src/routes/ordens_servico.routes.js:13` (sem `requireAdmin`); `backend/src/services/ordens_servico.service.js:158-212` (insere `faturamentos`, linhas 186-202).
- **Recomendação:** Decidir a política (funcionário pode finalizar OS é comum em oficinas) e, se financeiro for admin-only, remover o insert de faturamento do fluxo do funcionário ou exigir permissão específica.

#### [Médio] Dashboard `resumo` expõe `faturamento_mes` a funcionários (inconsistente com relatórios admin-only) — **Corrigido**
- **Categoria:** Exposição de dados / Autorização
- **Status:** Corrigido — o controller remove `faturamento_mes` do payload para não-admin (cache separado por perfil) e o frontend oculta o card para funcionários.
- **Descrição:** `GET /api/dashboard/resumo` usa apenas `authenticate` e retorna faturamento mensal, enquanto relatórios/financeiro são admin-only. Se a regra é "financeiro é admin", há inconsistência de política.
- **Evidência:** `backend/src/routes/dashboard.routes.js:7-9`; `backend/src/services/dashboard.service.js:37-43,66`.
- **Recomendação:** Alinhar a política: ou liberar o valor no dashboard para funcionários (documentando), ou remover do payload quando não-admin.

#### [Médio] Credenciais do Baileys em texto plano no disco — **Corrigido**
- **Categoria:** Chatbot WhatsApp (Baileys) / Segredos
- **Status:** Corrigido — novo auth state `useEncryptedMultiFileAuthState` criptografa `creds.json` e os arquivos de sessão em repouso com **AES-256-GCM** (formato `encv1:`), usando chave derivada (SHA-256) de `BAILEYS_AUTH_PASSWORD`; sem a env, mantém compatibilidade legada e migra o estado para criptografado na primeira gravação.
- **Descrição:** `baileys_auth_<tenantId>/creds.json` guarda credenciais de sessão em texto plano no filesystem. Mitigado por estar no `.gitignore`, mas é um segredo persistido sem criptografia.
- **Evidência:** `backend/src/chatbot/baileys.client.js:83-101`; arquivo `backend/baileys_auth_*/creds.json` presente em disco; `.gitignore:3` cobre.
- **Recomendação:** Criptografar o estado de autenticação (Baileys suporta string com senha) com chave derivada de env, e garantir permissões restritas na pasta.

#### [Médio] `GET /api/ordens-servico/:id/itens` — schema Zod remove campos enviados pelo frontend — **Corrigido**
- **Categoria:** Validação de entrada e injeção
- **Status:** Corrigido — schema `adicionarItemOS` agora aceita `descricao` (máx. 200), `valor_unitario` positivo e `servico_id` opcional/nullable, alinhado ao contrato enviado pelo frontend.
- **Descrição:** O frontend envia `descricao`/`valor_unitario` para `POST /api/ordens-servico/:id/itens`, mas o Zod (que remove chaves extras) só aceita `servico_id`/`quantidade`, fazendo o fluxo sempre falhar com 400. Não é vulnerabilidade, é bug funcional de integridade — mas evidencia divergência entre contrato de API e frontend.
- **Evidência:** `backend/src/utils/validation.js:101-104`; `frontend/src/pages/ordens-servico.jsx:145-149`.
- **Recomendação:** Atualizar o schema (e a rota) para aceitar `descricao`/`valor_unitario` com validação de tamanho/valor, ou alinhar o frontend ao contrato.

### BAIXO

#### [Baixo] XSS Moodx armazenado no chat (mitigado pelo frontend em React)
- **Categoria:** Chatbot WhatsApp (Baileys) / Sanitização
- **Descrição:** Mensagens recebidas via WhatsApp são gravadas verbatim e devolvidas sem escape; o backend não tem nenhuma função de sanitização. O frontend, porém, renderiza em nós de texto React (`{m.texto}`), que escapam HTML por padrão — o risco efetivo de execução é baixo nos componentes atuais.
- **Evidência:** `backend/src/chatbot/chatbot.session.js:141-152,167-178`; `chatbot.service.js:1682` (grava verbatim); renderização segura em `frontend/src/components/ChatWidget.jsx:167` e `frontend/src/pages/whatsapp-conversa-detalhe.jsx:154`.
- **Recomendação:** Não renderizar essas strings via `dangerouslySetInnerHTML` (mantendo o padrão atual) e considerar um limite de tamanho no `registrarMensagem`.

#### [Baixo] `console.error` no frontend com objetos de erro completos — **Corrigido**
- **Categoria:** Exposição de dados e logging
- **Status:** Corrigido — todos os `console.error` passam a logar `err.message`.
- **Descrição:** Vários `console.error` logam o objeto `err` inteiro (que pode carregar corpo de resposta com nomes/telefones) no console do navegador.
- **Evidência:** `frontend/src/components/NotificacaoBell.jsx:26,123`; `AuthContext.jsx:32`; `AppLayout.jsx:174`; `Dashboard.jsx:23`; `financeiro.jsx:29`; `financeiro-faturamentos.jsx:34`; `financeiro-contas.jsx:39`.
- **Recomendação:** Usar apenas `err.message` e tratar falhas silenciosamente em polling (padrão já adotado em vários pontos).

#### [Baixo] Exportações: `Content-Disposition` com `filtros.tipo` não validado e ausência de sanitização de células (Excel formula injection) — **Corrigido**
- **Categoria:** Validação de entrada e injeção
- **Status:** Corrigido — `tipo` validado por whitelist (`validateQuery("relatorios")`) antes do `Content-Disposition`; células do Excel com prefixos `= + - @` são neutralizadas com aspas via `sanitizarCelula` (PDF renderiza como texto, sem risco de injeção).
- **Descrição:** O sufixo do filename vem de `filtros.tipo` antes da normalização; strings do banco vão direto para PDF/Excel sem stripping de prefixos `= + - @` (probabilidade de exploração baixa no ExcelJS, pois grava como string).
- **Evidência:** `backend/src/controllers/relatorios.controller.js:63-81`; `services/relatorios-export.service.js:287-291` (PDF) e `:105-171` (Excel).
- **Recomendação:** Whitelist do `tipo` antes do `Content-Disposition` e sanitização de valores que comecem com `=`, `+`, `-`, `@`.

#### [Baixo] Token em `sessionStorage` e flag em `localStorage`
- **Categoria:** Autenticação e sessão
- **Descrição:** Access token em `sessionStorage` (adaptador custom) e `flowType: "implicit"` (token já materializado na URL ao voltar de magic link) — expostos a XSS que execute no mesmo origin. Sem XSS encontrado no código, o risco efetivo é condicionado a futuras falhas de renderização.
- **Evidência:** `frontend/src/lib/supabase.js:14-27`; `services/api.js:16,43`; `pages/redefinir-senha.jsx:75` (flag `esteticar-senha-redefinida`).
- **Recomendação:** Manter o padrão (nunca `dangerouslySetInnerHTML`) e considerar cookies `httpOnly/secure` + `pkce` como evolução.

#### [Baixo] `.env.example` do frontend com anon key real e Swagger público fora de produção
- **Categoria:** Segredos / Configuração de API e transporte
- **Descrição:** A anon key (pública por design, mas real) está no `.env.example` commitado. O Swagger fica habilitado em qualquer ambiente que não seja `production`.
- **Evidência:** `frontend/.env.example:1-2`; `backend/src/app.js:20-22`; `config/env.js:18` (default `production` — mitiga se `NODE_ENV` não for setada errado no deploy).
- **Recomendação:** Substituir por placeholders e garantir `NODE_ENV=production` no deploy.

### INFORMATIVO

- **Queries sem filtro de `tenant_id` são internas (jobs/schedulers), não acionáveis por HTTP** — manter sob revisão: `notificacoes.service.js:7-21`, `alertas.service.js:31-36`, `comunicados.service.js:74-78`, `chatbot.session.js:58-68,180-187`. (`backend/src/controllers/*.controller.js` sempre passam `req.tenantId`.)
- **Reset de senha delegado 100% ao Supabase** — expiração/uso único do link são configurados no console; não auditáveis no código.
- **`requireAdmin` bem aplicado** nas áreas críticas (relatórios, config-empresa, financeiro, funcionários, expediente, datas-bloqueadas, comunicados, chatbot, delete de OS) — ver `relatorios.routes.js:7`, `financeiro.routes.js:10-19`, `ordens_servico.routes.js:14,17`.
- **Sem SQL cru em todo o backend** — 100% query-builder parametrizado; o único `.rpc()` é o `contar_nao_lidas` (parametrizado).
- **Error handler sanitiza 5xx/Postgres** (`errorHandler.js:8-28`) e **não há logs de senha/token JWT**.
- **`service_role` nunca chega ao frontend** (grep em `frontend/src` por `service_role` = 0); anon key no bundle é comportamento normal de Vite.
- **`rate limiting` global (300/15min), auth (10/15min), exportação (10/15min), comunicados (10/h) ativos; `trust proxy=1` correto para 1 proxy** — confiar que o deploy fique atrás de proxy (senão o rate limit pode ser contornado por `X-Forwarded-For`).
- **`CORS_ORIGIN` não consta do `.env.example`** — default é `http://localhost:5173`; definir explicitamente no deploy para não bloquear (ou não usar `*`).
- **Higiene do repo (corrigido):** `frontend/coverage/.tmp/*` removidos do versionamento (o `.gitignore` raiz já continha `coverage/`, mas os 23 arquivos tinham sido adicionados antes — agora untracked), e `backend/scripts/check-users.mjs` mascara e-mails e nomes na saída (`maskEmail`/`maskNome`).

## Pontos Positivos

- Autenticação via GoTrue/JWT com `requireAdmin` nas rotas administrativas; nenhum bypass por roteamento encontrado.
- Zero SQL cru: todas as consultas parametrizadas via Supabase query-builder (PostgREST).
- `service_role` restrita ao backend; `.env` reais e `baileys_auth_*`/`creds.json` fora do versionamento.
- Error handler converte erros 5xx/Postgres em mensagens genéricas; nenhum log de senha/token.
- Rate limiting em várias frentes + `express.json({ limit: "1mb" })` + helmet padrão + CORS restrito a origem única.
- Rota de exportação/relatórios protegida por admin; isolamento multi-tenant presente em todos os endpoints HTTP.

## Conclusão

Todos os achados **Críticos e Altos** foram corrigidos nesta rodada (autorização via `usuarios`, anti-spam/truncamento no chatbot, isolamento multi-tenant do WhatsApp, IDOR de agendamentos, enumeração de e-mail, `npm audit` limpo). Restam itens **Médios** já tratados (Zod nas rotas de escrita, query strings, sanitização de erros e logs, dashboard admin-only, itens de OS, credenciais do Baileys criptografadas), decisões de política registradas (timeout de 5 min mantido; funcionário pode finalizar OS), e **ações manuais**:

1. **Rotacionar a chave `service_role` vazada** no painel do Supabase (a chave antiga exposta no commit `e3bd84a` deve ser invalidada) (Crítico).
2. Definir `BAILEYS_AUTH_PASSWORD` no ambiente de produção para ativar a criptografia das credenciais do WhatsApp em repouso (Médio).
3. Evolução opcional: RLS real por `tenant_id` no console do Supabase, como defesa em profundidade além dos filtros em código (Alto/Mitigado).

Com esses pontos endereçados, o sistema fica em um nível de segurança adequado para uso real de um TCC/pequena empresa; o mais urgente é a rotação da `service_role`.