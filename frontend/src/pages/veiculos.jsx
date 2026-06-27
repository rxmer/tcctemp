import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { veiculosService } from "../services/veiculos.service";
import { clientesService } from "../services/clientes.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { Input, Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import styles from "../styles/pages/veiculos.module.css";

const formInitial = {
  placa: "",
  marca: "",
  modelo: "",
  ano: "",
  cor: "",
  cliente_id: "",
};

export function Veiculos() {
  const { tenant } = useAuth();

  const [veiculos, setVeiculos] = useState([]);
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
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        const [ve, cl] = await Promise.all([
          veiculosService.listar({ page, limit: LIMIT, search }),
          clientesService.listar({ limit: 9999 }),
        ]);
        if (!mounted) return;
        setVeiculos(ve.data);
        setTotal(ve.total);
        setClientes(cl.data);
      } catch (err) {
        showFeedback("error", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    veiculosService.listar({ page, limit: LIMIT, search }).then((result) => {
      setVeiculos(result.data);
      setTotal(result.total);
    }).catch((err) => showFeedback("error", err.message));
  }, [page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      veiculosService.listar({ page: 1, limit: LIMIT, search }).then((result) => {
        setVeiculos(result.data);
        setTotal(result.total);
      }).catch((err) => showFeedback("error", err.message));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  async function carregarVeiculos() {
    try {
      const result = await veiculosService.listar({ page, limit: LIMIT, search });
      setVeiculos(result.data);
      setTotal(result.total);
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function iniciarEdicao(veiculo) {
    setEditingId(veiculo.veiculo_id);
    setForm({
      placa: veiculo.placa,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano ?? "",
      cor: veiculo.cor ?? "",
      cliente_id: veiculo.cliente_id ?? "",
    });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm({ ...formInitial });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      placa: form.placa,
      marca: form.marca,
      modelo: form.modelo,
      ano: form.ano ? Number(form.ano) : null,
      cor: form.cor || null,
      cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
    };

    if (!payload.placa || !payload.marca || !payload.modelo || !payload.cliente_id) {
      showFeedback("error", "Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await veiculosService.atualizar(editingId, payload);
        showFeedback("success", "Veículo atualizado com sucesso!");
      } else {
        await veiculosService.criar(payload);
        showFeedback("success", "Veículo cadastrado com sucesso!");
      }

      cancelarEdicao();
      await carregarVeiculos();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(veiculo) {
    const ok = await confirm(`Remover veículo "${veiculo.placa}"?`);
    if (!ok) return;

    try {
      await veiculosService.deletar(veiculo.veiculo_id);
      await carregarVeiculos();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Veículos"
        subtitle="Gerencie os veículos dos seus clientes"
        action={
          <div className={styles.tenantChip}>
            <span className={styles.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`}>{feedback.message}</div>}

      <div className={styles.veicGrid}>
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2>{editingId ? "Editar veículo" : "Novo veículo"}</h2>
            <p>Preencha os dados abaixo</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.veicForm}>
            <div className={styles.row}>
              <Input
                label="Placa"
                name="placa"
                placeholder="ABC-1234"
                value={form.placa}
                onChange={handleChange}
                required
              />
              <Input
                label="Ano"
                name="ano"
                type="number"
                placeholder="2024"
                value={form.ano}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Marca"
              name="marca"
              placeholder="Ex: Volkswagen"
              value={form.marca}
              onChange={handleChange}
              required
            />

            <Input
              label="Modelo"
              name="modelo"
              placeholder="Ex: Gol"
              value={form.modelo}
              onChange={handleChange}
              required
            />

            <Input
              label="Cor"
              name="cor"
              placeholder="Ex: Preto"
              value={form.cor}
              onChange={handleChange}
            />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Cliente</label>
              <select
                name="cliente_id"
                className={styles.fieldSelect}
                value={form.cliente_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.cliente_id} value={c.cliente_id}>
                    {c.nome} {c.telefone ? `(${c.telefone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" fullWidth loading={saving}>
                {editingId ? "Salvar alterações" : "Cadastrar veículo"}
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
            <h2>Veículos cadastrados</h2>
            <p>{total} veículo(s) encontrado(s)</p>
          </div>

          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por placa, marca ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <SkeletonTable columns={[2.5, 3, 3, 2, 2, 1.5]} rows={5} />
          ) : veiculos.length === 0 ? (
            <div className={styles.emptyState}>
              Nenhum veículo cadastrado ainda.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Marca / Modelo</th>
                    <th>Ano</th>
                    <th>Cor</th>
                    <th>Cliente</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {veiculos.map((v) => {
                    const cliente = clientes.find((c) => c.cliente_id === v.cliente_id);
                    return (
                    <tr key={v.veiculo_id}>
                      <td className={styles.placaCell}>{v.placa}</td>
                      <td>
                        <div className={styles.veicMarca}>{v.marca}</div>
                        <div className={styles.veicModelo}>{v.modelo}</div>
                      </td>
                      <td>{v.ano ?? "-"}</td>
                      <td>{v.cor ?? "-"}</td>
                      <td>{cliente?.nome ?? "-"}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button
                            className={styles.actionBtn}
                            title="Editar"
                            onClick={() => iniciarEdicao(v)}
                          >
                            ✏️
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionDelete}`}
                            title="Remover"
                            onClick={() => handleDelete(v)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
