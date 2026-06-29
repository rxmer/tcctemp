import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Input, Button, Alert } from "../components/ui";
import styles from "../styles/pages/Login.module.css";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await signIn(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErro(
        err?.message?.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitLayout}>
      <div className={styles.splitBrand}>
        <div className={styles.brandBg}>
          <div className={styles.brandContent}>
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
              <img src="/esteticar.png" alt="EstetiCar" style={{ width: 160, height: 160, objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(212,168,67,0.4))" }} />
            </div>
            <h1 className={styles.brandTitle}>EstetiCar</h1>
            <p className={styles.brandTagline}>
              Gestão inteligente para sua estética automotiva
            </p>
            <div className={styles.brandFeatures}>
              {[
                "Agendamento de serviços",
                "Controle de ordens de serviço",
                "Chatbot WhatsApp",
                "Relatórios financeiros",
              ].map((text) => (
                <div key={text} className={styles.brandFeature}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d4a843"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.splitForm}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h1>Bem-vindo de volta</h1>
            <p>Acesse o painel da sua estética automotiva</p>
          </div>

          {erro && <Alert>{erro}</Alert>}

          <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
            <Input
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              name="senha"
              type="password"
              placeholder="••••••••"
              value={form.senha}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
            <Button type="submit" fullWidth loading={loading}>
              Entrar
            </Button>
          </form>

          <div className="divider">ou</div>

          <p className={styles.authFooterText}>
            Não tem conta?{" "}
            <Link to="/cadastro" className="link">
              Cadastrar empresa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
