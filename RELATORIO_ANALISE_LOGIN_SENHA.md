# Relatório — Análise do Login e Requisitos de Senha

**Projeto:** EstetiCar — Sistema de Gestão para Estética Automotiva
**Data:** 08/09/2026
**Escopo:** Autenticação de usuário (login) e regras de validação de senha

---

## 1. Análise do projeto

| Camada       | Tecnologia                       |
| ------------ | -------------------------------- |
| Frontend     | ReactJS + Vite (`frontend/`)     |
| Backend      | Node.js + ExpressJS (`backend/`) |
| Banco        | PostgreSQL (Supabase)            |
| Autenticação | Supabase Auth (JWT)              |

O fluxo de login está dividido em duas partes:

1. **Frontend** — coleta e-mail/senha na página `Login.jsx`, chama a função de autenticação do context e, em caso de sucesso, redireciona para o dashboard.
2. **Backend** — agenda, perfis e multi-tenant derivados do token JWT, com schemas Zod de validação de entrada.

---

## 2. Função responsável pela autenticação do usuário

A função que efetivamente autentica o usuário é:

```
frontend/src/context/AuthContext.jsx — função signIn (linhas 52–61)
```

```js
const signIn = async ({ email, senha }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) throw error;

  return data;
};
```

**Fluxo de chamada:**

1. `frontend/src/pages/Login.jsx:47` — `handleSubmit` chama `signIn(form)`.
2. `signIn` (em `AuthContext.jsx`) delega para `supabase.auth.signInWithPassword` do **Supabase Auth**.
3. Sucesso → `navigate(redirectTo)` (Dashboard).
4. Falha → `traduzirErroAuth(err)` exibe mensagem traduzida.

**Suporte relacionado:**

- `frontend/src/context/useAuth.js` — hook que expõe o context.
- `frontend/src/context/AuthContextStore.js` — `createContext`.
- `frontend/src/services/auth.service.js` — `signup`, `me`, `verificarEmail` (via `apiFetch`).
- `frontend/src/lib/authErrors.js` — tradução de erros do Supabase.
- `backend/src/utils/validation.js:71-74` — schema Zod do backend que aceita `senha` com **mínimo 8 caracteres** (login e criação de conta).

---

## 3. O que entendi

- A **autenticação** em si é feita pelo Supabase Auth; no frontend o ponto central é a função **`signIn`** em `AuthContext.jsx`.
- Hoje, **as credenciais (email/senha) são apenas repassadas ao Supabase** no login — o frontend não valida a força da senha no ato do login.
- As regras de senha são aplicadas (de forma **incompleta**) na **criação/alteração** de senha.

## 4. Requisitos de senha e estado atual

| Requisito                            | Estado atual no código                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mínimo 8 caracteres                  | ![parcialmente] Implementado em `Cadastro.jsx:42`, `redefinir-senha.jsx:60`, `funcionarios.jsx:123`, `perfil.jsx:19` e no backend (`validation.js`) |
| Pelo menos uma letra **maiúscula**   | ![faltando] **Não** validado em nenhum lugar                                                                                                        |
| Pelo menos um **número**             | ![faltando] **Não** validado em nenhum lugar                                                                                                        |
| Pelo menos um **caractere especial** | ![faltando] **Não** validado em nenhum lugar                                                                                                        |

> Regras sugeridas — formato: `Mínimo 8 caracteres · Pelo menos uma letra maiúscula · Pelo menos um número · Pelo menos um caractere especial`

## 5. Casos de teste propostos (testes automatizados)

Conforme solicitado, **não foram feitas alterações de código** — os casos abaixo documentam os testes que poderiam validar os requisitos (ex.: via Vitest, padrão já usado em `frontend/src/__tests__/`).

### 5.1 Senha válida

| #   | Entrada     | Resultado esperado                             |
| --- | ----------- | ---------------------------------------------- |
| 1   | `Senha123!` | aceita (8+ chars, maiúscula, número, especial) |
| 2   | `Abcdef1!`  | aceita (exatamente 8 caracteres)               |

### 5.2 Mínimo de 8 caracteres

| #   | Entrada                      | Resultado esperado                                  |
| --- | ---------------------------- | --------------------------------------------------- |
| 3   | `Ab1!abc` (7)                | rejeita → must conter a regra "mínimo 8 caracteres" |
| 4   | vazia / `undefined` / `null` | rejeita                                             |

### 5.3 Pelo menos uma letra maiúscula

| #   | Entrada    | Resultado esperado             |
| --- | ---------- | ------------------------------ |
| 5   | `abcdef1!` | rejeita → "#2 letra maiúscula" |

### 5.4 Pelo menos um número

| #   | Entrada     | Resultado esperado    |
| --- | ----------- | --------------------- |
| 6   | `Abcdefgh!` | rejeita → "#3 número" |

### 5.5 Pelo menos um caractere especial

| #   | Entrada    | Resultado esperado                |
| --- | ---------- | --------------------------------- |
| 7   | `Abcdefg1` | rejeita → "#4 caractere especial" |

### 5.6 Múltiplas falhas

| #   | Entrada | Resultado esperado                    |
| --- | ------- | ------------------------------------- |
| 8   | `abc`   | rejeita → todos os 4 erros acumulados |

---

## 6. Status da execução

| Etapa                                         | Status                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| Identificação da função de autenticação       | Concluída (`signIn` em `AuthContext.jsx`)                                   |
| Auditoria do estado atual das regras          | Concluída (apenas mín. 8 caracteres implementado)                           |
| Escrita dos testes automatizados              | Pendente — exige alteração de código (autorizada apenas a geração de `.md`) |
| Execução dos testes e relatório de resultados | Pendente — segue a autorização de código                                    |

> O objetivo deste relatório é servir de documentação e plano de ação para implementar e testar os requisitos de senha sem alterar o projeto.
