import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../components/ui/Button";

describe("Button", () => {
  it("renderiza o texto children", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("renderiza com variant primary por padrao", () => {
    render(<Button>Ok</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn-primary");
  });

  it("renderiza com variant ghost quando especificado", () => {
    render(<Button variant="ghost">Cancelar</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn-ghost");
  });

  it("aplica btn-full quando fullWidth e true", () => {
    render(<Button fullWidth>Cheio</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn-full");
  });

  it("desabilita o botao quando loading e true", () => {
    render(<Button loading>Carregando</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });

  it("mostra spinner quando loading", () => {
    render(<Button loading>Salvar</Button>);
    expect(document.querySelector(".btn-spinner")).toBeInTheDocument();
  });

  it("desabilita com prop disabled", () => {
    render(<Button disabled>Ok</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("chama onClick ao clicar", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("nao chama onClick quando disabled", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Clique</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("repassa props extras para o elemento button", () => {
    render(<Button data-testid="meu-botao" type="submit">Enviar</Button>);
    const btn = screen.getByTestId("meu-botao");
    expect(btn.getAttribute("type")).toBe("submit");
  });
});
