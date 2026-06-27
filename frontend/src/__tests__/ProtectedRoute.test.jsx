import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute, PublicRoute } from "../components/ProtectedRoute";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../components/ui", () => ({
  FullPageSpinner: () => <div data-testid="spinner">Carregando...</div>,
}));

import { useAuth } from "../context/useAuth";

function renderWithRouter(ui, { route = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("mostra spinner enquanto carrega", () => {
    useAuth.mockReturnValue({ loading: true, user: null, isAdmin: false });
    renderWithRouter(<ProtectedRoute />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("redireciona para /login quando nao autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: null, isAdmin: false });
    renderWithRouter(<ProtectedRoute />, { route: "/dashboard" });
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("renderiza Outlet quando autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 }, isAdmin: false });
    renderWithRouter(
      <ProtectedRoute>
        <div>Conteudo protegido</div>
      </ProtectedRoute>
    );
  });

  it("redireciona para /dashboard quando adminOnly e nao e admin", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 }, isAdmin: false });
    renderWithRouter(<ProtectedRoute adminOnly />, { route: "/admin" });
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("renderiza quando adminOnly e e admin", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 }, isAdmin: true });
    renderWithRouter(
      <ProtectedRoute adminOnly>
        <div>Admin area</div>
      </ProtectedRoute>
    );
  });
});

describe("PublicRoute", () => {
  it("mostra spinner enquanto carrega", () => {
    useAuth.mockReturnValue({ loading: true, user: null });
    renderWithRouter(<PublicRoute />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("redireciona para /dashboard quando autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: { id: 1 } });
    renderWithRouter(<PublicRoute />, { route: "/login" });
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("renderiza Outlet quando nao autenticado", () => {
    useAuth.mockReturnValue({ loading: false, user: null });
    renderWithRouter(
      <PublicRoute>
        <div>Login page</div>
      </PublicRoute>
    );
  });
});
