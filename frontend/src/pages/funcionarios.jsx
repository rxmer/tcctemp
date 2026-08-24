import { useState, useEffect, useCallback } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { funcionariosService } from "../services/funcionarios.service";
import { Input, Button, PageHeader } from "../components/ui";
import { Card, CardHeader, styles as crud } from "../components/crud";
import { Users, ShieldCheck, Pencil, Trash2, X, Check, KeyRound } from "lucide-react";
import { useConfirm } from "../hooks/useConfirm";

export function Funcionario() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();
  const { confirm, ConfirmModal: ConfirmDialog } = useConfirm();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  const [loading, setLoading] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [resetFunc, setResetFunc] = useState(null);
  const [resetForm, setResetForm] = useState({ senha: "", confirmar: "" });
  const [resetSaving, setResetSaving] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setLoadingList(true);
      const data = await funcionariosService.listar();
      setFuncionarios(data);
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoadingList(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    carregar();
  }, [carregar]);

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
      });

      showFeedback("success", "Funcionário cadastrado com sucesso!");
      setForm({
        nome: "",
        email: "",
        senha: "",
        confirmarSenha: "",
      });
      await carregar();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarEdicao(id) {
    try {
      await funcionariosService.atualizar(id, { nome: editNome });
      showFeedback("success", "Funcionário atualizado");
      setEditingId(null);
      setEditNome("");
      await carregar();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleDeletar(id, nome) {
    const ok = await confirm("Excluir " + nome + "?", "Esta ação não pode ser desfeita.");
    if (!ok) return;
    try {
      await funcionariosService.deletar(id);
      showFeedback("success", "Funcionário excluído");
      await carregar();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  function abrirReset(f) {
    setResetFunc(f);
    setResetForm({ senha: "", confirmar: "" });
  }

  function fecharReset() {
    setResetFunc(null);
    setResetForm({ senha: "", confirmar: "" });
  }

  async function handleSalvarReset(e) {
    e.preventDefault();

    if (resetForm.senha.length < 8) {
      showFeedback("error", "Senha deve ter no mínimo 8 caracteres");
      return;
    }
    if (resetForm.senha !== resetForm.confirmar) {
      showFeedback("error", "As senhas não coincidem");
      return;
    }

    try {
      setResetSaving(true);
      await funcionariosService.redefinirSenha(resetFunc.id, resetForm.senha);
      showFeedback("success", `Senha de ${resetFunc.nome} redefinida!`);
      fecharReset();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setResetSaving(false);
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
      <ConfirmDialog />

      {resetFunc && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={fecharReset}
        >
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: 24, width: "min(420px, calc(100vw - 32px))", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18 }}>Redefinir senha</h3>
              <button type="button" onClick={fecharReset} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 0 }}>
              Defina uma nova senha para <strong>{resetFunc.nome}</strong> ({resetFunc.email}).
            </p>

            <form onSubmit={handleSalvarReset} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
              <Input label="Nova senha" name="senha" type="password" placeholder="********"
                value={resetForm.senha}
                onChange={(e) => setResetForm((f) => ({ ...f, senha: e.target.value }))}
                required autoComplete="new-password" />
              <Input label="Confirmar nova senha" name="confirmar" type="password" placeholder="********"
                value={resetForm.confirmar}
                onChange={(e) => setResetForm((f) => ({ ...f, confirmar: e.target.value }))}
                required autoComplete="new-password" />
              <div style={{ display: "flex", gap: 10 }}>
                <Button type="submit" fullWidth loading={resetSaving}>Salvar</Button>
                <Button type="button" variant="ghost" fullWidth onClick={fecharReset}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={crud.pageGrid + " responsiveGrid"} style={{ gridTemplateColumns: "1fr 1.5fr" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <CardHeader title="Funcionários cadastrados" subtitle={loadingList ? "Carregando..." : funcionarios.length + " registro(s)"} />

            {loadingList ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: 24 }}>Carregando...</p>
            ) : funcionarios.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: 24 }}>
                Nenhum funcionário cadastrado
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {funcionarios.map((f) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    {editingId === f.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <Input name="editNome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                        <button type="button" onClick={() => handleSalvarEdicao(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--success)" }}>
                          <Check size={18} />
                        </button>
                        <button type="button" onClick={() => { setEditingId(null); setEditNome(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{f.nome}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{f.email}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => abrirReset(f)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }} title="Redefinir senha">
                            <KeyRound size={16} />
                          </button>
                          <button type="button" onClick={() => { setEditingId(f.id); setEditNome(f.nome); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)" }} title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => handleDeletar(f.id, f.nome)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
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
      </div>
    </>
  );
}
