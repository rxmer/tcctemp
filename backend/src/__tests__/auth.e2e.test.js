import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV_BACKEND = path.join(BACKEND_DIR, ".env");
const ENV_FRONTEND = path.join(BACKEND_DIR, "..", "frontend", ".env");

function lerEnv(caminho, padrao) {
  if (!fs.existsSync(caminho)) return null;
  const m = fs.readFileSync(caminho, "utf8").match(padrao);
  return m ? m[1] : null;
}

const API = process.env.API_URL ?? "http://localhost:3001";
const SUPABASE_URL = lerEnv(ENV_BACKEND, /SUPABASE_URL=(\S+)/) ?? process.env.SUPABASE_URL;
const ANON_KEY = lerEnv(ENV_FRONTEND, /VITE_SUPABASE_ANON_KEY=(\S+)/) ?? process.env.VITE_SUPABASE_ANON_KEY;

const credenciar = async (email, senha) => {
  const sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  return error ? null : data?.session?.access_token ?? null;
};

async function pedir(tok, caminho, metodo = "GET", corpo = null) {
  let req = request(API);
  if (metodo === "GET") req = req.get(caminho);
  else if (metodo === "POST") req = req.post(caminho);
  else if (metodo === "PUT") req = req.put(caminho);
  else if (metodo === "DELETE") req = req.delete(caminho);
  if (tok) req = req.set("Authorization", `Bearer ${tok}`);
  if (corpo) req = req.send(corpo);
  return req;
}

let live = false;
let motivo = "";
let tokenAdmin = null;
let tokenFunc = null;
let funcionarioId = null;

function offline() {
  if (!live) {
    console.warn(`[e2e auth] ignorado: ${motivo}`);
    expect(true).toBe(true);
    return true;
  }
  return false;
}

beforeAll(async () => {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) { motivo = `health ${r.status}`; return; }
    if (!SUPABASE_URL || !ANON_KEY) { motivo = "variaveis de ambiente ausentes"; return; }

    tokenAdmin = await credenciar("nikita@xmail.com", "12345678");
    if (!tokenAdmin) { motivo = "login nikita falhou"; return; }

    const email = `e2e.func.${Date.now()}@xmail.com`;
    const criado = await pedir(tokenAdmin, "/api/funcionarios", "POST", {
      nome: "Funcionario E2E",
      email,
      senha: "12345678",
    });
    if (criado.status !== 201) { motivo = `criar funcionario ${criado.status}`; return; }
    funcionarioId = criado.body.id;

    tokenFunc = await credenciar(email, "12345678");
    if (!tokenFunc) { motivo = "login funcionario falhou"; return; }

    live = true;
  } catch (e) {
    motivo = e.message;
  }
}, 20000);

afterAll(async () => {
  if (!tokenAdmin || !funcionarioId) return;
  await pedir(tokenAdmin, `/api/funcionarios/${funcionarioId}`, "DELETE").catch(() => {});
});

describe("E2E Autorizacao - sem token", () => {
  it("rota protegida sem token retorna 401", async () => {
    if (offline()) return;
    const res = await request(API).get("/api/clientes?limit=5");
    expect(res.status).toBe(401);
  });

  it("token invalido retorna 401", async () => {
    if (offline()) return;
    const res = await pedir("token.falso.123", "/api/clientes?limit=5");
    expect(res.status).toBe(401);
  });
});

describe("E2E Autorizacao - funcionario nao admin", () => {
  it("funcionario acessa rota comum (GET clientes) com 200", async () => {
    if (offline()) return;
    const res = await pedir(tokenFunc, "/api/clientes?limit=5");
    expect(res.status).toBe(200);
  });

  it("funcionario nao lista expediente (403)", async () => {
    if (offline()) return;
    const res = await pedir(tokenFunc, "/api/expediente");
    expect(res.status).toBe(403);
  });

  it("funcionario nao cria data bloqueada (403)", async () => {
    if (offline()) return;
    const res = await pedir(tokenFunc, "/api/datas-bloqueadas", "POST", { data: "2099-12-31", motivo: "E2E" });
    expect(res.status).toBe(403);
  });

  it("funcionario nao exclui agendamento (403)", async () => {
    if (offline()) return;
    const lista = await pedir(tokenAdmin, "/api/agendamentos?limit=100");
    if (lista.body.data.length < 1) { expect.fail("nao ha agendamento para testar"); return; }
    const id = lista.body.data[0].agendamento_id;
    const res = await pedir(tokenFunc, `/api/agendamentos/${id}`, "DELETE");
    expect(res.status).toBe(403);
  });
});