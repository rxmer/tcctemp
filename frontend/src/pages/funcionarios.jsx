import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";

export function Funcionario() {
  const { tenant } = useAuth();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    perfil: "funcionario",
    senha: "",
    confirmarSenha: "",
  });

  const [loading, setLoading] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [erroList, setErroList] = useState(null);

  useEffect(() => {
    if (!tenant) return;
    carregarFuncionarios();
  }, [tenant]);

  async function carregarFuncionarios() {
    try {
      setLoadingList(true);
      setErroList(null);
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, perfil")
        .eq("tenant_id", tenant.id)
        .order("nome", { ascending: true });

      if (error) throw error;
      console.log("Funcionarios data:", JSON.stringify(data));
      setFuncionarios(data ?? []);
    } catch (err) {
      console.error("Erro ao carregar funcionários:", err.message);
      setErroList(err.message);
    } finally {
      setLoadingList(false);
    }
  }

  function handleChange(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.senha !== form.confirmarSenha) {
      alert("As senhas não coincidem");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "criar-funcionario",
        {
          body: {
            nome: form.nome,
            email: form.email,
            senha: form.senha,
            telefone: form.telefone,
            perfil: form.perfil,
          },
        },
      );

      if (error || !data?.ok)
        throw new Error(data?.error ?? "Erro desconhecido");

      alert("Funcionário cadastrado com sucesso!");
      setForm({
        nome: "",
        email: "",
        telefone: "",
        perfil: "funcionario",
        senha: "",
        confirmarSenha: "",
      });
      carregarFuncionarios();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="func-header">
        <div>
          <h1 className="func-title">Funcionários</h1>
          <p className="func-sub">
            Cadastre e gerencie os usuários da sua empresa
          </p>
        </div>

        <div className="tenant-chip">
          <span className="tenant-dot" />
          <span>{tenant?.nome}</span>
        </div>
      </header>

      <div className="func-grid">
        {/* formulário */}
        <div className="form-card">
          <div className="card-header">
            <h2>Novo funcionário</h2>
            <p>Preencha os dados abaixo</p>
          </div>

          <form onSubmit={handleSubmit} className="func-form">
            <div className="input-group">
              <label>Nome completo</label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Digite o nome"
                required
              />
            </div>

            <div className="input-group">
              <label>E-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Digite o e-mail"
                required
              />
            </div>

            {/* <div className="input-group">
              <label>Telefone</label>
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
              />
            </div> */}

            <div className="input-group">
              <label>Perfil</label>

              <select name="perfil" value={form.perfil} onChange={handleChange}>
                <option value="funcionario">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="row">
              <div className="input-group">
                <label>Senha</label>
                <input
                  type="password"
                  name="senha"
                  value={form.senha}
                  onChange={handleChange}
                  placeholder="********"
                  required
                />
              </div>

              <div className="input-group">
                <label>Confirmar senha</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  value={form.confirmarSenha}
                  onChange={handleChange}
                  placeholder="********"
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar funcionário"}
            </button>
          </form>
        </div>

        {/* infos */}
        <div className="side-card">
          <div className="side-title">👥 Controle de acesso</div>

          <div className="role-box">
            <div className="role-title">Administrador</div>
            <div className="role-desc">
              Possui acesso total ao sistema, configurações e gerenciamento.
            </div>
          </div>

          <div className="role-box">
            <div className="role-title">Funcionário</div>
            <div className="role-desc">
              Pode acessar apenas funcionalidades operacionais.
            </div>
          </div>

          <div className="security-box">
            <div className="security-title">🔐 Segurança multi-tenant</div>

            <p>
              Todos os funcionários cadastrados serão vinculados automaticamente
              ao tenant atual.
            </p>
          </div>
        </div>
      </div>

      <div className="func-table-section">
        <div className="table-header">
          <h2>Funcionários cadastrados</h2>
          <span className="table-count">{funcionarios.length} registro(s)</span>
        </div>

        {loadingList ? (
          <div className="table-loading">
            <div className="spinner" />
          </div>
        ) : erroList ? (
          <div className="table-error">
            Erro ao carregar: {erroList}
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="table-empty">
            Nenhum funcionário cadastrado ainda.
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="func-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                  </tr>
                </thead>
                <tbody>
                  {funcionarios.map((f, idx) => (
                    <tr key={f.id ?? idx}>
                      <td className="td-nome">{f.nome}</td>
                      <td>{f.email}</td>
                      <td>
                        <span
                          className={`perfil-badge ${f.perfil === "admin" ? "badge-admin" : "badge-func"}`}
                        >
                          {f.perfil === "admin" ? "Administrador" : "Funcionário"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <style>{styles}</style>
    </>
  );
}

const styles = `
.func-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.func-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
}

.func-sub {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.tenant-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
}

.tenant-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

.func-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 18px;
}

.form-card,
.side-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
}

.card-header h2 {
  font-size: 20px;
  font-family: var(--font-display);
}

.card-header p {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.func-form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 13px;
  font-weight: 500;
}

.input-group input,
.input-group select {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: 0.2s;
}

.input-group input:focus,
.input-group select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(232,93,4,0.12);
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.submit-btn {
  height: 46px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}

.submit-btn:hover {
  opacity: 0.92;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.side-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 18px;
}

.role-box {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 14px;
}

.role-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.role-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.security-box {
  margin-top: 22px;
  padding: 16px;
  border-radius: var(--radius-sm);
  background: rgba(232,93,4,0.06);
  border: 1px solid rgba(232,93,4,0.14);
}

.security-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.security-box p {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ── TABLE ──────────────────────────────────── */
.func-table-section {
  margin-top: 28px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  max-height: 520px;
  display: flex;
  flex-direction: column;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}

.table-header h2 {
  font-size: 16px;
  font-family: var(--font-display);
  font-weight: 600;
}

.table-count {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 4px 10px;
  border-radius: 20px;
}

.table-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.table-empty {
  text-align: center;
  padding: 48px 22px;
  color: var(--text-muted);
  font-size: 14px;
}

.table-error {
  text-align: center;
  padding: 24px 22px;
  color: var(--error);
  font-size: 13px;
}

.table-wrapper {
  overflow-x: auto;
}

.func-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.func-table thead {
  background: var(--bg-elevated);
}

.func-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.func-table td {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  color: var(--text-primary);
}

.func-table tbody tr:hover {
  background: rgba(255,255,255,0.02);
}

.td-nome {
  font-weight: 500;
}

.perfil-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
}

.badge-admin {
  background: rgba(232,93,4,0.15);
  color: var(--accent);
}

.badge-func {
  background: rgba(34,197,94,0.12);
  color: var(--success);
}

@media (max-width: 980px) {
  .func-grid {
    grid-template-columns: 1fr;
  }

  .row {
    grid-template-columns: 1fr;
  }

  .func-header {
    flex-direction: column;
    gap: 14px;
  }
}
`;
