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
            <div className={styles.brandIconWrapper}>
              <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
                <path
                  d="M4 20L8 8H20L24 20H4Z"
                  stroke="#e85d04"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="22" r="2" fill="#e85d04" />
                <circle cx="19" cy="22" r="2" fill="#e85d04" />
                <path d="M8 13H20" stroke="#e85d04" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className={styles.brandTitle}>EstetiCar</h1>
            <p className={styles.brandTagline}>
              Gestão inteligente para sua clínica de estética
            </p>
            <div className={styles.brandFeatures}>
              {[
                "Agendamento de clientes",
                "Controle financeiro",
                "Gestão de equipe",
                "Relatórios e analytics",
              ].map((text) => (
                <div key={text} className={styles.brandFeature}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#e85d04"
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
            <p>Acesse o painel da sua estética</p>
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
              Cadastrar estética
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
