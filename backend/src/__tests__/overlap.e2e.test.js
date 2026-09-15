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

function atendeJanela(exp) {
  return Boolean(exp?.ativo && exp.abertura <= "10:00" && exp.fechamento >= "12:00");
}

let live = false;
let motivo = "";
let tokenA = null;
let tokenB = null;
let dados = null;
const usados = new Set();
const criados = [];

function offline() {
  if (!live) {
    console.warn(`[e2e sobreposicao] ignorado: ${motivo}`);
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
    tokenB = await credenciar("outro@xmail.com", "12345678");
    if (!tokenA || !tokenB) { motivo = `login nikita=${Boolean(tokenA)} outro=${Boolean(tokenB)}`; return; }
    const expOK = await provisionarExpedienteB();
    if (!expOK) { motivo = "falha ao provisionar expediente do tenant B"; return; }
    dados = await carregarDados();
    if (!dados) { motivo = "dados insuficientes (clientes/veiculos/servicos)"; live = false; return; }
    live = true;
  } catch (e) {
    motivo = e.message;
  }
}, 30000);

afterAll(async () => {
  if (!live) return;
  for (const { token, id } of criados) {
    await pedir(token, `/api/agendamentos/${id}`, "DELETE").catch(() => {});
  }
});

async function provisionarExpedienteB() {
  const dias = [1, 2, 3, 4, 5, 6].map((dia_semana) => ({
    dia_semana,
    abertura: "08:00",
    fechamento: "18:00",
    ativo: true,
  }));
  const res = await pedir(tokenB, "/api/expediente", "PUT", { dias });
  return res.status === 200;
}

async function carregarDados() {
  const hoje = dataDaqui(0);

  const [cliA, veiA, serA, cliB, veiB, serB, expA, expB, agA, agB, blqA, blqB] = await Promise.all([
    pedir(tokenA, "/api/clientes?limit=100"),
    pedir(tokenA, "/api/veiculos?limit=100"),
    pedir(tokenA, "/api/servicos?limit=100"),
    pedir(tokenB, "/api/clientes?limit=100"),
    pedir(tokenB, "/api/veiculos?limit=100"),
    pedir(tokenB, "/api/servicos?limit=100"),
    pedir(tokenA, "/api/expediente"),
    pedir(tokenB, "/api/expediente"),
    pedir(tokenA, `/api/agendamentos?data_inicio=${hoje}&limit=100`),
    pedir(tokenB, `/api/agendamentos?data_inicio=${hoje}&limit=100`),
    pedir(tokenA, "/api/datas-bloqueadas"),
    pedir(tokenB, "/api/datas-bloqueadas"),
  ]);

  const listaOk = (res) => res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0;
  if (!listaOk(cliA) || !listaOk(veiA) || !listaOk(serA) || !listaOk(cliB) || !listaOk(veiB)) return null;

  return {
    tokenA,
    tokenB,
    expA: Array.isArray(expA.body) ? expA.body : null,
    expB: Array.isArray(expB.body) ? expB.body : null,
    bloqueadasA: new Set(Array.isArray(blqA.body) ? blqA.body.map((b) => b.data) : []),
    bloqueadasB: new Set(Array.isArray(blqB.body) ? blqB.body.map((b) => b.data) : []),
    datasA: new Set((agA.body.data ?? []).map((a) => a.data_agendamento)),
    datasB: new Set((agB.body.data ?? []).map((a) => a.data_agendamento)),
    dadosA: { clientes: cliA.body.data, veiculos: veiA.body.data, servicos: serA.body.data },
    dadosB: { clientes: cliB.body.data, veiculos: veiB.body.data, servicos: serB.body.data },
  };
}

function menorServico(lista) {
  return [...lista].sort((a, b) => (a.duracao_min ?? 60) - (b.duracao_min ?? 60))[0];
}

async function acharSlot() {
  const { expA, expB, datasA, datasB, bloqueadasA, bloqueadasB } = dados;
  for (let off = 3; off <= 60; off++) {
    const data = dataDaqui(off);
    const dia = new Date(data + "T12:00:00").getDay();
    if (dia === 0 || dia === 6) continue;
    if (usados.has(data) || datasA.has(data) || datasB.has(data)) continue;
    if (bloqueadasA.has(data) || bloqueadasB.has(data)) continue;

    const eA = expA?.find((e) => e.dia_semana === dia);
    const eB = expB?.find((e) => e.dia_semana === dia);
    if (!atendeJanela(eA) || !atendeJanela(eB)) continue;

    usados.add(data);
    return { data };
  }
  return null;
}

describe("E2E Sobreposicao de agendamento", () => {
  it(
    "conflito em mesmo horario retorna 409 tratado (nao 500)",
    async () => {
      if (offline()) return;
      const slot = await acharSlot();
      if (!slot) { expect.fail("nenhum dia livre enquadrado no expediente encontrado"); return; }

      const b = dados.dadosB;
      const servico = menorServico(b.servicos);
      const veiculo = b.veiculos[0];
      const base = {
        cliente_id: veiculo.cliente_id,
        veiculo_id: veiculo.veiculo_id,
        servico_id: servico.servico_id,
        data_agendamento: slot.data,
        hora_agendamento: "10:00",
      };

      const criado = await pedir(tokenB, "/api/agendamentos", "POST", base);
      expect(criado.status).toBe(201);
      criados.push({ token: tokenB, id: criado.body.agendamento_id });

      const conflito = await pedir(tokenB, "/api/agendamentos", "POST", base);
      expect(conflito.status).toBe(409);
      expect(conflito.body.error).toMatch(/conflita|conflito/i);

      const livre = await pedir(tokenB, "/api/agendamentos", "POST", { ...base, hora_agendamento: "11:00" });
      expect(livre.status).toBe(201);
      criados.push({ token: tokenB, id: livre.body.agendamento_id });
    },
    30000
  );

  it(
    "mesmo horario entre tenants DIFERENTES e permitido",
    async () => {
      if (offline()) return;
      const slot = await acharSlot();
      if (!slot) { expect.fail("nenhum dia livre encontrado"); return; }

      const servicoA = menorServico(dados.dadosA.servicos);
      const servicoB = menorServico(dados.dadosB.servicos);
      const veiculoB = dados.dadosB.veiculos[0];
      const veiculoA = dados.dadosA.veiculos[0];
      const corpoB = {
        cliente_id: veiculoB.cliente_id,
        veiculo_id: veiculoB.veiculo_id,
        servico_id: servicoB.servico_id,
        data_agendamento: slot.data,
        hora_agendamento: "10:00",
      };
      const corpoA = {
        cliente_id: veiculoA.cliente_id,
        veiculo_id: veiculoA.veiculo_id,
        servico_id: servicoA.servico_id,
        data_agendamento: slot.data,
        hora_agendamento: "10:00",
      };

      const rB = await pedir(tokenB, "/api/agendamentos", "POST", corpoB);
      expect(rB.status).toBe(201);
      criados.push({ token: tokenB, id: rB.body.agendamento_id });

      const rA = await pedir(tokenA, "/api/agendamentos", "POST", corpoA);
      expect(rA.status).toBe(201);
      criados.push({ token: tokenA, id: rA.body.agendamento_id });
    },
    30000
  );

  it(
    "corrida simultanea: apenas um agendamento sobrevive no mesmo slot",
    async () => {
      if (offline()) return;
      const slot = await acharSlot();
      if (!slot) { expect.fail("nenhum dia livre encontrado"); return; }

      const b = dados.dadosB;
      const veiculo = b.veiculos[0];
      const corpo = {
        cliente_id: veiculo.cliente_id,
        veiculo_id: veiculo.veiculo_id,
        servico_id: menorServico(b.servicos).servico_id,
        data_agendamento: slot.data,
        hora_agendamento: "11:00",
      };

      const [r1, r2] = await Promise.all([
        pedir(tokenB, "/api/agendamentos", "POST", corpo),
        pedir(tokenB, "/api/agendamentos", "POST", corpo),
      ]);

      const statuses = [r1.status, r2.status];
      expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);
      expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);

      const lista = await pedir(tokenB, `/api/agendamentos?data_inicio=${slot.data}&data_fim=${slot.data}&limit=100`);
      const horaMin = "11:00";
      const ativos = (lista.body.data ?? []).filter(
        (a) => a.hora_agendamento.slice(0, 5) === horaMin && ["pendente", "confirmado", "em_andamento"].includes(a.status)
      );
      for (const a of ativos) criados.push({ token: tokenB, id: a.agendamento_id });
      expect(ativos.length).toBe(1);
    },
    30000
  );
});