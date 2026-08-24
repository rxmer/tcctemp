import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { traduzirErroAuth } from "../lib/authErrors";
import { Input, Button, Alert } from "../components/ui";
import styles from "../styles/pages/Login.module.css";

export function RedefinirSenha() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("verificando");
  const [form, setForm] = useState({ senha: "", confirmar: "" });
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const erroUrl = url.searchParams.get("error_description") || hash.get("error_description");

    if (erroUrl) {
      setStatus("invalido");
      return;
    }

    const veioDeLink = url.searchParams.has("code") || hash.has("access_token");

    if (!veioDeLink) {
      supabase.auth.getSession().then(({ data }) => {
        setStatus(data?.session ? "pronto" : "invalido");
      });
      return;
    }

    let tentativas = 0;
    let timer;
    const verificar = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setStatus("pronto");
        return;
      }
      if (tentativas++ < 5) {
        timer = setTimeout(verificar, 400);
      } else {
        setStatus("invalido");
      }
    };
    verificar();
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (form.senha.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (form.senha !== form.confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.senha });
      if (error) throw error;
      await supabase.auth.signOut();
      try {
        localStorage.setItem("esteticar-senha-redefinida", String(Date.now()));
      } catch {
        /* ignora */
      }
      setSucesso(true);
    } catch (err) {
      setErro(traduzirErroAuth(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitLayout}>
      <div className={styles.splitForm}>
        <div className={styles.formContainer}>
          {status === "verificando" && <p style={{ color: "var(--text-secondary)" }}>Verificando link...</p>}

          {status === "invalido" && (
            <>
              <div className={styles.formHeader}>
                <h1>Link inválido</h1>
                <p>Este link de recuperação expirou ou já foi utilizado.</p>
              </div>
              <Button fullWidth onClick={() => navigate("/login")}>
                Voltar para o login
              </Button>
            </>
          )}

          {status === "pronto" && sucesso && (
            <>
              <div className={styles.formHeader}>
                <h1>Senha redefinida!</h1>
                <p>Sua senha foi alterada com sucesso.</p>
              </div>
              <Alert>Pode fechar esta aba e entrar na tela de login com a nova senha.</Alert>
              <Button fullWidth onClick={() => navigate("/login", { replace: true })}>
                Ir para o login
              </Button>
            </>
          )}

          {status === "pronto" && !sucesso && (
            <>
              <div className={styles.formHeader}>
                <h1>Redefinir senha</h1>
                <p>Crie uma nova senha para sua conta</p>
              </div>

              {erro && <Alert>{erro}</Alert>}

              <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
                <Input
                  label="Nova senha"
                  name="senha"
                  type="password"
                  placeholder="••••••••"
                  value={form.senha}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <Input
                  label="Confirmar nova senha"
                  name="confirmar"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmar}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <Button type="submit" fullWidth loading={loading}>
                  Salvar nova senha
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
