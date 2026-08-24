import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RedefinirSenha } from "../pages/redefinir-senha";

const mockGetSession = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      updateUser: (...args) => mockUpdateUser(...args),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}));

vi.mock("../styles/pages/Login.module.css", () => ({
  default: new Proxy({}, { get: (_, prop) => String(prop) }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RedefinirSenha />
    </MemoryRouter>
  );
}

describe("RedefinirSenha page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({});
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("mostra mensagem de link invalido quando nao ha sessao", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
    });
  });

  it("mostra link invalido quando a url traz error_description", async () => {
    window.history.replaceState({}, "", "/redefinir-senha?error_description=Email%20link%20is%20invalid");
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
    });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("aguarda troca do code do link antes de mostrar formulario", async () => {
    window.history.replaceState({}, "", "/redefinir-senha?code=abc123");
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    renderPage();

    await waitFor(
      () => {
        expect(screen.getByText(/verificando link|redefinir senha/i)).toBeTruthy();
        expect(screen.getByText(/redefinir senha/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    expect(mockGetSession.mock.calls.length).toBeGreaterThanOrEqual(2);

    window.history.replaceState({}, "", "/");
  });

  it("exibe formulario quando sessao de recuperacao existe", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/redefinir senha/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^nova senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar nova senha/i)).toBeInTheDocument();
  });

  it("valida senhas diferentes", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    renderPage();
    await waitFor(() => screen.getByLabelText(/^nova senha$/i));

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senhaNova123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "outra456" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/não coincidem/i);
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("valida tamanho minimo da senha", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    renderPage();
    await waitFor(() => screen.getByLabelText(/^nova senha$/i));

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/mínimo 8 caracteres/i);
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("redefine a senha com sucesso e encerra sessao", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
    renderPage();
    await waitFor(() => screen.getByLabelText(/^nova senha$/i));

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senhaNova123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "senhaNova123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "senhaNova123" });
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByText(/senha redefinida!/i)).toBeInTheDocument();
      expect(screen.getByText(/pode fechar esta aba/i)).toBeInTheDocument();
    });
    expect(localStorage.getItem("esteticar-senha-redefinida")).toBeTruthy();
  });

  it("nao redireciona automaticamente apos redefinir", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
    renderPage();
    await waitFor(() => screen.getByLabelText(/^nova senha$/i));

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senhaNova123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "senhaNova123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByText(/senha redefinida!/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /ir para o login/i })).toBeInTheDocument();
  });

  it("mostra erro quando updateUser falha", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockUpdateUser.mockResolvedValue({ data: null, error: new Error("Erro no auth") });
    renderPage();
    await waitFor(() => screen.getByLabelText(/^nova senha$/i));

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senhaNova123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "senhaNova123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Erro no auth");
    });
  });

  it("traduz erro de senha igual a anterior", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: new Error("New password should be different from the old password."),
    });
    renderPage();
    await waitFor(() => screen.getByLabelText(/^nova senha$/i));

    fireEvent.change(screen.getByLabelText(/^nova senha$/i), { target: { value: "senhaNova123" } });
    fireEvent.change(screen.getByLabelText(/confirmar nova senha/i), { target: { value: "senhaNova123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/deve ser diferente da senha atual/i);
    });
  });
});

