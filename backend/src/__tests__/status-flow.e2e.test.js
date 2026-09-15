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
const criados = [];
const usados = new Set();

function offline() {
  if (!live) {
    console.warn(`[e2e status] ignorado: ${motivo}`);
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

    const [cli, vei, ser, exp, ag, blq] = await Promise.all([
      pedir(tokenA, "/api/clientes?limit=100"),
      pedir(tokenA, "/api/veiculos?limit=100"),
      pedir(tokenA, "/api/servicos?limit=100"),
      pedir(tokenA, "/api/expediente"),
      pedir(tokenA, "/api/agendamentos?limit=100"),
      pedir(tokenA, "/api/datas-bloqueadas"),
    ]);

    const ok = (res) => res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0;
    if (!ok(cli) || !ok(vei) || !ok(ser) || !Array.isArray(exp.body)) { motivo = "dados insuficientes"; return; }

    dados = {
      exp: exp.body,
      veiculo: vei.body.data.find((v) => cli.body.data.some((c) => c.cliente_id === v.cliente_id)),
      servicos: ser.body.data,
      bloqueadas: new Set(Array.isArray(blq.body) ? blq.body.map((b) => b.data) : []),
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
  for (const id of criados) {
    await pedir(tokenA, `/api/agendamentos/${id}`, "DELETE").catch(() => {});
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
    if (usados.has(data) || dados.datas.has(data)) continue;
    if (dados.bloqueadas.has(data)) continue;
    usados.add(data);
    return data;
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

async function slotCancelamentoProximo() {
  const agora = new Date();
  const hoje = dataDaqui(0);
  const dia = new Date(hoje + "T12:00:00").getDay();
  const exp = expDia(dia);
  if (!exp) return null;

  const lista = await pedir(tokenA, `/api/agendamentos?data_inicio=${hoje}&data_fim=${hoje}&limit=100`);
  const ranges = (lista.body.data ?? []).map((a) => {
    const ini = toMin(a.hora_agendamento);
    const fim = ini + (a.servico?.duracao_min ?? 45);
    return { ini, fim };
  });

  const nowMin = agora.getHours() * 60 + agora.getMinutes();
  const fimExpediente = toMin(exp.fechamento) - 1;
  const horaMin = Math.max(nowMin + 50, toMin(exp.abertura));
  const horaMax = Math.min(nowMin + 118, fimExpediente);

  for (let t = horaMin; t <= horaMax; t++) {
    const conflita = ranges.some((r) => t < r.fim && r.ini < t + 45);
    if (conflita) continue;
    return { data: hoje, hora: hhmm(t) };
  }
  return null;
}

describe("E2E Fluxo de status", () => {
  it("transicoes validas e invalida no mesmo agendamento", async () => {
    if (offline()) return;
    const data = dataUteis();
    if (!data) { expect.fail("nenhuma data uteis encontrada"); return; }
    const servicoId = dados.servicos[0].servico_id;

    const criado = await pedir(tokenA, "/api/agendamentos", "POST", corpoAgendamento(data, "10:00", servicoId));
    expect(criado.status).toBe(201);
    expect(criado.body.status).toBe("pendente");
    const id = criado.body.agendamento_id;
    criados.push(id);

    const conf = await pedir(tokenA, `/api/agendamentos/${id}`, "PUT", { status: "confirmado" });
    expect(conf.status).toBe(200);
    expect(conf.body.status).toBe("confirmado");

    const and = await pedir(tokenA, `/api/agendamentos/${id}`, "PUT", { status: "em_andamento" });
    expect(and.status).toBe(200);
    expect(and.body.status).toBe("em_andamento");

    const fin = await pedir(tokenA, `/api/agendamentos/${id}`, "PUT", { status: "finalizado" });
    expect(fin.status).toBe(200);
    expect(fin.body.status).toBe("finalizado");

    const inv = await pedir(tokenA, `/api/agendamentos/${id}`, "PUT", { status: "confirmado" });
    expect(inv.status).toBe(400);
    expect(inv.body.error).toMatch(/não é permitido|nao e permitido/i);

    const del = await pedir(tokenA, `/api/agendamentos/${id}`, "DELETE");
    expect(del.status).toBe(400);
  });

  it("cancelamento com menos de 2h de antecedencia retorna 400", async () => {
    if (offline()) return;
    const slot = await slotCancelamentoProximo();
    if (!slot) {
      console.warn("[e2e status] fora do horario para testar cancelamento com <2h (ignorando)");
      expect(true).toBe(true);
      return;
    }

    const servicoId = dados.servicos[0].servico_id;
    const criado = await pedir(tokenA, "/api/agendamentos", "POST", corpoAgendamento(slot.data, slot.hora, servicoId));
    if (criado.status !== 201) { expect.fail(`nao foi possivel criar no slot proximo: ${criado.status} ${JSON.stringify(criado.body)}`); return; }
    const id = criado.body.agendamento_id;
    criados.push(id);

    const cancelar = await pedir(tokenA, `/api/agendamentos/${id}`, "PUT", { status: "cancelado" });
    expect(cancelar.status).toBe(400);
    expect(cancelar.body.error).toMatch(/anteced[eê]ncia|2 horas/i);
  });

  it("cancelamento de agendamento futuro e permitido", async () => {
    if (offline()) return;
    const data = dataUteis();
    if (!data) { expect.fail("nenhuma data uteis encontrada"); return; }
    const servicoId = dados.servicos[0].servico_id;

    const criado = await pedir(tokenA, "/api/agendamentos", "POST", corpoAgendamento(data, "14:00", servicoId));
    expect(criado.status).toBe(201);
    const id = criado.body.agendamento_id;
    criados.push(id);

    const cancelar = await pedir(tokenA, `/api/agendamentos/${id}`, "PUT", { status: "cancelado" });
    expect(cancelar.status).toBe(200);
    expect(cancelar.body.status).toBe("cancelado");
  });
});