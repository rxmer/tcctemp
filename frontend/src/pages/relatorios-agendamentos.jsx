import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase, formatPeriodo } from "../components/RelatorioBase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

export function RelatorioAgendamentos() {
  return (
    <RelatorioBase
      titulo="Relatório de Agendamentos"
      subtitle="Agendamentos por período"
      cardTitulo="Agendamentos por período"
      cardSub="Volume de agendamentos no período selecionado"
      comAgrupar
      fetcher={relatoriosService.agendamentos}
      renderChart={(dados, agrupar) => (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dados || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="periodo" tickFormatter={(p) => formatPeriodo(p, agrupar)}
              tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
            <Tooltip
              labelFormatter={(p) => formatPeriodo(p, agrupar)}
              formatter={(val) => [val, "Agendamentos"]}
              contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6 }}
            />
            <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    />
  );
}
