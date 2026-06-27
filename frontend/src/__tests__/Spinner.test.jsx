import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FullPageSpinner, InlineSpinner } from "../components/ui/Spinner";

describe("FullPageSpinner", () => {
  it("renderiza o spinner", () => {
    const { container } = render(<FullPageSpinner />);
    expect(container.querySelector(".fullpage-spinner")).toBeInTheDocument();
    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });

  it("renderiza mensagem quando fornecida", () => {
    render(<FullPageSpinner message="Carregando dados..." />);
    expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
  });

  it("nao renderiza mensagem quando nao fornecida", () => {
    const { container } = render(<FullPageSpinner />);
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });
});

describe("InlineSpinner", () => {
  it("renderiza o spinner inline", () => {
    const { container } = render(<InlineSpinner />);
    expect(container.querySelector(".btn-spinner")).toBeInTheDocument();
  });
});
