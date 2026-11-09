import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PasswordInput } from "../components/ui/PasswordInput";

describe("PasswordInput", () => {
  it("comeca oculto com icone de olho aberto", () => {
    render(<PasswordInput label="Senha" name="senha" />);
    const input = screen.getByLabelText("Senha");
    expect(input.getAttribute("type")).toBe("password");
    expect(screen.getByRole("button", { name: /mostrar senha/i })).toBeInTheDocument();
  });

  it("revela a senha ao clicar e permite ocultar de novo", async () => {
    render(<PasswordInput label="Senha" name="senha" />);
    const input = screen.getByLabelText("Senha");

    await userEvent.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(input.getAttribute("type")).toBe("text");
    expect(screen.getByRole("button", { name: /ocultar senha/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /ocultar senha/i }));
    expect(input.getAttribute("type")).toBe("password");
  });

  it("mantem onChange e demais props", async () => {
    const onChange = vi.fn();
    render(<PasswordInput label="Nova senha" name="nova" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Nova senha"), "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
