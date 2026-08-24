import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Login } from "../pages/Login";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockResetPasswordForEmail = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabase: { auth: { resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args) } },
}));

const mockVerificarEmail = vi.fn();
vi.mock("../services/auth.service", () => ({
  authService: { verificarEmail: (...args) => mockVerificarEmail(...args) },
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
    mockVerificarEmail.mockResolvedValue({ existe: true });
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

  it("mostra erro traduzido quando signIn falha com outra mensagem", async () => {
    const signIn = vi.fn().mockRejectedValue(new Error("Network error"));
    useAuth.mockReturnValue({ signIn });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível conectar/i);
    });
  });

  it("abre formulario de recuperacao ao clicar em esqueci minha senha", () => {
    renderLogin();
    fireEvent.click(screen.getByText(/esqueci minha senha/i));
    expect(screen.getByText(/recuperar senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar link de recuperação/i })).toBeInTheDocument();
  });

  it("envia email de recuperacao", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    renderLogin();

    fireEvent.click(screen.getByText(/esqueci minha senha/i));
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "teste@test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar link de recuperação/i }));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "teste@test.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/redefinir-senha") })
      );
      expect(screen.getByText(/link de recuperação/i)).toBeInTheDocument();
    });
  });

  it("mostra erro e nao envia email quando o email nao esta cadastrado", async () => {
    mockVerificarEmail.mockResolvedValue({ existe: false });
    renderLogin();

    fireEvent.click(screen.getByText(/esqueci minha senha/i));
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "inexistente@test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar link de recuperação/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("não está cadastrado no sistema");
    });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("volta ao login com aviso quando a senha e redefinida em outra aba", async () => {
    renderLogin();
    fireEvent.click(screen.getByText(/esqueci minha senha/i));
    expect(screen.getByText(/recuperar senha/i)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "esteticar-senha-redefinida",
          newValue: String(Date.now()),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/senha alterada/i);
    });
  });

  it("volta para o login a partir da recuperacao", () => {
    renderLogin();
    fireEvent.click(screen.getByText(/esqueci minha senha/i));
    fireEvent.click(screen.getByText(/voltar para o login/i));
    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
  });
});
