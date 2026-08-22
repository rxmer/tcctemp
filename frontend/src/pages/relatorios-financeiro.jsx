import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase, formatMoney } from "../components/RelatorioBase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

export function RelatorioFinanceiro() {
  return (
    <RelatorioBase
      titulo="Relatório Financeiro"
      subtitle="Receitas vs Despesas"
      cardTitulo="Receitas vs Despesas"
      cardSub="Comparativo mensal"
      comAgrupar={false}
      fetcher={relatoriosService.financeiro}
      renderChart={(dados) => (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dados || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)"
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(val) => [formatMoney(val)]}
              contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6 }}
            />
            <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    />
  );
}
