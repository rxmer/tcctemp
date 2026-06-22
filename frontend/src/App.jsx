

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { Login } from "./pages/Login";
import { Cadastro } from "./pages/Cadastro";
import { Funcionario } from "./pages/funcionarios";
import { Servicos } from "./pages/servicos";
import { Dashboard } from "./pages/Dashboard";
import "./styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas — redirecionam para /dashboard se já autenticado */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
          </Route>

          {/* Rotas autenticadas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Admin only */}
              <Route path="/servicos" element={<Servicos />} />

              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/funcionarios" element={<Funcionario />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
