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

  it("mostra mensagem de link invalido quando nao ha sessao", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
    });
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
    });
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
});

