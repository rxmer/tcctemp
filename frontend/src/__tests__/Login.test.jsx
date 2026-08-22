import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Login } from "../pages/Login";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../styles/pages/Login.module.css", () => ({
  default: {
    splitLayout: "splitLayout",
    splitBrand: "splitBrand",
    brandBg: "brandBg",
    brandContent: "brandContent",
    brandIconWrapper: "brandIconWrapper",
    brandTitle: "brandTitle",
    brandTagline: "brandTagline",
    brandFeatures: "brandFeatures",
    brandFeature: "brandFeature",
    splitForm: "splitForm",
    formContainer: "formContainer",
    formHeader: "formHeader",
    authForm: "authForm",
    authFooterText: "authFooterText",
  },
}));

import { useAuth } from "../context/useAuth";

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      signIn: vi.fn(),
    });
  });

  it("renderiza campos de email e senha", () => {
    renderLogin();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it("renderiza botao de entrar", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("renderiza link para cadastro", () => {
    renderLogin();
    expect(screen.getByText(/cadastrar empresa/i)).toBeInTheDocument();
  });

  it("atualiza campos ao digitar", () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/e-mail/i);
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    expect(emailInput.value).toBe("test@test.com");
  });

  it("chama signIn ao submeter o formulario", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ signIn });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({ email: "test@test.com", senha: "123456" });
    });
  });

  it("mostra erro quando signIn falha", async () => {
    const signIn = vi.fn().mockRejectedValue(new Error("Invalid login credentials"));
    useAuth.mockReturnValue({ signIn });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos");
    });
  });

  it("mostra erro generico quando signIn falha com outra mensagem", async () => {
    const signIn = vi.fn().mockRejectedValue(new Error("Network error"));
    useAuth.mockReturnValue({ signIn });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });
});
