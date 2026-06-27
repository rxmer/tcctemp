import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Alert } from "../components/ui/Alert";

describe("Alert", () => {
  it("renderiza o texto children", () => {
    render(<Alert>Erro ao salvar</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Erro ao salvar");
  });

  it("renderiza com variant error por padrao", () => {
    render(<Alert>Erro</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("alert-error");
  });

  it("renderiza com variant success quando especificado", () => {
    render(<Alert variant="success">Sucesso</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("alert-success");
  });

  it("renderiza com variant warning", () => {
    render(<Alert variant="warning">Atenção</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("alert-warning");
  });

  it("renderiza icone de aviso", () => {
    render(<Alert>Mensagem</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("⚠");
  });
});
