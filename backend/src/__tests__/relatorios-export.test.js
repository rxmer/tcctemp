import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/relatorios.service.js", () => ({
  relatorioGeral: vi.fn(),
  relatorioAgendamentos: vi.fn(),
  relatorioServicos: vi.fn(),
  relatorioFinanceiro: vi.fn(),
  relatorioStatus: vi.fn(),
  relatorioClientesFrequentes: vi.fn(),
}));

vi.mock("../config/supabase.js", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { nome_fantasia: "EstetiCar Teste", cnpj: null, endereco: null, telefone: null, email: null, logo_url: null },
        error: null,
      }),
    })),
  },
}));

import ExcelJS from "exceljs";
import * as exportService from "../services/relatorios-export.service.js";
import * as relatoriosService from "../services/relatorios.service.js";

const DADOS_GERAIS = {
  agendamentos: [
    {
      periodo: "2026-08-20",
      total: 2,
      por_status: { pendente: 1, confirmado: 0, em_andamento: 0, finalizado: 1, cancelado: 0 },
    },
  ],
  servicos: [{ nome: "Polimento", quantidade: 3, receita: 750 }],
  financeiro: [{ mes: "2026-08", receitas: 750, despesas: 100, recebido: 500, pago: 100 }],
  status: [
    { status: "pendente", label: "Pendente", quantidade: 1 },
    { status: "finalizado", label: "Finalizado", quantidade: 1 },
  ],
  clientes_frequentes: [{ cliente_id: 1, nome: "Ana", telefone: "11988887777", quantidade: 4 }],
};

describe("relatorios-export - filtro por tipo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    relatoriosService.relatorioGeral.mockResolvedValue(DADOS_GERAIS);
    relatoriosService.relatorioAgendamentos.mockResolvedValue(DADOS_GERAIS.agendamentos);
    relatoriosService.relatorioServicos.mockResolvedValue(DADOS_GERAIS.servicos);
    relatoriosService.relatorioFinanceiro.mockResolvedValue(DADOS_GERAIS.financeiro);
    relatoriosService.relatorioStatus.mockResolvedValue(DADOS_GERAIS.status);
    relatoriosService.relatorioClientesFrequentes.mockResolvedValue(DADOS_GERAIS.clientes_frequentes);
  });

  async function nomesSheets(buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    return wb.worksheets.map((w) => w.name);
  }

  it("excel geral contém todas as abas", async () => {
    const buffer = await exportService.gerarExcel("t1", {});
    expect(await nomesSheets(buffer)).toEqual([
      "Agendamentos",
      "Serviços",
      "Financeiro",
      "Status",
      "Clientes Frequentes",
    ]);
    expect(relatoriosService.relatorioGeral).toHaveBeenCalled();
  });

  it("excel de agendamentos contém apenas a aba de agendamentos", async () => {
    const buffer = await exportService.gerarExcel("t1", { tipo: "agendamentos" });
    expect(await nomesSheets(buffer)).toEqual(["Agendamentos"]);
    expect(relatoriosService.relatorioAgendamentos).toHaveBeenCalled();
    expect(relatoriosService.relatorioGeral).not.toHaveBeenCalled();
    expect(relatoriosService.relatorioFinanceiro).not.toHaveBeenCalled();
  });

  it("excel de serviços contém apenas a aba de serviços", async () => {
    const buffer = await exportService.gerarExcel("t1", { tipo: "servicos" });
    expect(await nomesSheets(buffer)).toEqual(["Serviços"]);
    expect(relatoriosService.relatorioServicos).toHaveBeenCalled();
  });

  it("excel de clientes frequentes contém apenas a aba correspondente", async () => {
    const buffer = await exportService.gerarExcel("t1", { tipo: "clientes_frequentes" });
    expect(await nomesSheets(buffer)).toEqual(["Clientes Frequentes"]);
    expect(relatoriosService.relatorioClientesFrequentes).toHaveBeenCalled();
  });

  it("tipo desconhecido cai no geral", async () => {
    const buffer = await exportService.gerarExcel("t1", { tipo: "xyz" });
    expect(await nomesSheets(buffer)).toHaveLength(5);
    expect(relatoriosService.relatorioGeral).toHaveBeenCalled();
  });

  it("pdf específico gera buffer sem chamar o relatorio geral", async () => {
    const buffer = await exportService.gerarPDF("t1", { tipo: "financeiro" });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(relatoriosService.relatorioFinanceiro).toHaveBeenCalled();
    expect(relatoriosService.relatorioGeral).not.toHaveBeenCalled();
  });

  it("pdf geral gera buffer com todas as seções", async () => {
    const buffer = await exportService.gerarPDF("t1", {});

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(relatoriosService.relatorioGeral).toHaveBeenCalled();
  });
});
