// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

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
        err.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <div className="brand-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
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
        <span className="brand-name">EstéticaPro</span>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Bem-vindo de volta</h1>
          <p>Acesse o painel da sua estética</p>
        </div>

        {erro && (
          <div className="alert alert-error" role="alert">
            <span>⚠</span> {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="input-group">
            <label className="input-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`input-field${erro ? " error" : ""}`}
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              className={`input-field${erro ? " error" : ""}`}
              placeholder="••••••••"
              value={form.senha}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="divider">ou</div>

        <p className="auth-footer-text">
          Não tem conta?{" "}
          <Link to="/cadastro" className="link">
            Cadastrar estética
          </Link>
        </p>
      </div>

      <style>{authStyles}</style>
    </div>
  );
}

const authStyles = `
.auth-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(232,93,4,0.08) 0%, transparent 70%),
    var(--bg-base);
  gap: 24px;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 44px; height: 44px;
  background: rgba(232,93,4,0.1);
  border: 1px solid rgba(232,93,4,0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-primary);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}

.auth-header h1 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}
.auth-header p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-footer-text {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.btn-spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
`;
