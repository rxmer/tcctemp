import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Input } from "../components/ui/Input";

describe("Input", () => {
  it("renderiza o label quando fornecido", () => {
    render(<Input label="Nome" name="nome" />);
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });

  it("renderiza input sem label", () => {
    render(<Input name="semlabel" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("aplica classe error quando error e true", () => {
    render(<Input name="erro" error="Campo obrigatorio" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("error");
  });

  it("mostra mensagem de erro", () => {
    render(<Input name="erro" error="Campo obrigatorio" />);
    expect(screen.getByText("Campo obrigatorio")).toBeInTheDocument();
  });

  it("chama onChange ao digitar", async () => {
    const onChange = vi.fn();
    render(<Input name="teste" onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("usa o id fornecido no label e input", () => {
    render(<Input id="custom-id" label="Email" name="email" />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("id")).toBe("custom-id");
  });

  it("repassa props como placeholder e type", () => {
    render(<Input name="senha" type="password" placeholder="Digite a senha" />);
    const input = screen.getByPlaceholderText("Digite a senha");
    expect(input.getAttribute("type")).toBe("password");
  });
});
