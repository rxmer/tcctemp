import { useState } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { funcionariosService } from "../services/funcionarios.service";
import { Input, Button, PageHeader } from "../components/ui";
import styles from "../styles/pages/funcionarios.module.css";

export function Funcionario() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.senha !== form.confirmarSenha) {
      showFeedback("error", "As senhas não coincidem");
      return;
    }

    try {
      setLoading(true);

      await funcionariosService.criar({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone,
      });

      showFeedback("success", "Funcionário cadastrado com sucesso!");
      setForm({
        nome: "",
        email: "",
        telefone: "",
        senha: "",
        confirmarSenha: "",
      });
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Funcionários"
        subtitle="Cadastre e gerencie os usuários da sua empresa"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={styles.funcGrid}>
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2>Novo funcionário</h2>
            <p>Preencha os dados abaixo</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.funcForm}>
            <Input label="Nome completo" name="nome" placeholder="Digite o nome" value={form.nome} onChange={handleChange} required />
            <Input label="E-mail" name="email" type="email" placeholder="Digite o e-mail" value={form.email} onChange={handleChange} required />

            <div className={styles.row}>
              <Input label="Senha" name="senha" type="password" placeholder="********" value={form.senha} onChange={handleChange} required />
              <Input label="Confirmar senha" name="confirmarSenha" type="password" placeholder="********" value={form.confirmarSenha} onChange={handleChange} required />
            </div>

            <Button type="submit" fullWidth loading={loading}>
              Cadastrar funcionário
            </Button>
          </form>
        </div>

        <div className={styles.sideCard}>
          <div className={styles.sideTitle}>👥 Controle de acesso</div>

          <div className={styles.roleBox}>
            <div className={styles.roleTitle}>Administrador</div>
            <div className={styles.roleDesc}>
              Possui acesso total ao sistema, configurações e gerenciamento.
            </div>
          </div>

          <div className={styles.roleBox}>
            <div className={styles.roleTitle}>Funcionário</div>
            <div className={styles.roleDesc}>
              Pode acessar apenas funcionalidades operacionais.
            </div>
          </div>

          <div className={styles.securityBox}>
            <div className={styles.securityTitle}>🔐 Segurança multi-tenant</div>
            <p>Todos os funcionários cadastrados serão vinculados automaticamente ao tenant atual.</p>
          </div>
        </div>
      </div>
    </>
  );
}
