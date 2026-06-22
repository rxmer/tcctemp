import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { servicosService } from "../services/servicos.service";
import { Input, Button, PageHeader } from "../components/ui";
import styles from "../styles/pages/servicos.module.css";

const formInitial = {
  nome_servico: "",
  descricao: "",
  preco_base: "",
  duracao_min: "",
};

export function Servicos() {
  const { tenant } = useAuth();

  const [servicos, setServicos] = useState([]);
  const [form, setForm] = useState({ ...formInitial });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarServicos();
  }, []);

  async function carregarServicos() {
    try {
      setLoading(true);
      const data = await servicosService.listar();
      setServicos(data);
    } catch (err) {
      alert(`Erro ao carregar serviços: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function iniciarEdicao(servico) {
    setEditingId(servico.servico_id);
    setForm({
      nome_servico: servico.nome_servico,
      descricao: servico.descricao ?? "",
      preco_base: String(servico.preco_base),
      duracao_min: String(servico.duracao_min),
    });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm({ ...formInitial });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      nome_servico: form.nome_servico,
      descricao: form.descricao,
      preco_base: Number(form.preco_base),
      duracao_min: Number(form.duracao_min),
    };

    if (!payload.nome_servico || !payload.preco_base || !payload.duracao_min) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await servicosService.atualizar(editingId, payload);
        alert("Serviço atualizado com sucesso!");
      } else {
        await servicosService.criar(payload);
        alert("Serviço cadastrado com sucesso!");
      }

      cancelarEdicao();
      await carregarServicos();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(servico) {
    try {
      await servicosService.toggleAtivo(servico.servico_id);
      await carregarServicos();
    } catch (err) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  }

  async function handleDelete(servico) {
    if (!confirm(`Remover "${servico.nome_servico}"?`)) return;

    try {
      await servicosService.deletar(servico.servico_id);
      await carregarServicos();
    } catch (err) {
      alert(`Erro ao remover: ${err.message}`);
    }
  }

  function formatMoney(value) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <>
      <PageHeader
        title="Serviços"
        subtitle="Gerencie os serviços oferecidos pela sua empresa"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      <div className={styles.servGrid}>
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2>{editingId ? "Editar serviço" : "Novo serviço"}</h2>
            <p>Preencha os dados abaixo</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.servForm}>
            <Input
              label="Nome do serviço"
              name="nome_servico"
              placeholder="Ex: Troca de óleo"
              value={form.nome_servico}
              onChange={handleChange}
              required
            />

            <div className={styles.fieldGroup}>
              <label className="input-label" htmlFor="descricao">Descrição</label>
              <textarea
                id="descricao"
                name="descricao"
                className="input-field"
                placeholder="Descrição opcional do serviço"
                rows={3}
                value={form.descricao}
                onChange={handleChange}
              />
            </div>

            <div className={styles.row}>
              <Input
                label="Preço base (R$)"
                name="preco_base"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.preco_base}
                onChange={handleChange}
                required
              />
              <Input
                label="Duração (minutos)"
                name="duracao_min"
                type="number"
                min="1"
                placeholder="60"
                value={form.duracao_min}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formActions}>
              <Button type="submit" fullWidth loading={saving}>
                {editingId ? "Salvar alterações" : "Cadastrar serviço"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" fullWidth onClick={cancelarEdicao}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className={styles.listCard}>
          <div className={styles.cardHeader}>
            <h2>Serviços cadastrados</h2>
            <p>{servicos.length} serviço(s) encontrado(s)</p>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Carregando...</div>
          ) : servicos.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum serviço cadastrado ainda.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Preço</th>
                    <th>Duração</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {servicos.map((s) => (
                    <tr key={s.servico_id}>
                      <td>
                        <div className={styles.servNome}>{s.nome_servico}</div>
                        {s.descricao && (
                          <div className={styles.servDesc}>{s.descricao}</div>
                        )}
                      </td>
                      <td className={styles.precoCell}>{formatMoney(s.preco_base)}</td>
                      <td>{s.duracao_min} min</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            s.ativo ? styles.statusAtivo : styles.statusInativo
                          }`}
                        >
                          {s.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button
                            className={styles.actionBtn}
                            title="Editar"
                            onClick={() => iniciarEdicao(s)}
                          >
                            ✏️
                          </button>
                          <button
                            className={styles.actionBtn}
                            title={s.ativo ? "Desativar" : "Ativar"}
                            onClick={() => handleToggle(s)}
                          >
                            {s.ativo ? "⏸" : "▶️"}
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionDelete}`}
                            title="Remover"
                            onClick={() => handleDelete(s)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
