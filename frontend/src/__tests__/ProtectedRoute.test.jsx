import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute, PublicRoute } from "../components/ProtectedRoute";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../components/ui", () => ({
  FullPageSpinner: () => <div data-testid="spinner">Carregando...</div>,
}));

import { useAuth } from "../context/useAuth";

function renderComRotas(element, conteudoOutlet = null) {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="*" element={element}>
          {conteudoOutlet && <Route path="*" element={conteudoOutlet} />}
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra spinner enquanto carrega", () => {
    useAuth.mockReturnValue({ loading: true, user: null, isAdmin: false });
    renderComRotas(<ProtectedRoute />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("redireciona para /login quando nao autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: null, isAdmin: false });
    renderComRotas(<ProtectedRoute />);
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renderiza Outlet quando autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 }, isAdmin: false });
    renderComRotas(<ProtectedRoute />, <div>Conteudo protegido</div>);
    expect(screen.getByText("Conteudo protegido")).toBeInTheDocument();
  });

  it("redireciona para /dashboard quando adminOnly e nao e admin", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 }, isAdmin: false });
    renderComRotas(<ProtectedRoute adminOnly />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renderiza quando adminOnly e e admin", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 }, isAdmin: true });
    renderComRotas(<ProtectedRoute adminOnly />, <div>Admin area</div>);
    expect(screen.getByText("Admin area")).toBeInTheDocument();
  });
});

describe("PublicRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra spinner enquanto carrega", () => {
    useAuth.mockReturnValue({ loading: true, user: null });
    renderComRotas(<PublicRoute />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("redireciona para /dashboard quando autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 } });
    renderComRotas(<PublicRoute />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renderiza Outlet quando nao autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: null });
    renderComRotas(<PublicRoute />, <div>Pagina publica</div>);
    expect(screen.getByText("Pagina publica")).toBeInTheDocument();
  });
});
