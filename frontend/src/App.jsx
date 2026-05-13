// src/App.jsx
//
// MUDANÇAS vs versão anterior:
// 1. Rotas /login e /cadastro agora envolvidas em <PublicRoute>.
//    Usuário autenticado que acessar essas rotas é automaticamente
//    redirecionado para /dashboard sem carregar o componente.
// 2. Rota "/" redireciona para /dashboard em vez de /login —
//    deixa o PublicRoute/ProtectedRoute decidir para onde ir,
//    em vez de forçar /login para usuários autenticados.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { Login } from "./pages/Login";
import { Cadastro } from "./pages/Cadastro";
import { Funcionario } from "./pages/funcionarios";
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
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/funcionarios" element={<Funcionario />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback: deixa o sistema de guards decidir */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
