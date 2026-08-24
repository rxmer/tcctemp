import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase, formatMoney } from "../components/RelatorioBase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

export function RelatorioServicos() {
  return (
    <RelatorioBase
      titulo="Relatório de Serviços"
      subtitle="Serviços mais realizados"
      cardTitulo="Serviços mais realizados"
      cardSub="Por receita gerada"
      comAgrupar={false}
      fetcher={relatoriosService.servicos}
      tipoExport="servicos"
      renderChart={(dados) => (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={(dados || []).slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--text-secondary)"
              tickFormatter={(v) => formatMoney(v)} />
            <YAxis type="category" dataKey="nome" width={140}
              tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
            <Tooltip
              formatter={(val) => [formatMoney(val), "Receita"]}
              contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6 }}
            />
            <Bar dataKey="receita" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    />
  );
}
