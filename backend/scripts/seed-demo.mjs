import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const USE_IT = process.argv.includes("--yes");
if (!USE_IT) {
  console.error("ATENCAO: este script ZERA TODOS OS DADOS do Supabase.");
  console.error("Para executar, rode: node scripts/seed-demo.mjs --yes");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const log = console.log;
const ok = (label) => log(`  ok: ${label}`);
const fail = (label, error) => {
  console.error(`ERRO em ${label}:`, error?.message || error);
  process.exit(1);
};

const fmt = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmt(d);
};
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
};

async function wipeEverything() {
  log("\n[1/4] Limpando dados existentes...");

  const tablesInOrder = [
    "chatbot_mensagem",
    "comunicados_destinatarios",
    "chatbot_session",
    "comunicados",
    "itens_ordem_servico",
    "faturamentos",
    "ordens_servico",
    "agendamentos",
    "veiculos",
    "clientes",
    "servico",
    "configuracao_expediente",
    "datas_bloqueadas",
    "notificacoes",
    "contas_pagar",
    "configuracao_empresa",
    "usuarios",
    "tenants",
  ];

  for (const t of tablesInOrder) {
    if (t === "tenants") {
      const { error } = await supabase.from("tenants").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        console.warn(`  aviso limpando ${t}: ${error.message}`);
      } else {
        ok(`${t} vazio`);
      }
      continue;
    }
    const { error } = await supabase.from(t).delete().neq("tenant_id", "00000000-0000-0000-0000-000000000000");
    if (error && !/tenant_id/.test(error.message)) {
      console.warn(`  aviso limpando ${t}: ${error.message}`);
    } else {
      ok(`${t} vazio`);
    }
  }

  log("\n  Excluindo contas do Supabase Auth...");
  let page = 0;
  let total = 0;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail("listUsers", error);
    if (!data.users.length) break;
    for (const u of data.users) {
      await supabase.auth.admin.deleteUser(u.id);
      total++;
    }
    page++;
  }
  ok(`${total} user(s) de auth removido(s)`);
}

async function criarEstruturaBasica() {
  log("\n[2/4] Criando tenant, usuários e configurações...");

  const slug = `esteticar-demo-${randomUUID().slice(0, 8)}`;
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      nome: "Esteticar Demo",
      slug,
      telefone: "(11) 4002-8922",
      email: "contato@esteticar.com.br",
      ativo: true,
    })
    .select()
    .single();
  if (tenantErr) fail("criar tenant", tenantErr);
  ok(`tenant criado: ${tenant.id}`);
  const tenantId = tenant.id;

  const criarAuthUser = async ({ email, senha, nome, perfil }) => {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, tenant_id: tenantId, perfil },
    });
    if (error) fail(`auth user ${email}`, error);
    return data.user;
  };

  const admin = await criarAuthUser({ email: "nikita@xmail.com", senha: "12345678", nome: "Nikita Admin", perfil: "admin" });
  ok("auth user nikita@xmail.com criado");
  const funcionario = await criarAuthUser({
    email: "funcionario@xmail.com",
    senha: "12345678",
    nome: "Pedro Agencia",
    perfil: "funcionario",
  });
  ok("auth user funcionario@xmail.com criado (demo de perfil nao-admin)");

  // O Supabase possui um trigger que cria a linha em usuarios automaticamente
  // quando o auth user nasce. Usamos upsert para garantir que o perfil fique certo.
  const { error: u1Err } = await supabase
    .from("usuarios")
    .upsert(
      {
        id: admin.id,
        nome: "Nikita Admin",
        email: "nikita@xmail.com",
        tenant_id: tenantId,
        perfil: "admin",
        ativo: true,
      },
      { onConflict: "id" }
    );
  if (u1Err) fail("usuarios admin", u1Err);
  const { error: u2Err } = await supabase
    .from("usuarios")
    .upsert(
      {
        id: funcionario.id,
        nome: "Pedro Agencia",
        email: "funcionario@xmail.com",
        tenant_id: tenantId,
        perfil: "funcionario",
        ativo: true,
      },
      { onConflict: "id" }
    );
  if (u2Err) fail("usuarios funcionario", u2Err);
  ok("2 perfis em usuarios");

  const { error: cfgErr } = await supabase.from("configuracao_empresa").upsert(
    {
      tenant_id: tenantId,
      nome_fantasia: "Esteticar Center",
      cnpj: "12.345.678/0001-90",
      telefone: "(11) 4002-8922",
      email: "contato@esteticar.com.br",
      endereco: "Av. Paulista, 1000 - São Paulo/SP",
    },
    { onConflict: "tenant_id" }
  );
  if (cfgErr) fail("configuracao_empresa", cfgErr);
  ok("configuracao_empresa");

  const horario = [];
  for (let dia = 1; dia <= 6; dia++) {
    horario.push({ tenant_id: tenantId, dia_semana: dia, abertura: "08:00:00", fechamento: "18:00:00", ativo: true });
  }
  const { error: expErr } = await supabase.from("configuracao_expediente").insert(horario);
  if (expErr) fail("configuracao_expediente", expErr);
  ok("configuracao_expediente (seg a sab, dom fechado)");

  return { tenantId, admin };
}

async function criarServicos(tenantId) {
  log("\n[3/4] Injetando dados de demonstracao...");

  const servicos = [
    { nome_servico: "Lavagem Simples", descricao: "Lavagem externa com secagem", preco_base: 60, duracao_min: 30 },
    { nome_servico: "Lavagem Completa", descricao: "Lavagem externa e interna completa", preco_base: 120, duracao_min: 60 },
    { nome_servico: "Cera Premium", descricao: "Cera de carnauba com acabamento", preco_base: 180, duracao_min: 90 },
    { nome_servico: "Descontaminacao de Pintura", descricao: "Descontaminacao com argila", preco_base: 200, duracao_min: 120 },
    { nome_servico: "Higienizacao Interna", descricao: "Higienizacao de bancos e carpetes", preco_base: 250, duracao_min: 150 },
    { nome_servico: "Polimento Cristalizado", descricao: "Polimento em 2 etapas", preco_base: 350, duracao_min: 180 },
    { nome_servico: "Vitrificacao", descricao: "Vitrificacao de pintura com garantia", preco_base: 600, duracao_min: 240 },
  ].map((s) => ({ tenant_id: tenantId, ativo: true, ...s }));

  const { data, error } = await supabase.from("servico").insert(servicos).select("servico_id, nome_servico");
  if (error) fail("servicos", error);
  const mapa = Object.fromEntries(data.map((s) => [s.nome_servico, s.servico_id]));
  ok(`${data.length} servicos criados`);
  return mapa;
}

async function criarClientesEVeiculos(tenantId) {
  const clientes = [
    { nome: "Carlos Souza", telefone: "11987654321", email: "carlos.souza@email.com" },
    { nome: "Maria Oliveira", telefone: "11976543210", email: "maria.oliveira@email.com" },
    { nome: "João Pereira", telefone: "11912345678", email: "joao.pereira@email.com" },
    { nome: "Ana Costa", telefone: "11945678901", email: "ana.costa@email.com" },
    { nome: "Roberto Almeida", telefone: "11933332222" },
    { nome: "Fernanda Lima", telefone: "11998887777", email: "fernanda.lima@email.com" },
  ];

  const veiculos = [
    ["Carlos Souza", "ABC1D23", "Fiat", "Argo 1.3", 2021, "Branco"],
    ["Maria Oliveira", "DEF2E34", "Toyota", "Corolla XEi", 2022, "Preto"],
    ["João Pereira", "GHI3F45", "Chevrolet", "Onix Premier", 2020, "Prata"],
    ["Ana Costa", "JKL4G56", "Honda", "Civic Touring", 2023, "Cinza"],
    ["Roberto Almeida", "MNO5H67", "Jeep", "Compass Limited", 2024, "Vermelho"],
    ["Fernanda Lima", "PQR6J78", "VW", "T-Cross Comfortline", 2021, "Azul"],
  ];

  const clienteMap = {};
  for (const c of clientes) {
    const { data, error } = await supabase
      .from("clientes")
      .insert({ tenant_id: tenantId, ativo: true, ...c })
      .select("cliente_id, nome")
      .single();
    if (error) fail(`cliente ${c.nome}`, error);
    clienteMap[c.nome] = data.cliente_id;
  }
  ok(`${clientes.length} clientes criados`);

  const veiculoMap = {};
  for (const [cliente, placa, marca, modelo, ano, cor] of veiculos) {
    const { data, error } = await supabase
      .from("veiculos")
      .insert({ tenant_id: tenantId, cliente_id: clienteMap[cliente], placa, marca, modelo, ano, cor, ativo: true })
      .select("veiculo_id, placa")
      .single();
    if (error) fail(`veiculo ${placa}`, error);
    veiculoMap[placa] = data.veiculo_id;
  }
  ok(`${veiculos.length} veiculos criados`);

  return { clienteMap, veiculoMap };
}

async function criarAgendamentos(tenantId, admin, clienteMap, veiculoMap, servicoMap) {
  const C = clienteMap;
  const V = veiculoMap;
  const S = servicoMap;

  const { data: servicos, error: sErr } = await supabase.from("servico").select("servico_id, duracao_min");
  if (sErr) fail("servicos duracao", sErr);
  const dur = Object.fromEntries(servicos.map((x) => [x.servico_id, x.duracao_min]));

  const agendamentos = [
    // HOJE
    [addDays(0), "09:00:00", "Carlos Souza", "ABC1D23", "Lavagem Completa", "em_andamento"],
    [addDays(0), "15:00:00", "Maria Oliveira", "DEF2E34", "Cera Premium", "confirmado"],
    [addDays(0), "16:30:00", "Ana Costa", "JKL4G56", "Lavagem Simples", "pendente"],
    // AMANHA
    [addDays(1), "09:00:00", "João Pereira", "GHI3F45", "Higienizacao Interna", "confirmado"],
    [addDays(1), "11:30:00", "Roberto Almeida", "MNO5H67", "Lavagem Completa", "pendente"],
    [addDays(1), "13:00:00", "Fernanda Lima", "PQR6J78", "Polimento Cristalizado", "confirmado"],
    // D+2
    [addDays(2), "08:00:00", "Maria Oliveira", "DEF2E34", "Vitrificacao", "confirmado"],
    [addDays(2), "12:30:00", "Carlos Souza", "ABC1D23", "Lavagem Simples", "pendente"],
    [addDays(2), "14:00:00", "João Pereira", "GHI3F45", "Cera Premium", "confirmado"],
    // D+3
    [addDays(3), "10:00:00", "Ana Costa", "JKL4G56", "Descontaminacao de Pintura", "pendente"],
    // PASSADOS
    [addDays(-10), "09:00:00", "Carlos Souza", "ABC1D23", "Lavagem Completa", "finalizado"],
    [addDays(-9), "13:00:00", "Maria Oliveira", "DEF2E34", "Polimento Cristalizado", "finalizado", "Cliente pediu reforco na cera"],
    [addDays(-7), "10:00:00", "João Pereira", "GHI3F45", "Vitrificacao", "cancelado", "Cancelado por motivos pessoais"],
    [addDays(-5), "08:30:00", "Ana Costa", "JKL4G56", "Higienizacao Interna", "finalizado"],
    [addDays(-4), "14:00:00", "Roberto Almeida", "MNO5H67", "Lavagem Completa", "finalizado"],
    [addDays(-3), "09:00:00", "Fernanda Lima", "PQR6J78", "Vitrificacao", "finalizado", "Incluir hidratacao de bancos"],
    [addDays(-2), "11:00:00", "Ana Costa", "JKL4G56", "Lavagem Simples", "falta"],
    [addDays(-1), "15:00:00", "Maria Oliveira", "DEF2E34", "Cera Premium", "finalizado"],
  ];

  const agMap = {};
  for (const [data, hora, cliente, veiculo, servico, status, observacoes, fonte] of agendamentos) {
    const { data: ag, error } = await supabase
      .from("agendamentos")
      .insert({
        tenant_id: tenantId,
        cliente_id: C[cliente],
        veiculo_id: V[veiculo],
        servico_id: S[servico],
        duracao_min: dur[S[servico]],
        data_agendamento: data,
        hora_agendamento: hora,
        status,
        observacoes: observacoes ?? null,
        criado_por: admin.id,
      })
      .select("agendamento_id")
      .single();
    if (error) fail(`agendamento ${cliente} ${data} ${hora}`, error);
    const key = `${cliente}${data}${hora}`;
    if (!agMap[key]) agMap[key] = ag.agendamento_id;
  }
  ok(`${agendamentos.length} agendamentos criados`);
  return agMap;
}

async function criarOrdensEFaturamentos(tenantId, agMap) {
  const pastos = [
    ["Carlos Souza", "-10", "09:00:00", 120, true, [["Lavagem Completa Técnica", 1, 120]]],
    ["Maria Oliveira", "-9", "13:00:00", 350, false, [["Polimento Cristalizado", 1, 300], ["Reforço de cera", 1, 50]]],
    ["Ana Costa", "-5", "08:30:00", 250, true, [["Higienização Interna completa", 1, 250]]],
    ["Roberto Almeida", "-4", "14:00:00", 120, true, [["Lavagem Completa Técnica", 1, 120]]],
    ["Fernanda Lima", "-3", "09:00:00", 600, true, [["Módulo de vitrificação", 1, 550], ["Hidratação de bancos", 1, 50]]],
    ["Maria Oliveira", "-1", "15:00:00", 180, true, [["Cera Premium + acabamento", 1, 180]]],
  ];

  let osCount = 0;
  for (const [cliente, dia, hora, valorTotal, pago, itens] of pastos) {
    const agendamentoId = agMap[`${cliente}${addDays(Number(dia))}${hora}`];
    if (!agendamentoId) continue;

    const { data: os, error } = await supabase
      .from("ordens_servico")
      .insert({
        tenant_id: tenantId,
        agendamento_id: agendamentoId,
        status: "finalizado",
        observacoes: "Serviço concluído sem pendências",
        valor_total: valorTotal,
        criado_em: isoDaysAgo(Number(dia)),
      })
      .select("os_id")
      .single();
    if (error) fail("ordens_servico", error);
    osCount++;

    const { error: itemErr } = await supabase
      .from("itens_ordem_servico")
      .insert(itens.map(([descricao, quantidade, valor_unitario]) => ({ os_id: os.os_id, descricao, quantidade, valor_unitario, tenant_id: tenantId })));
    if (itemErr) fail("itens_ordem_servico", itemErr);

    const { error: fatErr } = await supabase
      .from("faturamentos")
      .insert({
        tenant_id: tenantId,
        os_id: os.os_id,
        valor_total: valorTotal,
        pago,
        data_pagamento: pago ? isoDaysAgo(Number(dia)) : null,
      });
    if (fatErr) fail("faturamentos", fatErr);
  }
  ok(`${osCount} ordens de servico + itens + faturamentos criados`);
}

async function criarFinanceiro(tenantId) {
  const mes = new Date().toISOString().slice(0, 7);
  const cntas = [
    { descricao: "Aluguel do galpão", valor: 2800, data_vencimento: addDays(10), pago: false, observacoes: "Mensalidade de outubro" },
    { descricao: "Energia elétrica", valor: 480, data_vencimento: addDays(5), pago: false },
    { descricao: "Água e esgoto", valor: 220, data_vencimento: addDays(-3), pago: true, data_pagamento: isoDaysAgo(-1) },
    { descricao: "Internet fibra", valor: 140, data_vencimento: addDays(15), pago: false },
    { descricao: "Produtos de higienização", valor: 950, data_vencimento: addDays(-12), pago: true, data_pagamento: isoDaysAgo(-8) },
    { descricao: "Comissão da equipe", valor: 1200, data_vencimento: addDays(2), pago: false, observacoes: `Referente a ${mes}` },
    { descricao: "Manutenção de equipamentos", valor: 350, data_vencimento: addDays(-2), pago: true, data_pagamento: isoDaysAgo(-2) },
  ];
  const { error } = await supabase.from("contas_pagar").insert(cntas.map((c) => ({ tenant_id: tenantId, ...c })));
  if (error) fail("contas_pagar", error);
  ok("7 contas a pagar criadas");
}

async function criarAuxiliares(tenantId) {
  const { error: nErr } = await supabase.from("notificacoes").insert([
    { tenant_id: tenantId, tipo: "contas", titulo: "Conta a vencer", mensagem: "O aluguel do galpão vence em 10 dias.", lida: false },
    { tenant_id: tenantId, tipo: "agendamento", titulo: "Novo agendamento", mensagem: "Maria Oliveira confirmou Polimento Cristalizado para amanhã.", lida: false },
    { tenant_id: tenantId, tipo: "lembrete", titulo: "Cliente sem WhatsApp", mensagem: "Roberto Almeida não possui telefone para receber lembretes.", lida: true },
  ]);
  if (nErr) fail("notificacoes", nErr);
  ok("3 notificações criadas");

  const { error: dErr } = await supabase.from("datas_bloqueadas").insert([
    { tenant_id: tenantId, data: addDays(7), motivo: "Feriado municipal" },
    { tenant_id: tenantId, data: addDays(21), motivo: "Reforma no galpão" },
  ]);
  if (dErr) fail("datas_bloqueadas", dErr);
  ok("2 datas bloqueadas criadas");
}

async function criarChatbot(tenantId, clienteMap) {
  const { data: s1, error: e1 } = await supabase
    .from("chatbot_session")
    .insert({
      tenant_id: tenantId,
      remote_jid: "5511987654321@s.whatsapp.net",
      numero_origem: "11940028922",
      client_phone: "11987654321",
      client_name: "Carlos Souza",
      cliente_id: clienteMap["Carlos Souza"],
      state: "MENU_PRINCIPAL",
      ultima_mensagem: "Ok! Quando deseja agendar?",
      ativo: true,
      ultima_atividade: isoDaysAgo(-1),
      criado_em: isoDaysAgo(-2),
    })
    .select("id")
    .single();
  if (e1) fail("chatbot_session 1", e1);

  const { data: s2, error: e2 } = await supabase
    .from("chatbot_session")
    .insert({
      tenant_id: tenantId,
      remote_jid: "5511943218765@s.whatsapp.net",
      numero_origem: "11940028922",
      client_phone: "11943218765",
      client_name: "Bia Alves",
      state: "FALANDO_COM_ATENDENTE",
      atendente_engajado: true,
      ultima_mensagem: "O polimento fica pronto em 3 horas.",
      ativo: true,
      ultima_atividade: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (e2) fail("chatbot_session 2", e2);

  const msgs = [
    [s1.id, "cliente", "Olá! Gostaria de agendar uma lavagem completa para sexta-feira.", isoDaysAgo(-2)],
    [s1.id, "bot", "Olá, Carlos! Qual o melhor horário para você?", isoDaysAgo(-2)],
    [s1.id, "cliente", "Pode ser às 9h.", isoDaysAgo(-1)],
    [s1.id, "bot", "Perfeito! Certinho às 9h para Lavagem Completa. Confirmo?", isoDaysAgo(-1)],
    [s1.id, "cliente", "Confirmo, obrigado!", isoDaysAgo(-1)],
    [s1.id, "bot", "Ok! Quando deseja agendar?", isoDaysAgo(-1)],
    [s2.id, "cliente", "Quanto tempo demora um polimento cristalizado?", new Date().toISOString()],
    [s2.id, "bot", "Em média 3 horas. Gostaria de falar com um atendente?", new Date().toISOString()],
    [s2.id, "cliente", "Sim, por favor.", new Date().toISOString()],
    [s2.id, "atendente", "Olá Bia! O polimento fica pronto em 3 horas. Posso agendar?", new Date().toISOString()],
  ];
  const { error: me } = await supabase
    .from("chatbot_mensagem")
    .insert(msgs.map(([session_id, remetente, texto, criado_em]) => ({ tenant_id: tenantId, session_id, remetente, texto, criado_em })));
  if (me) fail("chatbot_mensagem", me);
  ok("2 sessões de chatbot + 10 mensagens criadas");
}

async function criarComunicados(tenantId, clienteMap) {
  const { data: com, error: ce } = await supabase
    .from("comunicados")
    .insert({
      tenant_id: tenantId,
      numero_origem: "11940028922",
      mensagem: "Olá! Este mês temos promoção: Lavagem Completa por R$ 99,99 🚗✨ Corra e agende!",
      filtro: "todos",
      total_destinatarios: 4,
      enviados: 4,
      falhas: 0,
      status: "concluido",
      criado_em: isoDaysAgo(-2),
      concluido_em: isoDaysAgo(-2),
    })
    .select("comunicado_id")
    .single();
  if (ce) fail("comunicados", ce);

  const dests = [
    ["Carlos Souza", "11987654321", "5511987654321@s.whatsapp.net"],
    ["Maria Oliveira", "11976543210", "5511976543210@s.whatsapp.net"],
    ["João Pereira", "11912345678", "5511912345678@s.whatsapp.net"],
    ["Ana Costa", "11945678901", "5511945678901@s.whatsapp.net"],
  ];
  const { error: de } = await supabase
    .from("comunicados_destinatarios")
    .insert(dests.map(([nome, telefone, jid]) => ({ comunicado_id: com.comunicado_id, tenant_id: tenantId, cliente_id: clienteMap[nome], cliente_nome: nome, telefone, jid, status: "enviado", enviado_em: isoDaysAgo(-2) })));
  if (de) fail("comunicados_destinatarios", de);
  ok("1 comunicado + 4 destinatários criados");
}

async function validar() {
  log("\n[4/4] Validando dados...");
  const tables = [
    "tenants", "usuarios", "clientes", "veiculos", "servico", "agendamentos",
    "ordens_servico", "itens_ordem_servico", "faturamentos", "contas_pagar",
    "notificacoes", "configuracao_expediente", "datas_bloqueadas",
    "configuracao_empresa", "chatbot_session", "chatbot_mensagem",
    "comunicados", "comunicados_destinatarios",
  ];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    if (error) {
      console.warn(`  ${t}: ${error.message}`);
      continue;
    }
    log(`  ${t}: ${count}`);
  }
}

async function main() {
  log("=== SEED DE DEMONSTRACAO ESTETICAR ===");
  await wipeEverything();
  const { tenantId, admin } = await criarEstruturaBasica();
  const servicoMap = await criarServicos(tenantId);
  const { clienteMap, veiculoMap } = await criarClientesEVeiculos(tenantId);
  const agMap = await criarAgendamentos(tenantId, admin, clienteMap, veiculoMap, servicoMap);
  await criarOrdensEFaturamentos(tenantId, agMap);
  await criarFinanceiro(tenantId);
  await criarAuxiliares(tenantId);
  await criarChatbot(tenantId, clienteMap);
  await criarComunicados(tenantId, clienteMap);
  await validar();

  log("\n=== SEED CONCLUÍDO ===");
  log("Acessos:");
  log("  Admin:       nikita@xmail.com / 12345678");
  log("  Funcionario: funcionario@xmail.com / 12345678");
}

main().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});