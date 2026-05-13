// src/pages/Funcionarios.jsx
import { useState } from "react";
import { useAuth } from "../context/useAuth";

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

      // chamada da api
      console.log("Cadastrar funcionário:", form);

      // await api.post("/funcionarios", form)

      alert("Funcionário cadastrado com sucesso!");

      setForm({
        nome: "",
        email: "",
        telefone: "",
        perfil: "funcionario",
        senha: "",
        confirmarSenha: "",
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar funcionário");
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

            <div className="input-group">
              <label>Telefone</label>
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
              />
            </div>

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
