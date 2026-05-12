// src/pages/Cadastro.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const STEPS = ["Empresa", "Acesso"];

export function Cadastro() {
  const { signUp } = useAuth();
  // const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    nomeEmpresa: "",
    nome: "",
    email: "",
    senha: "",
    confirma: "",
  });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErros((e) => ({ ...e, [name]: "" }));
  };

  // ── Validação por step ──
  const validarStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.nomeEmpresa.trim())
        e.nomeEmpresa = "Nome da empresa obrigatório";
    }
    if (step === 1) {
      if (!form.nome.trim()) e.nome = "Seu nome é obrigatório";
      if (!form.email.trim()) e.email = "E-mail obrigatório";
      if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
      if (form.senha.length < 8) e.senha = "Mínimo 8 caracteres";
      if (form.senha !== form.confirma) e.confirma = "Senhas não coincidem";
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validarStep()) setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarStep()) return;
    setErro("");
    setLoading(true);
    try {
      await signUp(form);
      setSucesso(true);
    } catch (err) {
      if (err.message.includes("already registered")) {
        setErros((e) => ({ ...e, email: "Este e-mail já está em uso" }));
      } else {
        setErro(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) return <ConfirmacaoEmail email={form.email} />;

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
        {/* Step indicator */}
        <div className="step-indicator">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`step-item ${i === step ? "active" : i < step ? "done" : ""}`}
            >
              <div className="step-dot">{i < step ? "✓" : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
          <div
            className="step-line"
            style={{ "--progress": `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="auth-header">
          <h1>{step === 0 ? "Sua estética" : "Crie seu acesso"}</h1>
          <p>
            {step === 0
              ? "Como se chama sua empresa?"
              : "Dados do administrador"}
          </p>
        </div>

        {erro && (
          <div className="alert alert-error">
            <span>⚠</span> {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {step === 0 && (
            <div className="input-group">
              <label className="input-label" htmlFor="nomeEmpresa">
                Nome da estética
              </label>
              <input
                id="nomeEmpresa"
                name="nomeEmpresa"
                type="text"
                className={`input-field${erros.nomeEmpresa ? " error" : ""}`}
                placeholder="Ex: Auto Brilho Premium"
                value={form.nomeEmpresa}
                onChange={handleChange}
                autoFocus
              />
              {erros.nomeEmpresa && (
                <span className="field-error">{erros.nomeEmpresa}</span>
              )}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="input-group">
                <label className="input-label" htmlFor="nome">
                  Seu nome
                </label>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  className={`input-field${erros.nome ? " error" : ""}`}
                  placeholder="João Silva"
                  value={form.nome}
                  onChange={handleChange}
                />
                {erros.nome && (
                  <span className="field-error">{erros.nome}</span>
                )}
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="email">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`input-field${erros.email ? " error" : ""}`}
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                />
                {erros.email && (
                  <span className="field-error">{erros.email}</span>
                )}
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="senha">
                  Senha
                </label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  className={`input-field${erros.senha ? " error" : ""}`}
                  placeholder="Mínimo 8 caracteres"
                  value={form.senha}
                  onChange={handleChange}
                />
                {erros.senha && (
                  <span className="field-error">{erros.senha}</span>
                )}
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="confirma">
                  Confirmar senha
                </label>
                <input
                  id="confirma"
                  name="confirma"
                  type="password"
                  className={`input-field${erros.confirma ? " error" : ""}`}
                  placeholder="Repita a senha"
                  value={form.confirma}
                  onChange={handleChange}
                />
                {erros.confirma && (
                  <span className="field-error">{erros.confirma}</span>
                )}
              </div>
            </>
          )}

          <div className="form-actions">
            {step > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                ← Voltar
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleNext}
              >
                Continuar →
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta"
                )}
              </button>
            )}
          </div>
        </form>

        <p className="auth-footer-text">
          Já tem conta?{" "}
          <Link to="/login" className="link">
            Entrar
          </Link>
        </p>
      </div>

      <style>{cadastroStyles}</style>
    </div>
  );
}

function ConfirmacaoEmail({ email }) {
  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ textAlign: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>📧</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>
          Confirme seu e-mail
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Enviamos um link de confirmação para
          <br />
          <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
        </p>
        <div className="alert alert-info">
          Clique no link do e-mail para ativar sua conta e fazer login.
        </div>
        <Link
          to="/login"
          className="btn btn-primary btn-full"
          style={{ textDecoration: "none" }}
        >
          Ir para o Login
        </Link>
      </div>
      <style>{authLayoutStyle}</style>
    </div>
  );
}

const authLayoutStyle = `
.auth-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(232,93,4,0.08) 0%, transparent 70%), var(--bg-base);
  gap: 24px;
}
.auth-card {
  width: 100%; max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  display: flex; flex-direction: column; gap: 20px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4);
}
`;

const cadastroStyles = `
${authLayoutStyle}
.auth-brand { display: flex; align-items: center; gap: 10px; }
.brand-icon { width: 44px; height: 44px; background: rgba(232,93,4,0.1); border: 1px solid rgba(232,93,4,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.brand-name { font-family: var(--font-display); font-size: 22px; font-weight: 700; }

.step-indicator {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
  padding-bottom: 8px;
}
.step-item {
  display: flex; align-items: center; gap: 8px;
  flex: 1; font-size: 13px; font-weight: 500;
  color: var(--text-muted);
  transition: color 0.3s;
}
.step-item.active, .step-item.done { color: var(--text-primary); }
.step-dot {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--bg-elevated); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
  transition: all 0.3s;
}
.step-item.active .step-dot { border-color: var(--accent); color: var(--accent); }
.step-item.done .step-dot { background: var(--accent); border-color: var(--accent); color: white; }

.auth-header h1 { font-family: var(--font-display); font-size: 26px; font-weight: 700; }
.auth-header p  { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.field-error { font-size: 11px; color: var(--error); margin-top: 4px; }
.form-actions { display: flex; gap: 10px; margin-top: 4px; }
.auth-footer-text { text-align: center; font-size: 13px; color: var(--text-secondary); }
.btn-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
`;
