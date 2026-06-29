import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { servicosService } from "../services/servicos.service";
import { useFeedback } from "../hooks/useFeedback";
import { useConfirm } from "../hooks/useConfirm";
import { Input, Button, PageHeader, Pagination, SkeletonTable } from "../components/ui";
import { Card, CardHeader, DataTable, ActionBtn, ActionBtns, styles as crud } from "../components/crud";
import { Pencil, Trash2, Pause, Play } from "lucide-react";

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
      try {
        const result = await servicosService.listar({ page: 1, limit: LIMIT, search });
        setPage(1);
        setServicos(result.data);
        setTotal(result.total);
      } catch (err) {
        showFeedback("error", err.message);
      }
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

  const columns = [
    {
      key: "nome_servico",
      label: "Serviço",
      render: (s) => (
        <>
          <div>{s.nome_servico}</div>
          {s.descricao && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.descricao}</div>
          )}
        </>
      ),
    },
    {
      key: "preco_base",
      label: "Preço",
      render: (s) => formatMoney(s.preco_base),
    },
    { key: "duracao_min", label: "Duração", render: (s) => `${s.duracao_min} min` },
    {
      key: "status",
      label: "Status",
      render: (s) => (
        <span className={crud.statusBadge} style={s.ativo
          ? { background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.2)" }
          : { background: "rgba(100,100,100,0.1)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
        }>
          {s.ativo ? "Ativo" : "Inativo"}
        </span>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      width: "1px",
      render: (s) => (
        <ActionBtns>
          <ActionBtn title="Editar" onClick={() => iniciarEdicao(s)}>
            <Pencil size={14} />
          </ActionBtn>
          <ActionBtn title={s.ativo ? "Desativar" : "Ativar"} onClick={() => handleToggle(s)}>
            {s.ativo ? <Pause size={14} /> : <Play size={14} />}
          </ActionBtn>
          <ActionBtn title="Remover" danger onClick={() => handleDelete(s)}>
            <Trash2 size={14} />
          </ActionBtn>
        </ActionBtns>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Serviços"
        subtitle="Gerencie os serviços oferecidos pela sua empresa"
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
            title={editingId ? "Editar serviço" : "Novo serviço"}
            subtitle="Preencha os dados abaixo"
          />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Input
              label="Nome do serviço"
              name="nome_servico"
              placeholder="Ex: Troca de óleo"
              value={form.nome_servico}
              onChange={handleChange}
              required
            />

            <div className={crud.fieldGroup}>
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

            <div className={crud.row}>
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

            <div className={crud.formActions}>
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
        </Card>

        <Card>
          <CardHeader
            title="Serviços cadastrados"
            subtitle={`${total} serviço(s) encontrado(s)`}
          />

          <div className={crud.searchBar}>
            <input
              type="text"
              className={crud.searchInput}
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <SkeletonTable columns={[3, 4, 2, 1.5, 1.5]} rows={5} />
          ) : (
            <DataTable
              columns={columns}
              rows={servicos.map((s) => ({ ...s, id: s.servico_id }))}
              emptyMessage="Nenhum serviço cadastrado ainda."
            />
          )}
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </Card>
      </div>
      <ConfirmModal />
    </>
  );
}
