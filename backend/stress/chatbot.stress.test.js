import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("../src/chatbot/baileys.client.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
    sendWhatsAppAudio: vi.fn().mockResolvedValue(undefined),
    sendButtons: vi.fn().mockResolvedValue(undefined),
    sendList: vi.fn().mockResolvedValue(undefined),
  };
});

import { supabaseAdmin } from "../src/config/supabase.js";
import { processMessage } from "../src/chatbot/chatbot.service.js";
import { sendWhatsAppMessage } from "../src/chatbot/baileys.client.js";

function jid(i) {
  return `55119${String(10000000 + i)}@s.whatsapp.net`;
}

function percentil(vals, p) {
  if (vals.length === 0) return 0;
  const ordenado = [...vals].sort((a, b) => a - b);
  const pos = Math.min(ordenado.length - 1, Math.max(0, Math.ceil((p / 100) * ordenado.length) - 1));
  return ordenado[pos];
}

function resumo(durs) {
  return `msgs=${durs.length} p50=${percentil(durs, 50).toFixed(1)}ms p95=${percentil(durs, 95).toFixed(1)}ms p99=${percentil(durs, 99).toFixed(1)}ms max=${Math.max(...durs).toFixed(1)}ms`;
}

const SEQUENCIAS = [
  ["Bom dia", "1", "1", "menu", "0"],
  ["Oi", "2", "menu", "1", "menu"],
  ["menu", "1", "menu", "2", "reiniciar"],
  ["Olá", "1", "menu", "menu", "1"],
  ["boas", "menu", "1", "0", "1"],
  ["Oi, tudo bem?", "3", "menu", "2", "menu"],
];

const TABELAS_TENANT = [
  "configuracao_empresa",
  "notificacoes",
  "chatbot_session",
  "servico",
  "datas_bloqueadas",
  "configuracao_expediente",
  "clientes",
  "veiculos",
  "agendamentos",
  "ordens_servico",
  "comunicados",
  "contas_pagar",
  "usuarios",
];

let tenantId = null;

async function limparTenant(tid) {
  if (!tid) return;
  for (const tabela of TABELAS_TENANT) {
    try {
      await supabaseAdmin.from(tabela).delete().eq("tenant_id", tid);
    } catch {
      // tabela pode não existir em alguns ambientes de dev; ignora
    }
  }
  try {
    await supabaseAdmin.from("tenants").delete().eq("id", tid);
  } catch {
    console.warn("[cleanup] não foi possível deletar o tenant de teste, remova manualmente:", tid);
  }
}

beforeAll(async () => {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({ nome: "Stress Test Bot", slug: `stress-bot-${randomUUID().slice(0, 8)}` })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar tenant de teste: ${error.message}`);
  tenantId = data.id;

  const { error: errEmp } = await supabaseAdmin
    .from("configuracao_empresa")
    .insert({ tenant_id: tenantId, nome_fantasia: "Estética Stress", telefone: "5511922222222" });
  if (errEmp) throw new Error(`Erro ao criar configuracao_empresa: ${errEmp.message}`);

  const { error: errServ } = await supabaseAdmin.from("servico").insert([
    { tenant_id: tenantId, nome_servico: "Lavagem", preco_base: 50, duracao_min: 30, ativo: true },
    { tenant_id: tenantId, nome_servico: "Polimento", preco_base: 150, duracao_min: 120, ativo: true },
    { tenant_id: tenantId, nome_servico: "Higienização", preco_base: 220, duracao_min: 180, ativo: true },
  ]);
  if (errServ) throw new Error(`Erro ao criar serviços: ${errServ.message}`);
});

describe("stress - fluxo do chatbot (sem mensagens reais)", () => {
  it("burst: 100 clientes novos mensagem simultânea", { timeout: 120000 }, async () => {
    sendWhatsAppMessage.mockClear();

    const durs = [];
    const alvos = Array.from({ length: 100 }, (_, i) => jid(i));
    const inicio = performance.now();

    await Promise.all(
      alvos.map(async (j, i) => {
        const t0 = performance.now();
        await processMessage(tenantId, j, "Oi", `Cliente ${String(i).padStart(3, "0")}`);
        durs.push(performance.now() - t0);
      })
    );

    const wall = performance.now() - inicio;
    console.log(`[burst] 100 msgs simultâneas em ${wall.toFixed(0)}ms -> ${(100 / (wall / 1000)).toFixed(0)} msg/s | ${resumo(durs)}`);
    expect(durs).toHaveLength(100);
  });

  it("fluxos: 60 clientes navegando em paralelo (menu/agendar/serviços)", { timeout: 120000 }, async () => {
    sendWhatsAppMessage.mockClear();

    const durs = [];
    const inicio = performance.now();
    const erros = [];

    const rodarJid = async (base, seq) => {
      for (const texto of seq) {
        const t0 = performance.now();
        try {
          await processMessage(tenantId, jid(base), texto, `Fluxo ${String(base).padStart(3, "0")}`);
          durs.push(performance.now() - t0);
        } catch (err) {
          durs.push(performance.now() - t0);
          erros.push({ jid: jid(base), texto, erro: String(err.message ?? err) });
        }
      }
    };

    await Promise.all(
      Array.from({ length: 60 }, (_, i) => rodarJid(200 + i, SEQUENCIAS[i % SEQUENCIAS.length]))
    );

    const wall = performance.now() - inicio;
    console.log(`[fluxos] 60 clientes em ${wall.toFixed(0)}ms (${(durs.length / (wall / 1000)).toFixed(0)} msg/s) | ${resumo(durs)}`);
    if (erros.length > 0) {
      console.warn(`[fluxos] ${erros.length} mensagens lançaram exceção:`, erros.slice(0, 5));
    }
    expect(durs.length).toBe(60 * SEQUENCIAS[0].length);
  });

  it("rate limit: 5 clientes disparando 12 mensagens em rajada", { timeout: 120000 }, async () => {
    sendWhatsAppMessage.mockClear();

    for (let k = 0; k < 12; k++) {
      for (let j = 300; j < 305; j++) {
        await processMessage(tenantId, jid(j), "Oi", `Rajada ${j}`);
      }
    }

    const avisos = sendWhatsAppMessage.mock.calls.filter((c) =>
      String(c[1] ?? "").includes("muitas mensagens")
    ).length;

    console.log(`[rate-limit] avisos de throttling enviados: ${avisos} (esperado >= 5)`);
    expect(avisos).toBeGreaterThanOrEqual(5);
  });
});

afterAll(async () => {
  await limparTenant(tenantId);
});