import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Mostra spinner enquanto verifica sessão
  if (loading) {
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

  // Não autenticado → redireciona para /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rota admin-only mas usuário não é admin
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
