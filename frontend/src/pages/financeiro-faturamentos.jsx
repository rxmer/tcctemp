import { useState, useEffect } from "react";
import { useFeedback } from "../hooks/useFeedback";
import { useAuth } from "../context/useAuth";
import { financeiroService } from "../services/financeiro.service";
import { Button, PageHeader, Alert, TenantChip, Pagination, SkeletonTable } from "../components/ui";
import { Card, CardHeader, DataTable, ActionBtn, StatusBadge, styles as crud } from "../components/crud";
import { Wallet } from "lucide-react";
import { formatMoney, formatDate } from "../utils/format";

export function Faturamentos() {
  const { tenant } = useAuth();
  const { feedback, showFeedback } = useFeedback();

  const [faturamentos, setFaturamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const LIMIT = 20;

  useEffect(() => {
    carregarFaturamentos();
  }, [filtroData, page]);

  async function carregarFaturamentos() {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filtroData) { params.data_inicio = filtroData; params.data_fim = filtroData; }
      const result = await financeiroService.listarFaturamentos(params);
      setFaturamentos(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error("Erro faturamentos:", err);
      showFeedback("error", "Erro ao carregar faturamentos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReceberFaturamento(id) {
    try {
      const hoje = new Date().toISOString().split("T")[0];
      await financeiroService.receberFaturamento(id, hoje);
      await carregarFaturamentos();
    } catch (err) {
      showFeedback("error", err.message);
    }
  }

  const fatColumns = [
    { key: "faturamento_id", label: "#" },
    { key: "os_id", label: "OS", render: (f) => `OS #${f.os_id}` },
    { key: "valor_total", label: "Valor", render: (f) => formatMoney(f.valor_total) },
    { key: "data", label: "Data", render: (f) => formatDate(f.criado_em?.split("T")[0], "-") },
    {
      key: "status",
      label: "Status",
      render: (f) => (
        <StatusBadge variant={f.pago ? "success" : "warning"}>
          {f.pago ? "Recebido" : "Pendente"}
        </StatusBadge>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      width: "1px",
      render: (f) => (
        !f.pago ? (
          <ActionBtn title="Receber" onClick={() => handleReceberFaturamento(f.faturamento_id)}>
            <Wallet size={14} />
          </ActionBtn>
        ) : null
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Faturamentos" subtitle="Receitas geradas pelas ordens de serviço"
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

      <Card>
        <CardHeader title="Faturamentos" subtitle={`${total} registro(s)`} />
        {loading ? (
          <SkeletonTable columns={[1.5, 2, 2, 2, 1.5, 1.5]} rows={5} />
        ) : (
          <DataTable
            columns={fatColumns}
            rows={faturamentos.map((f) => ({ ...f, id: f.faturamento_id }))}
            emptyMessage="Nenhum faturamento gerado ainda."
          />
        )}
        <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
      </Card>
    </>
  );
}
