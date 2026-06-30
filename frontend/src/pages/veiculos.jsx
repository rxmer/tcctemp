import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { veiculosService } from "../services/veiculos.service";
import { clientesService } from "../services/clientes.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { Input, Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import { Card, CardHeader, DataTable, ActionBtn, ActionBtns, styles as crud } from "../components/crud";
import { Pencil, Trash2 } from "lucide-react";
import { formatPhone } from "../utils/formatPhone";

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
    carregarVeiculos();
  }, [page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    clientesService.listar({ limit: 9999 }).then((cl) => {
      setClientes(cl.data);
    }).catch(() => {});
  }, []);

  async function carregarVeiculos() {
    setLoading(true);
    try {
      const result = await veiculosService.listar({ page, limit: LIMIT, search });
      setVeiculos(result.data);
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

  function iniciarEdicao(veiculo) {
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const columns = [
    { key: "placa", label: "Placa", render: (v) => v.placa },
    {
      key: "marca_modelo",
      label: "Marca / Modelo",
      render: (v) => (
        <>
          <div>{v.marca}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{v.modelo}</div>
        </>
      ),
    },
    { key: "ano", label: "Ano", render: (v) => v.ano ?? "-" },
    { key: "cor", label: "Cor", render: (v) => v.cor ?? "-" },
    {
      key: "cliente",
      label: "Cliente",
      render: (v) => clientes.find((c) => c.cliente_id === v.cliente_id)?.nome ?? "-",
    },
    {
      key: "acoes",
      label: "Ações",
      width: "1px",
      render: (v) => (
        <ActionBtns>
          <ActionBtn title="Editar" onClick={() => iniciarEdicao(v)}>
            <Pencil size={14} />
          </ActionBtn>
          <ActionBtn title="Remover" danger onClick={() => handleDelete(v)}>
            <Trash2 size={14} />
          </ActionBtn>
        </ActionBtns>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Veículos"
        subtitle="Gerencie os veículos dos seus clientes"
        action={
          <div className={crud.tenantChip}>
            <span className={crud.tenantDot} />
            <span>{tenant?.nome}</span>
          </div>
        }
      />

      {feedback && <div className={`alert alert-${feedback.type}`}>{feedback.message}</div>}

      <div className={crud.pageGrid}>
        <Card>
          <CardHeader
            title={editingId ? "Editar veículo" : "Novo veículo"}
            subtitle="Preencha os dados abaixo"
          />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className={crud.row}>
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

            <div className={crud.fieldGroup}>
              <label className={crud.fieldLabel}>Cliente</label>
              <select
                name="cliente_id"
                className={`input-field ${crud.fieldSelect}`}
                value={form.cliente_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.cliente_id} value={c.cliente_id}>
                    {c.nome} {c.telefone ? formatPhone(c.telefone) : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={crud.formActions}>
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
        </Card>

        <Card>
          <CardHeader
            title="Veículos cadastrados"
            subtitle={`${total} veículo(s) encontrado(s)`}
          />

          <div className={crud.searchBar}>
            <input
              type="text"
              className={crud.searchInput}
              placeholder="Buscar por placa, marca ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <SkeletonTable columns={[2.5, 3, 3, 2, 2, 1.5]} rows={5} />
          ) : (
            <DataTable
              columns={columns}
              rows={veiculos.map((v) => ({ ...v, id: v.veiculo_id }))}
              emptyMessage="Nenhum veículo cadastrado ainda."
            />
          )}
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </Card>
      </div>
      <ConfirmModal />
    </>
  );
}
