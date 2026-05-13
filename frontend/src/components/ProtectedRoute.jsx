import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// Spinner centralizado — extraído para reutilização
function FullPageSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0f0f0f",
      }}
    >
      <div className="spinner" />
    </div>
  );
}

// Protege rotas autenticadas
export function ProtectedRoute({ adminOnly = false }) {
  const { loading, user, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { loading, user } = useAuth();

  if (loading) return <FullPageSpinner />;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
