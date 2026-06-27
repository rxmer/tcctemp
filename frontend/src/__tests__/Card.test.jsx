import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card } from "../components/ui/Card";

describe("Card", () => {
  it("renderiza o texto children", () => {
    render(<Card>Conteudo do card</Card>);
    expect(screen.getByText("Conteudo do card")).toBeInTheDocument();
  });

  it("aplica className adicional", () => {
    render(<Card className="custom">Texto</Card>);
    const card = screen.getByText("Texto");
    expect(card.className).toContain("auth-card");
    expect(card.className).toContain("custom");
  });

  it("renderiza com auth-card por padrao", () => {
    render(<Card>Texto</Card>);
    const card = screen.getByText("Texto");
    expect(card.className).toContain("auth-card");
  });

  it("repassa props extras", () => {
    render(<Card data-testid="meu-card">Texto</Card>);
    expect(screen.getByTestId("meu-card")).toBeInTheDocument();
  });
});
