import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "../components/ui/PageHeader";

describe("PageHeader", () => {
  it("renderiza o titulo", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dashboard");
  });

  it("renderiza o subtitulo quando fornecido", () => {
    render(<PageHeader title="Clientes" subtitle="Gerenciar clientes" />);
    expect(screen.getByText("Gerenciar clientes")).toBeInTheDocument();
  });

  it("nao renderiza subtitulo quando nao fornecido", () => {
    const { container } = render(<PageHeader title="Clientes" />);
    expect(container.querySelector(".page-sub")).not.toBeInTheDocument();
  });

  it("renderiza acao quando fornecida", () => {
    render(<PageHeader title="Clientes" action={<button>Novo</button>} />);
    expect(screen.getByRole("button", { name: "Novo" })).toBeInTheDocument();
  });

  it("nao renderiza acao quando nao fornecida", () => {
    const { container } = render(<PageHeader title="Clientes" />);
    expect(container.querySelector(".page-action")).not.toBeInTheDocument();
  });
});
