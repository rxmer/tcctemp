import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { clientesService } from "../services/clientes.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { Input, Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import { Card, CardHeader, DataTable, ActionBtn, ActionBtns, styles as crud } from "../components/crud";
import { Pencil, Trash2 } from "lucide-react";
import { formatPhone } from "../utils/formatPhone";

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
      try {
        const result = await clientesService.listar({ page: 1, limit: LIMIT, search });
        setPage(1);
        setClientes(result.data);
        setTotal(result.total);
      } catch (err) {
        showFeedback("error", err.message);
      }
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
    const { name, value } = e.target;
    const newValue = name === "telefone" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
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

    const telefone = form.telefone ? form.telefone.replace(/\D/g, "") : null;
    const payload = {
      nome: form.nome,
      telefone: form.telefone ? form.telefone.replace(/\D/g, "").replace(/^55/, "") : null,
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

  const columns = [
    { key: "nome", label: "Nome", render: (c) => c.nome },
    { key: "telefone", label: "Telefone", render: (c) => formatPhone(c.telefone) || "-" },
    { key: "email", label: "E-mail", render: (c) => c.email ?? "-" },
    {
      key: "acoes",
      label: "Ações",
      width: "1px",
      render: (c) => (
        <ActionBtns>
          <ActionBtn title="Editar" onClick={() => iniciarEdicao(c)}>
            <Pencil size={14} />
          </ActionBtn>
          <ActionBtn title="Remover" danger onClick={() => handleDelete(c)}>
            <Trash2 size={14} />
          </ActionBtn>
        </ActionBtns>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie os clientes da sua empresa"
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
            title={editingId ? "Editar cliente" : "Novo cliente"}
            subtitle="Preencha os dados abaixo"
          />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
              mask="phone"
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

            <div className={crud.formActions}>
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
        </Card>

        <Card>
          <CardHeader
            title="Clientes cadastrados"
            subtitle={`${total} cliente(s) encontrado(s)`}
          />

          <div className={crud.searchBar}>
            <input
              type="text"
              className={crud.searchInput}
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <SkeletonTable columns={[3, 3, 3, 2, 1.5]} rows={5} />
          ) : (
            <DataTable
              columns={columns}
              rows={clientes.map((c) => ({ ...c, id: c.cliente_id }))}
              emptyMessage="Nenhum cliente cadastrado ainda."
            />
          )}
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </Card>
      </div>
      <ConfirmModal />
    </>
  );
}
