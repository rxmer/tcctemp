import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { traduzirErroAuth } from "../lib/authErrors";
import { Input, Button, Alert } from "../components/ui";
import { LegalModal } from "../components/LegalModal";
import { Check } from "lucide-react";
import styles from "../styles/pages/Cadastro.module.css";

const ETAPAS = [
  {
    chave: "empresa",
    label: "Empresa",
    titulo: "Sua estética",
    legenda: "Como se chama sua empresa?",
    estagioTitulo: "Abra a loja da sua estética",
    estagioLead: "Comece pelo nome do negócio. É o que seus clientes vão ver daqui a pouco.",
    ganhos: [
      "Serviços comuns já pré-criados",
      "Expediente padrão sugerido",
      "WhatsApp pronto para atender",
    ],
  },
  {
    chave: "acesso",
    label: "Acesso",
    titulo: "Crie seu acesso",
    legenda: "Dados do administrador da conta",
    estagioTitulo: "Crie o acesso do administrador",
    estagioLead: "Estes dados entram como dono da conta, com acesso total ao painel.",
    ganhos: [
      "Você entra como administrador",
      "Cada estética fica isolada por segurança",
      "Convide sua equipe quando quiser",
    ],
  },
];

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
    aceite: false,
  });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);

  const etapa = ETAPAS[step];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErros((er) => ({ ...er, [name]: "" }));
  };

  const validarStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.nomeEmpresa.trim()) e.nomeEmpresa = "Nome da empresa obrigatório";
    }
    if (step === 1) {
      if (!form.nome.trim()) e.nome = "Seu nome é obrigatório";
      if (!form.email.trim()) e.email = "E-mail obrigatório";
      if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
      if (form.senha.length < 8) e.senha = "Mínimo 8 caracteres";
      if (form.senha !== form.confirma) e.confirma = "Senhas não coincidem";
      if (!form.aceite) e.aceite = "É necessário aceitar os termos para continuar";
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    setErro("");
    if (validarStep()) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < ETAPAS.length - 1) {
      handleNext();
      return;
    }
    if (!validarStep()) return;
    setErro("");
    setLoading(true);
    try {
      await signUp(form);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      if (/already registered|already exists/i.test(err.message)) {
        setErros((er) => ({ ...er, email: "Este e-mail já está em uso" }));
      } else {
        setErro(traduzirErroAuth(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.split}>
      <aside className={styles.stage}>
        <div className={styles.stageGrid} aria-hidden="true" />
        <div className={styles.stageInner}>
          <div className={styles.brand}>
            <img src="/esteticar.png" alt="EstetiCar" className={styles.brandLogo} />
            <span className={styles.brandName}>EstetiCar</span>
          </div>

          <div key={step} className={styles.stageCopy}>
            <h1 className={styles.stageTitle}>{etapa.estagioTitulo}</h1>
            <p className={styles.stageLead}>{etapa.estagioLead}</p>

            <ul className={styles.gains}>
              {etapa.ganhos.map((g) => (
                <li key={g}>
                  <span className={styles.gainMark}><Check size={13} strokeWidth={3} /></span>
                  {g}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.track}>
            {ETAPAS.map((e, i) => (
              <div
                key={e.chave}
                className={`${styles.trackStop} ${i === step ? styles.trackActive : ""} ${i < step ? styles.trackDone : ""}`}
              >
                <span className={styles.trackDot}>{i < step ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
                <span className={styles.trackLabel}>{e.label}</span>
              </div>
            ))}
            <span className={styles.trackRail}>
              <span
                className={styles.trackRailFill}
                style={{ width: `${(step / (ETAPAS.length - 1)) * 100}%` }}
              />
            </span>
          </div>
        </div>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formWrap}>
          <header key={`h-${step}`} className={styles.formHead}>
            <h2>{etapa.titulo}</h2>
            <p>{etapa.legenda}</p>
          </header>

          {erro && <Alert>{erro}</Alert>}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
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
                  autoComplete="name"
                />
                <Input
                  label="E-mail"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  error={erros.email}
                  autoComplete="email"
                />
                <div className={styles.senhaRow}>
                  <Input
                    label="Senha"
                    name="senha"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={form.senha}
                    onChange={handleChange}
                    error={erros.senha}
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirmar senha"
                    name="confirma"
                    type="password"
                    placeholder="Repita a senha"
                    value={form.confirma}
                    onChange={handleChange}
                    error={erros.confirma}
                    autoComplete="new-password"
                  />
                </div>

                <label className={styles.terms}>
                  <input type="checkbox" name="aceite" checked={form.aceite} onChange={handleChange} />
                  <span>
                    Li e aceito os{" "}
                    <button type="button" className={styles.legalLink} onClick={() => setModal("termos")}>
                      Termos de Uso
                    </button>{" "}
                    e a{" "}
                    <button type="button" className={styles.legalLink} onClick={() => setModal("privacidade")}>
                      Política de Privacidade
                    </button>
                  </span>
                </label>
                {erros.aceite && <span className="field-error">{erros.aceite}</span>}
              </>
            )}

            <div className={styles.actions}>
              {step > 0 && (
                <Button type="button" variant="ghost" onClick={() => { setErro(""); setStep((s) => s - 1); }}>
                  Voltar
                </Button>
              )}
              <Button type="submit" loading={loading} className={styles.primaryAction}>
                {step < ETAPAS.length - 1 ? "Continuar" : "Criar conta"}
              </Button>
            </div>
          </form>

          <p className={styles.footer}>
            Já tem conta?{" "}
            <Link to="/login" className="link">Entrar</Link>
          </p>
        </div>
      </main>

      {modal && <LegalModal tipo={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
