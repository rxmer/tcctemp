import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";
import { authService } from "../services/auth.service";
import { traduzirErroAuth } from "../lib/authErrors";
import { Input, Button, Alert } from "../components/ui";
import styles from "../styles/pages/Login.module.css";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ email: "", senha: "" });
  const [recEmail, setRecEmail] = useState("");
  const [recEnviado, setRecEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(() => {
    const aoRedefinirEmOutraAba = (e) => {
      if (e.key === "esteticar-senha-redefinida" && e.newValue) {
        setModo("login");
        setRecEnviado(false);
        setErro("");
        setInfo("Senha alterada com sucesso! Faça login com a nova senha.");
      }
    };
    window.addEventListener("storage", aoRedefinirEmOutraAba);
    return () => window.removeEventListener("storage", aoRedefinirEmOutraAba);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setInfo("");
    setLoading(true);
    try {
      await signIn(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErro(traduzirErroAuth(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async (e) => {
    e.preventDefault();
    setErro("");
    setInfo("");
    setRecLoading(true);
    try {
      const { existe } = await authService.verificarEmail(recEmail);
      if (!existe) {
        throw new Error("Este e-mail não está cadastrado no sistema.");
      }
      await supabase.auth.resetPasswordForEmail(recEmail, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      setRecEnviado(true);
    } catch (err) {
      setErro(traduzirErroAuth(err));
    } finally {
      setRecLoading(false);
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
          {modo === "login" ? (
            <>
              <div className={styles.formHeader}>
                <h1>Bem-vindo de volta</h1>
                <p>Acesse o painel da sua estética automotiva</p>
              </div>

              {erro && <Alert>{erro}</Alert>}
              {info && <Alert>{info}</Alert>}

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

              <p className={styles.authFooterText} style={{ textAlign: "center", marginTop: 12 }}>
                <button type="button" className="link" style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                  onClick={() => { setModo("recuperar"); setErro(""); setInfo(""); setRecEnviado(false); }}>
                  Esqueci minha senha
                </button>
              </p>

              <div className="divider">ou</div>

              <p className={styles.authFooterText}>
                Não tem conta?{" "}
                <Link to="/cadastro" className="link">
                  Cadastrar empresa
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h1>Recuperar senha</h1>
                <p>Informe seu e-mail para receber o link de redefinição</p>
              </div>

              {erro && <Alert>{erro}</Alert>}

              {recEnviado ? (
                <>
                  <Alert>
                    Enviamos um link de recuperação para <strong>{recEmail}</strong>. Verifique sua caixa de entrada.
                  </Alert>
                  <Button variant="ghost" fullWidth onClick={() => setModo("login")}>
                    Voltar para o login
                  </Button>
                </>
              ) : (
                <form onSubmit={handleRecuperar} className={styles.authForm} noValidate>
                  <Input
                    label="E-mail"
                    name="recEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Button type="submit" fullWidth loading={recLoading}>
                    Enviar link de recuperação
                  </Button>
                  <button type="button" className="link" style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
                    onClick={() => { setModo("login"); setErro(""); setInfo(""); }}>
                    Voltar para o login
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
