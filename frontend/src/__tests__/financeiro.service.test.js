import { describe, it, expect, vi, beforeEach } from "vitest";
import { financeiroService } from "../services/financeiro.service";

vi.mock("../services/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../services/api";

describe("financeiroService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resumo chama apiFetch com url basica", () => {
    financeiroService.resumo();
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/resumo");
  });

  it("resumo passa datas como query params", () => {
    financeiroService.resumo({ data_inicio: "2026-01-01", data_fim: "2026-12-31" });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("data_inicio=2026-01-01");
    expect(url).toContain("data_fim=2026-12-31");
  });

  it("listarContas chama apiFetch com url basica", () => {
    financeiroService.listarContas();
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/contas");
  });

  it("listarContas passa todos os parametros", () => {
    financeiroService.listarContas({ data_inicio: "2026-01-01", pago: true, page: 1, limit: 10 });
    const url = apiFetch.mock.calls[0][0];
    expect(url).toContain("data_inicio=2026-01-01");
    expect(url).toContain("pago=true");
    expect(url).toContain("page=1");
    expect(url).toContain("limit=10");
  });

  it("criarConta chama apiFetch com POST e body", () => {
    const dados = { descricao: "Conta luz", valor: 200 };
    financeiroService.criarConta(dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/contas", {
      method: "POST",
      body: JSON.stringify(dados),
    });
  });

  it("atualizarConta chama apiFetch com PUT e body", () => {
    const dados = { valor: 250 };
    financeiroService.atualizarConta(1, dados);
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/contas/1", {
      method: "PUT",
      body: JSON.stringify(dados),
    });
  });

  it("pagarConta chama apiFetch com PATCH", () => {
    financeiroService.pagarConta(3);
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/contas/3/pagar", {
      method: "PATCH",
    });
  });

  it("deletarConta chama apiFetch com DELETE", () => {
    financeiroService.deletarConta(2);
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/contas/2", {
      method: "DELETE",
    });
  });

  it("listarFaturamentos chama apiFetch com url basica", () => {
    financeiroService.listarFaturamentos();
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/faturamentos");
  });

  it("receberFaturamento chama apiFetch com PATCH e data_pagamento", () => {
    financeiroService.receberFaturamento(5, "2026-06-27");
    expect(apiFetch).toHaveBeenCalledWith("/api/financeiro/faturamentos/5/receber", {
      method: "PATCH",
      body: JSON.stringify({ data_pagamento: "2026-06-27" }),
    });
  });
});
