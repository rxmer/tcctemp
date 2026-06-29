import { useState } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { funcionariosService } from "../services/funcionarios.service";
import { Input, Button, PageHeader } from "../components/ui";
import { Card, CardHeader, styles as crud } from "../components/crud";
import { Users, ShieldCheck } from "lucide-react";

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
          <div className={crud.tenantChip}>
            <span className={crud.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`} role="alert">{feedback.message}</div>}

      <div className={crud.pageGrid} style={{ gridTemplateColumns: "2fr 1fr" }}>
        <Card>
          <CardHeader title="Novo funcionário" subtitle="Preencha os dados abaixo" />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Input label="Nome completo" name="nome" placeholder="Digite o nome" value={form.nome} onChange={handleChange} required />
            <Input label="E-mail" name="email" type="email" placeholder="Digite o e-mail" value={form.email} onChange={handleChange} required />

            <div className={crud.row}>
              <Input label="Senha" name="senha" type="password" placeholder="********" value={form.senha} onChange={handleChange} required />
              <Input label="Confirmar senha" name="confirmarSenha" type="password" placeholder="********" value={form.confirmarSenha} onChange={handleChange} required />
            </div>

            <Button type="submit" fullWidth loading={loading}>
              Cadastrar funcionário
            </Button>
          </form>
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Users size={16} /> Controle de acesso
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Administrador</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                Possui acesso total ao sistema, configurações e gerenciamento.
              </div>
            </div>

            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Funcionário</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                Pode acessar apenas funcionalidades operacionais.
              </div>
            </div>

            <div style={{ background: "rgba(212,168,67,0.06)", borderRadius: "var(--radius-sm)", padding: 14, border: "1px solid rgba(212,168,67,0.14)" }}>
              <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={14} color="var(--accent)" /> Segurança multi-tenant
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
                Todos os funcionários cadastrados serão vinculados automaticamente ao tenant atual.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
