import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase } from "../components/RelatorioBase";

export function RelatorioClientes() {
  return (
    <RelatorioBase
      titulo="Clientes Frequentes"
      subtitle="Ranking de clientes por agendamentos"
      cardTitulo="Clientes mais frequentes"
      cardSub="Por quantidade de agendamentos"
      comAgrupar={false}
      fetcher={relatoriosService.clientesFrequentes}
      renderChart={(dados) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(dados ?? []).length > 0 ? (
            (dados ?? []).map((c, i) => (
              <div key={c.cliente_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: i === 0 ? "var(--accent)" : "var(--text-secondary)", minWidth: 24 }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14 }}>{c.nome}</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{c.quantidade}x</span>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Nenhum dado disponível.</p>
          )}
        </div>
      )}
    />
  );
}
