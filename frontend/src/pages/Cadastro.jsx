import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Input, Button, Alert } from "../components/ui";
import styles from "../styles/pages/Cadastro.module.css";

const STEPS = ["Empresa", "Acesso"];

export function Cadastro() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErros((e) => ({ ...e, [name]: "" }));
  };

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
    setErro("");
    if (validarStep()) setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      handleNext();
      return;
    }
    if (!validarStep()) return;
    setErro("");
    setLoading(true);
    try {
      await signUp(form);
      navigate("/login", { replace: true });
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

  return (
    <div className={styles.authLayout}>
      <div className={styles.authBrand}>
        <div className={styles.brandIcon}>
          <img src="/esteticar.png" alt="EstetiCar" style={{ width: 28, height: 28, objectFit: "contain" }} />
        </div>
        <span className={styles.brandName}>EstetiCar</span>
      </div>

      <div className={styles.authCard}>
        <div className={styles.stepIndicator}>
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`${styles.stepItem} ${i === step ? styles.stepItemActive : i < step ? styles.stepItemDone : ""}`}
            >
              <div className={styles.stepDot}>{i < step ? "✓" : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
          <div
            className={styles.stepLine}
            style={{ "--progress": `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        <div className={styles.authHeader}>
          <h1>{step === 0 ? "Sua estética" : "Crie seu acesso"}</h1>
          <p>
            {step === 0
              ? "Como se chama sua empresa?"
              : "Dados do administrador"}
          </p>
        </div>

        {erro && <Alert>{erro}</Alert>}

        <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
          {step === 0 && (
            <Input
              label="Nome da estética"
              name="nomeEmpresa"
              placeholder="Ex: Auto Brilho Premium"
              value={form.nomeEmpresa}
              onChange={handleChange}
              error={erros.nomeEmpresa}
              autoFocus
            />
          )}

          {step === 1 && (
            <>
              <Input
                label="Seu nome"
                name="nome"
                placeholder="João Silva"
                value={form.nome}
                onChange={handleChange}
                error={erros.nome}
              />
              <Input
                label="E-mail"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={handleChange}
                error={erros.email}
              />
              <Input
                label="Senha"
                name="senha"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.senha}
                onChange={handleChange}
                error={erros.senha}
              />
              <Input
                label="Confirmar senha"
                name="confirma"
                type="password"
                placeholder="Repita a senha"
                value={form.confirma}
                onChange={handleChange}
                error={erros.confirma}
              />
            </>
          )}

          <div className={styles.formActions}>
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setErro("");
                  setStep((s) => s - 1);
                }}
              >
                ← Voltar
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="submit">Continuar →</Button>
            ) : (
              <Button type="submit" loading={loading}>
                Criar conta
              </Button>
            )}
          </div>
        </form>

        <p className={styles.authFooterText}>
          Já tem conta?{" "}
          <Link to="/login" className="link">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
