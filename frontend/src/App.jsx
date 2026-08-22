
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { FullPageSpinner } from "./components/ui";
import "./styles/global.css";

const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Cadastro = lazy(() => import("./pages/Cadastro").then((m) => ({ default: m.Cadastro })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Clientes = lazy(() => import("./pages/clientes").then((m) => ({ default: m.Clientes })));
const Servicos = lazy(() => import("./pages/servicos").then((m) => ({ default: m.Servicos })));
const Veiculos = lazy(() => import("./pages/veiculos").then((m) => ({ default: m.Veiculos })));
const Agendamentos = lazy(() => import("./pages/agendamentos").then((m) => ({ default: m.Agendamentos })));
const OrdensServico = lazy(() => import("./pages/ordens-servico").then((m) => ({ default: m.OrdensServico })));
const Financeiro = lazy(() => import("./pages/financeiro").then((m) => ({ default: m.Financeiro })));
const Expediente = lazy(() => import("./pages/expediente").then((m) => ({ default: m.Expediente })));
const Feriados = lazy(() => import("./pages/feriados").then((m) => ({ default: m.Feriados })));
const ConfiguracaoEmpresa = lazy(() => import("./pages/configuracao-empresa").then((m) => ({ default: m.ConfiguracaoEmpresa })));
const Relatorios = lazy(() => import("./pages/relatorios").then((m) => ({ default: m.Relatorios })));
const Funcionario = lazy(() => import("./pages/funcionarios").then((m) => ({ default: m.Funcionario })));
const WhatsApp = lazy(() => import("./pages/whatsapp").then((m) => ({ default: m.WhatsApp })));
const WhatsAppConversas = lazy(() => import("./pages/whatsapp-conversas").then((m) => ({ default: m.WhatsAppConversas })));
const Perfil = lazy(() => import("./pages/perfil").then((m) => ({ default: m.Perfil })));

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<FullPageSpinner message="Carregando..." />}>
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
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/servicos" element={<Servicos />} />
                  <Route path="/veiculos" element={<Veiculos />} />
                <Route path="/agendamentos" element={<Agendamentos />} />
                <Route path="/ordens-servico" element={<OrdensServico />} />

                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/funcionarios" element={<Funcionario />} />
                  <Route path="/expediente" element={<Expediente />} />
                  <Route path="/feriados" element={<Feriados />} />
                  <Route path="/configuracao-empresa" element={<ConfiguracaoEmpresa />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/whatsapp/conversas" element={<WhatsAppConversas />} />
                </Route>
                <Route path="/perfil" element={<Perfil />} />
                </Route>
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
