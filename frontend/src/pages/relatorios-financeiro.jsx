import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase, formatMoney } from "../components/RelatorioBase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

function formatAxisMoney(v) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v}`;
}

export function RelatorioFinanceiro() {
  return (
    <RelatorioBase
      titulo="Relatório Financeiro"
      subtitle="Receitas vs Despesas"
      cardTitulo="Receitas vs Despesas"
      cardSub="Comparativo mensal no período"
      comAgrupar={false}
      icone={TrendingUp}
      accentHex="#22c55e"
      totalTexto={(d) => {
        const saldo = (d || []).reduce((s, x) => s + (Number(x.receitas) || 0) - (Number(x.despesas) || 0), 0);
        return `${formatMoney(saldo)} de saldo`;
      }}
      fetcher={relatoriosService.financeiro}
      tipoExport="financeiro"
      renderChart={(dados) => (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dados || []} margin={{ top: 24, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              tickLine={false} axisLine={false} tickMargin={8}
              tickFormatter={(m) => {
                const [, mes] = m.split("-");
                const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                return meses[Number(mes) - 1];
              }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              tickFormatter={formatAxisMoney} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(val, name) => [formatMoney(val), name]}
              cursor={{ fill: "var(--accent-dim)" }}
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[5, 5, 0, 0]} maxBarSize={26} />
            <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      )}
    />
  );
}