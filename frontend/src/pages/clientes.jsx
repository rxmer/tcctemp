import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { clientesService } from "../services/clientes.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { Input, Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import styles from "../styles/pages/clientes.module.css";

const formInitial = {
  nome: "",
  telefone: "",
  email: "",
};

export function Clientes() {
  const { tenant } = useAuth();

  const [clientes, setClientes] = useState([]);
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
    carregarClientes();
  }, [page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await clientesService.listar({ page: 1, limit: LIMIT, search });
      setPage(1);
      setClientes(result.data);
      setTotal(result.total);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  async function carregarClientes() {
    try {
      setLoading(true);
      const result = await clientesService.listar({ page, limit: LIMIT, search });
      setClientes(result.data);
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

  function iniciarEdicao(cliente) {
    setEditingId(cliente.cliente_id);
    setForm({
      nome: cliente.nome,
      telefone: cliente.telefone ?? "",
      email: cliente.email ?? "",
    });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm({ ...formInitial });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      nome: form.nome,
      telefone: form.telefone || null,
      email: form.email || null,
    };

    if (!payload.nome) {
      showFeedback("error", "Preencha o nome do cliente");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await clientesService.atualizar(editingId, payload);
        showFeedback("success", "Cliente atualizado com sucesso!");
      } else {
        await clientesService.criar(payload);
        showFeedback("success", "Cliente cadastrado com sucesso!");
      }

      cancelarEdicao();
      await carregarClientes();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cliente) {
    const ok = await confirm(`Remover cliente "${cliente.nome}"?`);
    if (!ok) return;

    try {
      await clientesService.deletar(cliente.cliente_id);
      await carregarClientes();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie os clientes da sua empresa"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`}>{feedback.message}</div>}

      <div className={styles.cliGrid}>
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2>{editingId ? "Editar cliente" : "Novo cliente"}</h2>
            <p>Preencha os dados abaixo</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.cliForm}>
            <Input
              label="Nome"
              name="nome"
              placeholder="Nome do cliente"
              value={form.nome}
              onChange={handleChange}
              required
            />

            <Input
              label="Telefone"
              name="telefone"
              placeholder="(11) 99999-9999"
              value={form.telefone}
              onChange={handleChange}
            />

            <Input
              label="E-mail"
              name="email"
              type="email"
              placeholder="cliente@email.com"
              value={form.email}
              onChange={handleChange}
            />

            <div className={styles.formActions}>
              <Button type="submit" fullWidth loading={saving}>
                {editingId ? "Salvar alterações" : "Cadastrar cliente"}
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
            <h2>Clientes cadastrados</h2>
            <p>{total} cliente(s) encontrado(s)</p>
          </div>

          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <SkeletonTable columns={[3, 3, 3, 2, 1.5]} rows={5} />
          ) : clientes.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.cliente_id}>
                      <td className={styles.cliNome}>{c.nome}</td>
                      <td>{c.telefone ?? "-"}</td>
                      <td>{c.email ?? "-"}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button
                            className={styles.actionBtn}
                            title="Editar"
                            onClick={() => iniciarEdicao(c)}
                          >
                            ✏️
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionDelete}`}
                            title="Remover"
                            onClick={() => handleDelete(c)}
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
