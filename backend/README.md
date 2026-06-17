# 🚗 EstéticaPro — Arquitetura do Projeto

## 1. Análise do Projeto Atual

```
esteticar/
├── frontend/                  # React + Vite (cliente)
│   ├── src/
│   │   ├── lib/supabase.js    # ✅ Cliente Supabase (auth + queries diretas)
│   │   ├── context/           # ✅ Contexto de autenticação
│   │   ├── components/        # Componentes compartilhados
│   │   ├── pages/             # Páginas da aplicação
│   │   └── styles/            # Estilos globais
│   └── .env                   # Credenciais do Supabase
├── backend/                   # 📦 VAZIO — será seu backend próprio
└── package.json
```

**Como está hoje:**
- O frontend chama o Supabase **diretamente** (`supabase.from("usuarios").select(...)`)
- O Supabase faz **autenticação E banco de dados**
- Não há backend próprio — toda regra de negócio está no frontend

**O que você quer:**
- Manter Supabase apenas para **autenticação** (login, cadastro, gerenciamento de sessão)
- Manter Supabase como **banco de dados** (as tabelas continuam lá)
- Criar seu **próprio backend** (API) que vai:
  - Receber requisições do frontend
  - Validar permissões
  - Executar regras de negócio
  - Consultar/escrever no banco Supabase usando o **Service Role Key** (pula RLS)

---

## 2. Arquitetura Final

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│                                                              │
│  Login/Cadastro  ──►  Supabase Auth (direto)                 │
│  Demais dados    ──►  Seu Backend (fetch /api/...)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SEU BACKEND (Node/Express)                 │
│                                                              │
│  1. Recebe requisição                                        │
│  2. Valida token JWT (do Supabase)                           │
│  3. Aplica regras de negócio                                │
│  4. Chama Supabase com service_role_key                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE (Auth + DB)                      │
│                                                              │
│  Auth:    Login, signup, refresh token, logout               │
│  DB:      Tabelas: tenants, usuarios, clientes, serviços... │
└─────────────────────────────────────────────────────────────┘
```

### Por que essa divisão?

| O que | Quem faz | Motivo |
|-------|----------|--------|
| **Autenticação** | Supabase Auth (direto do frontend) | Seguro com PKCE, não precisa reinventar |
| **Sessão / Token** | Supabase Auth | Já gerencia refresh, persistência |
| **Regras de negócio** | Seu Backend | Validações complexas, cálculos, notificações |
| **Banco de dados** | Supabase (via backend) | Você gerencia as tabelas, mas só o backend escreve |
| **Autorização (RBAC)** | Seu Backend | Admin vs funcionário, permissões granulares |

---

## 3. Estrutura de Pastas Recomendada

```
esteticar/
├── frontend/                          # React + Vite
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.js            # 🟢 APENAS auth (NÃO faz mais query direta)
│   │   ├── context/
│   │   │   ├── AuthContextStore.js     # createContext
│   │   │   ├── AuthContext.jsx         # Provider com signIn, signUp, signOut
│   │   │   └── useAuth.js             # Hook useContext
│   │   ├── hooks/                     # Hooks customizados
│   │   │   └── useApi.js              # Hook para chamar seu backend
│   │   ├── services/                  # 📦 Chamadas para sua API
│   │   │   ├── api.js                 # Instância axios/fetch base
│   │   │   ├── dashboard.service.js   # GET /api/dashboard/stats
│   │   │   ├── funcionarios.service.js# CRUD /api/funcionarios
│   │   │   └── clientes.service.js    # CRUD /api/clientes
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   └── .env                           # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
│
├── backend/                           # 🆕 Seu backend próprio
│   ├── src/
│   │   ├── index.js                   # Entry point (Express/Fastify)
│   │   ├── config/
│   │   │   ├── env.js                 # Variáveis de ambiente
│   │   │   └── supabase.js            # Cliente Supabase com service_role
│   │   ├── middleware/
│   │   │   ├── auth.js                # Valida token JWT do Supabase
│   │   │   └── tenant.js              # Extrai tenant_id do usuário
│   │   ├── routes/
│   │   │   ├── index.js               # Agrupador de rotas
│   │   │   ├── dashboard.routes.js
│   │   │   ├── funcionarios.routes.js
│   │   │   └── clientes.routes.js
│   │   ├── controllers/
│   │   │   ├── dashboard.controller.js
│   │   │   ├── funcionarios.controller.js
│   │   │   └── clientes.controller.js
│   │   ├── services/                  # 📦 Regras de negócio
│   │   │   ├── funcionario.service.js
│   │   │   └── cliente.service.js
│   │   └── utils/
│   │       └── errors.js              # Tratamento de erros padronizado
│   ├── .env                           # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
│   └── package.json
│
└── package.json                       # (opcional) scripts raiz
```

---

## 4. Passo a Passo da Migração

### 4.1. Backend — Configuração Inicial

```bash
cd backend
npm init -y
npm install express cors helmet dotenv @supabase/supabase-js jsonwebtoken
npm install -D nodemon
```

### 4.2. `backend/.env`

```env
PORT=3001
SUPABASE_URL=https://hgbucbocvktcojmrcbxn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
SUPABASE_JWT_SECRET=sua_jwt_secret_aqui
```

> **Onde Pegar:**
> - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → `service_role` key
> - `SUPABASE_JWT_SECRET`: Supabase Dashboard → Settings → API → JWT Settings → `JWT Secret`

### 4.3. `backend/src/config/supabase.js`

```js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
```

### 4.4. `backend/src/config/env.js`

```js
import "dotenv/config";

export const env = {
  port: process.env.PORT ?? 3001,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
};
```

### 4.5. Middleware de Autenticação

```js
// backend/src/middleware/auth.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Token não fornecido" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.supabaseJwtSecret, {
      algorithms: ["HS256"],
    });
    req.user = decoded; // { sub, email, user_metadata, ... }
    req.tenantId = decoded.user_metadata?.tenant_id;
    req.perfil = decoded.user_metadata?.perfil;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
```

### 4.6. Exemplo de Controller

```js
// backend/src/controllers/funcionarios.controller.js
import { supabaseAdmin } from "../config/supabase.js";

export async function listarFuncionarios(req, res) {
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select("*")
    .eq("tenant_id", req.tenantId);

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
}

export async function criarFuncionario(req, res) {
  const { nome, email, senha, perfil } = req.body;

  // 1. Cria usuário no Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      nome,
      tenant_id: req.tenantId,
      perfil: perfil ?? "funcionario",
    },
  });

  if (authError) return res.status(400).json({ error: authError.message });

  // 2. Já foi criado na tabela usuarios pelo trigger? Se não:
  const { error: insertError } = await supabaseAdmin
    .from("usuarios")
    .upsert({
      id: authData.user.id,
      nome,
      email,
      tenant_id: req.tenantId,
      perfil: perfil ?? "funcionario",
    });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return res.status(400).json({ error: insertError.message });
  }

  return res.status(201).json({ ok: true, user: authData.user });
}
```

---

## 5. Mudanças no Frontend

### 5.1. `frontend/src/lib/supabase.js` — CONTINUA IGUAL

O cliente do Supabase no frontend **continua exatamente como está**. Ele só será usado para:
- `supabase.auth.signInWithPassword()`
- `supabase.auth.signUp()`
- `supabase.auth.signOut()`
- `supabase.auth.onAuthStateChange()`

### 5.2. Criar `frontend/src/services/api.js`

```js
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function apiFetch(path, options = {}) {
  const session = (await import("../lib/supabase")).supabase.auth.getSession();
  const { data: { session: sess } } = await session;

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(sess?.access_token && { Authorization: `Bearer ${sess.access_token}` }),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Erro de requisição");
  }

  return res.json();
}
```

### 5.3. Criar `frontend/src/services/funcionarios.service.js`

```js
import { apiFetch } from "./api";

export const funcionariosService = {
  listar: () => apiFetch("/api/funcionarios"),
  criar: (data) =>
    apiFetch("/api/funcionarios", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
```

### 5.4. Modificar `frontend/src/pages/funcionarios.jsx`

**ANTES** (chamava Supabase direto):
```js
const { data, error } = await supabase.functions.invoke("criar-funcionario", { ... });
```

**DEPOIS** (chama seu backend):
```js
import { funcionariosService } from "../services/funcionarios.service";

// no handleSubmit:
await funcionariosService.criar({ nome, email, senha, perfil });
```

---

## 6. Boas Práticas

### 🔐 Service Role Key
- **NUNCA** exponha a `service_role_key` no frontend
- Ela **bypassa** todas as RLS policies
- Use apenas no backend, em variável de ambiente
- O backend **nunca** deve expor endpoints que deixem o service role vazar

### 🔑 Validação de Token
- Todo endpoint protegido deve validar o JWT
- Use o `SUPABASE_JWT_SECRET` para verificar a assinatura
- Confira `user_metadata.tenant_id` para isolar dados por tenant
- Confira `user_metadata.perfil` para autorização (admin vs funcionário)

### 📁 Separação de Responsabilidades
```
Routes       →  roteamento (define os endpoints)
Controllers  →  pega dados da req, chama service, retorna res
Services     →  regras de negócio, chamadas ao banco
Middleware   →  autenticação, autorização, validação
```

### ⚡ Tratamento de Erros
```js
// backend/src/utils/errors.js
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// middleware de erro global
export function errorHandler(err, req, res, next) {
  const status = err.statusCode ?? 500;
  res.status(status).json({
    error: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
```

### 🔄 Session Token
O frontend envia o `access_token` do Supabase em todo request. Esse token expira em 1h. O Supabase SDK já faz refresh automático. No seu backend, você não precisa se preocupar com refresh — o frontend sempre envia o token válido.

### 📦 Dependências Sugeridas

**Backend:**
| Pacote | Para quê |
|--------|----------|
| `express` | Servidor HTTP |
| `cors` | Liberar requisições do frontend |
| `helmet` | Segurança (headers) |
| `dotenv` | Variáveis de ambiente |
| `@supabase/supabase-js` | Cliente Supabase (service role) |
| `jsonwebtoken` | Validar JWT manualmente |
| `zod` | Validar payload de entrada |
| `express-async-errors` | Capturar erros em async handlers |

**Frontend (já tem):**
| Pacote | Para quê |
|--------|----------|
| `@supabase/supabase-js` | Cliente Supabase (auth apenas) |
| `react-router-dom` | Roteamento |
| `axios` (ou fetch nativo) | Chamar seu backend |

---

## 7. Exemplo Completo de Endpoint

### `GET /api/dashboard/stats`

**Controller:**
```js
export async function dashboardStats(req, res) {
  const tenantId = req.tenantId;

  const { count: agendamentosHoje } = await supabaseAdmin
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("data", new Date().toISOString().split("T")[0]);

  const { count: totalClientes } = await supabaseAdmin
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  // ... mais queries

  res.json({
    agendamentosHoje,
    totalClientes,
    // ...
  });
}
```

**No frontend (`dashboard.service.js`):**
```js
export const dashboardService = {
  stats: () => apiFetch("/api/dashboard/stats"),
};
```

---

## 8. Checklist da Migração

- [ ] Criar estrutura de pastas do backend
- [ ] Configurar Express + middleware (cors, helmet, json)
- [ ] Pegar `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_JWT_SECRET` no Dashboard
- [ ] Criar middleware de autenticação JWT
- [ ] Mover `criar-funcionario` para backend (remover Edge Function)
- [ ] Criar `services/api.js` no frontend
- [ ] Substituir chamadas diretas ao Supabase por chamadas à sua API
- [ ] Adicionar `VITE_API_URL` no `.env` do frontend
- [ ] Remover RLS policies das tabelas (opcional, já que o backend usa service_role)
- [ ] Testar fluxo completo: login → chamar API → retornar dados

---

## 9. Considerações Finais

### Por que manter o Supabase Auth no frontend?
- O fluxo PKCE é complexo de implementar manualmente
- O SDK já gerencia refresh de token, persistência, callbacks
- É a parte mais segura do Supabase — não há service role envolvida

### Por que criar um backend próprio?
- Regras de negócio complexas ficam mais fáceis de testar e manter
- Você pode adicionar validações que o RLS não suporta bem
- Performance: queries mais eficientes, cache, agregações
- Integrações futuras: envio de e-mail, pagamentos, relatórios

### E se eu quiser usar RLS ainda?
Você pode! Basta usar o `anon key` no backend em vez do `service_role key`. Mas aí você perde o principal benefício: controle total sem depender de políticas do Supabase. A escolha é sua.

---

> **Resumo:** Supabase Auth no frontend (com `anon key`), Supabase DB acessado via backend (com `service_role key`). O frontend envia o JWT, o backend valida, aplica regras e devolve os dados. Simples, seguro e escalável.
