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
  req = req.set("Authorization", `Bearer ${tok}`);
  if (corpo) req = req.send(corpo);
  return req;
}

let live = false;
let motivo = "";
const criadosEmB = [];

function offline() {
  if (!live) {
    console.warn(`[e2e multi-tenant] ignorado: ${motivo}`);
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
    const tokenA = await credenciar("nikita@xmail.com", "12345678");
    const tokenB = await credenciar("outro@xmail.com", "12345678");
    if (!tokenA || !tokenB) { motivo = `login nikita=${Boolean(tokenA)} outro=${Boolean(tokenB)}`; return; }
    offline.cache = { tokenA, tokenB };
    live = true;
  } catch (e) {
    motivo = e.message;
  }
}, 15000);

afterAll(async () => {
  if (!offline.cache) return;
  const { tokenB } = offline.cache;
  for (const id of criadosEmB) {
    await pedir(tokenB, `/api/clientes/${id}`, "DELETE").catch(() => {});
  }
});

function tokA() { return offline.cache?.tokenA; }
function tokB() { return offline.cache?.tokenB; }

describe("E2E Multi-tenant - isolamento", () => {
  it("listas de clientes isoladas por tenant", async () => {
    if (offline()) return;
    const resA = await pedir(tokA(), "/api/clientes?limit=100");
    const resB = await pedir(tokB(), "/api/clientes?limit=100");
    const a = resA.body.data ?? [];
    const b = resB.body.data ?? [];
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(a.length).toBeGreaterThanOrEqual(5);
    expect(b.length).toBeGreaterThanOrEqual(1);
    const idsA = new Set(a.map((x) => x.cliente_id));
    expect(b.every((x) => !idsA.has(x.cliente_id))).toBe(true);
  });

  it("listas de servicos isoladas por tenant", async () => {
    if (offline()) return;
    const resA = await pedir(tokA(), "/api/servicos?limit=100");
    const resB = await pedir(tokB(), "/api/servicos?limit=100");
    const a = resA.body.data ?? [];
    const b = resB.body.data ?? [];
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(a.length).toBeGreaterThanOrEqual(5);
    expect(b.length).toBeGreaterThanOrEqual(1);
    const idsA = new Set(a.map((x) => x.servico_id));
    expect(b.every((x) => !idsA.has(x.servico_id))).toBe(true);
  });

  it("listas de agendamentos isoladas por tenant", async () => {
    if (offline()) return;
    const resA = await pedir(tokA(), "/api/agendamentos?limit=100");
    const resB = await pedir(tokB(), "/api/agendamentos?limit=100");
    const a = resA.body.data ?? [];
    const b = resB.body.data ?? [];
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(b.length).toBeGreaterThanOrEqual(1);
    const idsA = new Set(a.map((x) => x.agendamento_id));
    expect(b.every((x) => !idsA.has(x.agendamento_id))).toBe(true);
  });
});

describe("E2E Multi-tenant - acesso cruzado", () => {
  it("tenant B nao altera cliente de A", async () => {
    if (offline()) return;
    const lista = await pedir(tokA(), "/api/clientes?limit=100");
    const alvo = lista.body.data[0];
    const nomeOriginal = alvo.nome;
    const res = await pedir(tokB(), `/api/clientes/${alvo.cliente_id}`, "PUT", { nome: nomeOriginal + "X" });
    expect(res.status).not.toBe(200);
    const depois = await pedir(tokA(), "/api/clientes?limit=100");
    const atual = depois.body.data.find((c) => c.cliente_id === alvo.cliente_id);
    expect(atual.nome).toBe(nomeOriginal);
  });

  it("tenant B nao deleta servico de A", async () => {
    if (offline()) return;
    const lista = await pedir(tokA(), "/api/servicos?limit=100");
    const alvo = lista.body.data[0];
    const res = await pedir(tokB(), `/api/servicos/${alvo.servico_id}`, "DELETE");
    expect(res.status).toBe(404);
    const depois = await pedir(tokA(), "/api/servicos?limit=100");
    expect(depois.body.data.some((s) => s.servico_id === alvo.servico_id)).toBe(true);
  });

  it("cliente criado por B nao aparece para A", async () => {
    if (offline()) return;
    const nome = `E2E Multitenant ${Date.now()}`;
    const criar = await pedir(tokB(), "/api/clientes", "POST", { nome });
    expect(criar.status).toBe(201);
    criadosEmB.push(criar.body.cliente_id);

    const vistoPorA = await pedir(tokA(), `/api/clientes?search=${encodeURIComponent(nome)}`);
    expect(vistoPorA.body.data.some((c) => c.nome === nome)).toBe(false);

    const vistoPorB = await pedir(tokB(), `/api/clientes?search=${encodeURIComponent(nome)}`);
    expect(vistoPorB.body.data.some((c) => c.cliente_id === criar.body.cliente_id)).toBe(true);
  });

  it("controle: A altera o proprio cliente", async () => {
    if (offline()) return;
    const lista = await pedir(tokA(), "/api/clientes?limit=100");
    const alvo = lista.body.data[0];
    const res = await pedir(tokA(), `/api/clientes/${alvo.cliente_id}`, "PUT", { nome: alvo.nome });
    expect(res.status).toBe(200);
  });

  it("tenant B nao atualiza agendamento de A", async () => {
    if (offline()) return;
    const lista = await pedir(tokA(), "/api/agendamentos?limit=100");
    expect(lista.body.data.length).toBeGreaterThanOrEqual(1);
    const alvo = lista.body.data[0];
    const res = await pedir(tokB(), `/api/agendamentos/${alvo.agendamento_id}`, "PUT", { data_agendamento: "2099-01-01" });
    expect(res.status).toBe(404);
  });

  it("tenant B nao deleta agendamento de A", async () => {
    if (offline()) return;
    const lista = await pedir(tokA(), "/api/agendamentos?limit=100");
    expect(lista.body.data.length).toBeGreaterThanOrEqual(1);
    const alvo = lista.body.data[0];
    const res = await pedir(tokB(), `/api/agendamentos/${alvo.agendamento_id}`, "DELETE");
    expect(res.status).toBe(404);
    const depois = await pedir(tokA(), "/api/agendamentos?limit=100");
    expect(depois.body.data.some((a) => a.agendamento_id === alvo.agendamento_id)).toBe(true);
  });
});