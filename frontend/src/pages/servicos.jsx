import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { servicosService } from "../services/servicos.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { Input, Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const debounceRef = useRef(null);
  const { feedback, showFeedback } = useFeedback();
  const { confirm, ConfirmModal } = useConfirm();

  const LIMIT = 20;

  useEffect(() => {
    carregarServicos();
  }, [page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await servicosService.listar({ page: 1, limit: LIMIT, search });
      setPage(1);
      setServicos(result.data);
      setTotal(result.total);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  async function carregarServicos() {
    try {
      setLoading(true);
      const result = await servicosService.listar({ page, limit: LIMIT, search });
      setServicos(result.data);
      setTotal(result.total);
    } catch (err) {
      showFeedback("error", err.message);
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

    if (!payload.nome_servico || form.preco_base === "" || !payload.duracao_min) {
      showFeedback("error", "Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await servicosService.atualizar(editingId, payload);
        showFeedback("success", "Serviço atualizado com sucesso!");
      } else {
        await servicosService.criar(payload);
        showFeedback("success", "Serviço cadastrado com sucesso!");
      }

      cancelarEdicao();
      await carregarServicos();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(servico) {
    try {
      await servicosService.toggleAtivo(servico.servico_id);
      await carregarServicos();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  async function handleDelete(servico) {
    const ok = await confirm(`Remover "${servico.nome_servico}"?`);
    if (!ok) return;

    try {
      await servicosService.deletar(servico.servico_id);
      await carregarServicos();
    } catch (err) {
      showFeedback("error", err.message);
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

      {feedback && <div className={`alert alert-${feedback.type}`}>{feedback.message}</div>}

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
            <p>{total} serviço(s) encontrado(s)</p>
          </div>

          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <SkeletonTable columns={[3, 4, 2, 1.5, 1.5]} rows={5} />
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
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </div>
      </div>
      <ConfirmModal />
    </>
  );
}
