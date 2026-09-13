import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { Input, Button, PageHeader, Alert, TenantChip, Pagination, SkeletonTable } from "../components/ui";
import { Card, CardHeader, DataTable, ActionBtn, ActionBtns, StatusBadge, styles as crud } from "../components/crud";
import { CheckCircle2, Pencil } from "lucide-react";
import { formatMoney, formatDate } from "../utils/format";

const formInitial = { descricao: "", valor: "", data_vencimento: "", observacoes: "" };

export function ContasPagar() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();

  const [contas, setContas] = useState([]);
  const [form, setForm] = useState({ ...formInitial });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtroData, setFiltroData] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const LIMIT = 20;

  useEffect(() => {
    carregarContas();
  }, [filtroData, page]);

  async function carregarContas() {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filtroData) { params.data_inicio = filtroData; params.data_fim = filtroData; }
      const result = await financeiroService.listarContas(params);
      setContas(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error("Erro contas:", err.message);
      showFeedback("error", "Erro ao carregar contas a pagar.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function iniciarEdicao(conta) {
    setEditingId(conta.conta_id);
    setForm({
      descricao: conta.descricao,
      valor: String(conta.valor),
      data_vencimento: conta.data_vencimento,
      observacoes: conta.observacoes ?? "",
    });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm({ ...formInitial });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      descricao: form.descricao,
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || null,
    };

    if (!payload.descricao || !payload.valor || !payload.data_vencimento) {
      showFeedback("error", "Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await financeiroService.atualizarConta(editingId, payload);
        showFeedback("success", "Conta atualizada!");
      } else {
        await financeiroService.criarConta(payload);
        showFeedback("success", "Conta cadastrada!");
      }
      cancelarEdicao();
      await carregarContas();
    } catch (err) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePagarConta(id) {
    try {
      await financeiroService.pagarConta(id);
      await carregarContas();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  const contasColumns = [
    { key: "descricao", label: "Descrição", render: (c) => c.descricao },
    { key: "valor", label: "Valor", render: (c) => formatMoney(c.valor) },
    { key: "data_vencimento", label: "Vencimento", render: (c) => formatDate(c.data_vencimento, "-") },
    {
      key: "status",
      label: "Status",
      render: (c) => (
        <StatusBadge variant={c.pago ? "success" : "warning"}>
          {c.pago ? "Pago" : "Pendente"}
        </StatusBadge>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      width: "1px",
      render: (c) => (
        <ActionBtns>
          {!c.pago && (
            <ActionBtn title="Pagar" onClick={() => handlePagarConta(c.conta_id)}>
              <CheckCircle2 size={14} />
            </ActionBtn>
          )}
          <ActionBtn title="Editar" onClick={() => iniciarEdicao(c)}>
            <Pencil size={14} />
          </ActionBtn>
        </ActionBtns>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Contas a Pagar" subtitle="Gerencie as despesas da empresa"
        action={<TenantChip nome={tenant?.nome} />}
      />

      {feedback && <Alert variant={feedback.type}>{feedback.message}</Alert>}

      <div className={crud.filtros}>
        <div className={crud.filtroGroup}>
          <label className={crud.filtroLabel}>Filtrar por data</label>
          <input type="date" className={crud.filtroInput} value={filtroData}
            onChange={(e) => { setPage(1); setFiltroData(e.target.value); }} />
        </div>
        {filtroData && (
          <Button variant="ghost" onClick={() => { setPage(1); setFiltroData(""); }}>Limpar</Button>
        )}
      </div>

      <div className={crud.pageGrid}>
        <Card>
          <CardHeader title={editingId ? "Editar conta" : "Nova conta a pagar"} />
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Descrição" name="descricao" placeholder="Ex: Aluguel"
              value={form.descricao} onChange={handleChange} required />
            <div className={crud.row}>
              <Input label="Valor (R$)" name="valor" type="number" step="0.01" min="0"
                placeholder="0,00" value={form.valor} onChange={handleChange} required />
              <Input label="Vencimento" name="data_vencimento" type="date"
                value={form.data_vencimento} onChange={handleChange} required />
            </div>
            <Input label="Observações" name="observacoes" placeholder="Opcional"
              value={form.observacoes} onChange={handleChange} />
            <div className={crud.formActions}>
              <Button type="submit" fullWidth loading={saving}>
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
              {editingId && (
                <Button variant="ghost" fullWidth onClick={cancelarEdicao}>Cancelar</Button>
              )}
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Contas cadastradas" subtitle={`${total} conta(s)`} />
          {loading ? (
            <SkeletonTable columns={[3, 2, 2, 1.5, 1.5]} rows={5} />
          ) : (
            <DataTable
              columns={contasColumns}
              rows={contas.map((c) => ({ ...c, id: c.conta_id }))}
              emptyMessage="Nenhuma conta cadastrada."
            />
          )}
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </Card>
      </div>
    </>
  );
}
