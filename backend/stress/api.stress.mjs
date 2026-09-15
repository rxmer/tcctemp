import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.STRESS_API_URL ?? "http://localhost:3001";
const N_USERS = Number(process.env.STRESS_USERS ?? 3);
const TOTAL_REQS = Number(process.env.STRESS_REQS ?? 400);
const CONCURRENCY = Number(process.env.STRESS_CONCURRENCY ?? 40);

function lerEnv(chave, caminho) {
  try {
    const conteudo = readFileSync(caminho, "utf8");
    const m = conteudo.match(new RegExp(`^${chave}=(.*)$`, "m"));
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = lerEnv("VITE_SUPABASE_ANON_KEY", path.join(__dirname, "../../frontend/.env"));

if (!SERVICE_KEY || !SUPABASE_URL || !ANON_KEY) {
  console.error("Faltam credenciais do Supabase (backend/.env e frontend/.env)");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

const { signup } = await import("../src/services/auth.service.js");

const ENDPOINTS = [
  { name: "sessions-recentes", url: "/api/chatbot/sessions?page=1&limit=20&ordem=recentes" },
  { name: "sessions-naolidas-primeiro", url: "/api/chatbot/sessions?page=1&limit=20&ordem=naolidas" },
  { name: "sessions-nao-lidas", url: "/api/chatbot/sessions?naoLidas=true&page=1&limit=20&ordem=recentes" },
  { name: "sessions-estado", url: "/api/chatbot/sessions?page=1&limit=20&ordem=nome&estado=atendente" },
  { name: "sessions-unread", url: "/api/chatbot/sessions/unread" },
  { name: "dashboard", url: "/api/dashboard/resumo" },
  { name: "notificacoes", url: "/api/notificacoes" },
  { name: "agendamentos", url: "/api/agendamentos?mes=2026-09" },
  { name: "health", url: "/health", semAuth: true },
];

const usuariosTeste = [];
const rotulosStatus = {};

function percentil(vals, p) {
  if (vals.length === 0) return 0;
  const ordenado = [...vals].sort((a, b) => a - b);
  const pos = Math.min(ordenado.length - 1, Math.max(0, Math.ceil((p / 100) * ordenado.length) - 1));
  return ordenado[pos];
}

async function criarUsuariosTeste() {
  const sufixo = Date.now();
  for (let i = 0; i < N_USERS; i++) {
    const email = `stress-${sufixo}-${i}@esteticar.test`;
    const { id, tenant } = await signup({
      nomeEmpresa: `Stress API ${i}`,
      nome: `Stress ${i}`,
      email,
      senha: "Stress123!",
    });

    const { data, error } = await anonClient.auth.signInWithPassword({ email, password: "Stress123!" });
    if (error) throw new Error(`Login do usuário de teste ${i} falhou: ${error.message}`);

    usuariosTeste.push({ userId: id, tenantId: tenant.id, token: data.session.access_token });
    console.log(`[setup] usuário de teste ${i + 1}/${N_USERS} criado (tenant ${tenant.id})`);
  }
}

async function limparUsuariosTeste() {
  const tabelas = [
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
  for (const u of usuariosTeste) {
    try {
      await adminClient.auth.admin.deleteUser(u.userId);
    } catch (err) {
      console.warn(`[cleanup] erro ao deletar usuário ${u.userId}: ${err.message}`);
    }
    for (const tabela of tabelas) {
      try {
        await adminClient.from(tabela).delete().eq("tenant_id", u.tenantId);
      } catch {
        // ignora tabelas que não existem
      }
    }
    try {
      await adminClient.from("tenants").delete().eq("id", u.tenantId);
      console.log(`[cleanup] tenant ${u.tenantId} removido`);
    } catch (err) {
      console.warn(`[cleanup] erro ao deletar tenant ${u.tenantId}: ${err.message}`);
    }
  }
}

function ipFake() {
  return `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 200) + 2}`;
}

async function requisicao(endpoint, token) {
  const headers = { "X-Forwarded-For": ipFake() };
  if (!endpoint.semAuth) headers.Authorization = `Bearer ${token}`;

  const controle = AbortController ? new AbortController() : null;
  const timer = controle ? setTimeout(() => controle.abort(), 30000) : null;

  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${endpoint.url}`, { headers, signal: controle?.signal });
    const t = performance.now() - t0;
    return { endpoint: endpoint.name, status: res.status, ms: t };
  } catch (err) {
    const t = performance.now() - t0;
    return { endpoint: endpoint.name, status: 0, ms: t, erro: String(err.message ?? err) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function executar() {
  const tasks = [];
  for (let i = 0; i < TOTAL_REQS; i++) {
    const ep = ENDPOINTS[i % ENDPOINTS.length];
    const token = usuariosTeste[i % usuariosTeste.length].token;
    tasks.push({ ep, token });
  }

  const resultados = [];
  let idx = 0;
  const worker = async () => {
    while (idx < tasks.length) {
      const { ep, token } = tasks[idx++];
      resultados.push(await requisicao(ep, token));
    }
  };

  const inicio = performance.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const wall = performance.now() - inicio;

  const porEndpoint = new Map();
  for (const r of resultados) {
    if (!porEndpoint.has(r.endpoint)) porEndpoint.set(r.endpoint, []);
    porEndpoint.get(r.endpoint).push(r);
  }

  console.log("");
  console.log("==================================================");
  console.log(`STRESS API — ${TOTAL_REQS} requisições | concorrência ${CONCURRENCY} | wall ${wall.toFixed(0)}ms | ${(TOTAL_REQS / (wall / 1000)).toFixed(1)} req/s`);
  console.log("==================================================");
  console.log("endpoint                 | total | ok  | 4xx | 5xx | p50     | p95     | p99     | max");
  console.log("-------------------------|-------|-----|-----|-----|---------|---------|---------|--------");

  for (const ep of ENDPOINTS) {
    const lista = porEndpoint.get(ep.name) ?? [];
    const statuses = {};
    const durs = [];
    for (const r of lista) {
      statuses[r.status] = (statuses[r.status] ?? 0) + 1;
      if (r.status > 0) durs.push(r.ms);
    }
    if (durs.length === 0) continue;
    const ok = statuses[200] ?? 0;
    const e4 = Object.entries(statuses).reduce((a, [s, c]) => a + (s >= 400 && s < 500 ? c : 0), 0);
    const e5 = Object.entries(statuses).reduce((a, [s, c]) => a + (s >= 500 ? c : 0), 0);
    const linha = `${ep.name.padEnd(24)}| ${String(lista.length).padStart(5)} | ${String(ok).padStart(3)} | ${String(e4).padStart(3)} | ${String(e5).padStart(3)} | ${percentil(durs, 50).toFixed(0)}ms | ${percentil(durs, 95).toFixed(0)}ms | ${percentil(durs, 99).toFixed(0)}ms | ${Math.max(...durs).toFixed(0)}ms`;
    console.log(linha.replaceAll(" ", " "));
    rotulosStatus[ep.name] = { total: lista.length, ok, e4, e5 };
  }

  const todosDurs = resultados.filter((r) => r.status > 0).map((r) => r.ms);
  const totalErros = resultados.filter((r) => r.status === 0).length;
  console.log("--------------------------------------------------");
  console.log(`TOTAL: ok=${resultados.filter((r) => r.status === 200).length} 4xx=${resultados.filter((r) => r.status >= 400 && r.status < 500).length} 5xx=${resultados.filter((r) => r.status >= 500).length} timeouts/falhas=${totalErros}`);
  console.log(`LATÊNCIA GERAL: p50=${percentil(todosDurs, 50).toFixed(0)}ms p95=${percentil(todosDurs, 95).toFixed(0)}ms p99=${percentil(todosDurs, 99).toFixed(0)}ms`);
}

try {
  await criarUsuariosTeste();
  await executar();
} finally {
  console.log("");
  console.log("Limpando dados de teste...");
  await limparUsuariosTeste();
  console.log("Fim.");
}