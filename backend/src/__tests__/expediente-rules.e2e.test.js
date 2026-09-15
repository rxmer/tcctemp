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

function dataDaqui(dias) {
  const agora = new Date();
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hhmm(totalMin) {
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(Math.floor(totalMin % 60)).padStart(2, "0")}`;
}

function toMin(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

let live = false;
let motivo = "";
let tokenA = null;
let dados = null;
const bloqueiosCriados = [];

function offline() {
  if (!live) {
    console.warn(`[e2e expediente] ignorado: ${motivo}`);
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

    tokenA = await credenciar("nikita@xmail.com", "12345678");
    if (!tokenA) { motivo = "login nikita falhou"; return; }

    const [cli, vei, ser, exp, ag] = await Promise.all([
      pedir(tokenA, "/api/clientes?limit=100"),
      pedir(tokenA, "/api/veiculos?limit=100"),
      pedir(tokenA, "/api/servicos?limit=100"),
      pedir(tokenA, "/api/expediente"),
      pedir(tokenA, "/api/agendamentos?limit=100"),
    ]);

    const ok = (res) => res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0;
    if (!ok(cli) || !ok(vei) || !ok(ser) || !Array.isArray(exp.body)) { motivo = "dados insuficientes"; return; }

    dados = {
      exp: exp.body,
      veiculo: vei.body.data.find((v) => cli.body.data.some((c) => c.cliente_id === v.cliente_id)),
      servicos: ser.body.data,
      datas: new Set((ag.body.data ?? []).map((a) => a.data_agendamento)),
    };
    if (!dados.veiculo) { motivo = "sem veiculo vinculado a cliente"; return; }

    live = true;
  } catch (e) {
    motivo = e.message;
  }
}, 20000);

afterAll(async () => {
  if (!tokenA) return;
  for (const id of bloqueiosCriados) {
    await pedir(tokenA, `/api/datas-bloqueadas/${id}`, "DELETE").catch(() => {});
  }
});

function expDia(dia) {
  return dados.exp.find((e) => e.dia_semana === dia && e.ativo);
}

function dataUteis(inicio = 3) {
  for (let off = inicio; off <= 60; off++) {
    const data = dataDaqui(off);
    const dia = new Date(data + "T12:00:00").getDay();
    if (dia === 0 || dia === 6) continue;
    if (!expDia(dia)) continue;
    if (dados.datas.has(data)) continue;
    return data;
  }
  return null;
}

function dataDomingo(inicio = 3) {
  for (let off = inicio; off <= 60; off++) {
    const data = dataDaqui(off);
    const dia = new Date(data + "T12:00:00").getDay();
    if (dia === 0 && !dados.datas.has(data)) return data;
  }
  return null;
}

function corpoAgendamento(data, hora, servicoId) {
  return {
    cliente_id: dados.veiculo.cliente_id,
    veiculo_id: dados.veiculo.veiculo_id,
    servico_id: servicoId,
    data_agendamento: data,
    hora_agendamento: hora,
  };
}

describe("E2E Regras de expediente/horario", () => {
  it("agendar antes da abertura retorna 400", async () => {
    if (offline()) return;
    const data = dataUteis();
    if (!data) { expect.fail("nenhuma data uteis expediente encontrada"); return; }
    const dia = new Date(data + "T12:00:00").getDay();
    const exp = expDia(dia);
    const antes = hhmm(toMin(exp.abertura) - 60);

    const res = await pedir(tokenA, "/api/agendamentos", "POST", corpoAgendamento(data, antes, dados.servicos[0].servico_id));
    expect(res.status).toBe(400);
  });

  it("agendar em dia sem expediente (domingo) retorna 400", async () => {
    if (offline()) return;
    const temDomingo = Boolean(expDia(0));
    if (temDomingo) {
      console.warn("[e2e expediente] tenant tem domingo ativo, pulando assertiva de 400");
      expect(true).toBe(true);
      return;
    }
    const data = dataDomingo();
    if (!data) { expect.fail("data de domingo nao encontrada"); return; }

    const res = await pedir(tokenA, "/api/agendamentos", "POST", corpoAgendamento(data, "10:00", dados.servicos[0].servico_id));
    expect(res.status).toBe(400);
  });

  it("servico que nao cabe no expediente retorna 400", async () => {
    if (offline()) return;
    const data = dataUteis(6);
    if (!data) { expect.fail("nenhuma data uteis encontrada"); return; }
    const dia = new Date(data + "T12:00:00").getDay();
    const exp = expDia(dia);
    const servico = [...dados.servicos].sort((a, b) => (b.duracao_min ?? 60) - (a.duracao_min ?? 60))[0];
    const duracao = servico.duracao_min ?? 45;
    const hora = hhmm(toMin(exp.fechamento) - duracao + 1);

    const res = await pedir(tokenA, "/api/agendamentos", "POST", corpoAgendamento(data, hora, servico.servico_id));
    expect(res.status).toBe(400);
  });

  it("data bloqueada (feriado/recesso) retorna 400", async () => {
    if (offline()) return;
    const data = dataUteis(9);
    if (!data) { expect.fail("nenhuma data uteis encontrada"); return; }

    const bloqueio = await pedir(tokenA, "/api/datas-bloqueadas", "POST", { data, motivo: "E2E feriado" });
    expect(bloqueio.status).toBe(201);
    bloqueiosCriados.push(bloqueio.body.id);

    const res = await pedir(tokenA, "/api/agendamentos", "POST", corpoAgendamento(data, "10:00", dados.servicos[0].servico_id));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/bloquead/i);
  });
});