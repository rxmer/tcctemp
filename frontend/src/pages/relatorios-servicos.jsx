import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase, formatMoney } from "../components/RelatorioBase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { Wrench } from "lucide-react";

function formatAxisMoney(v) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v}`;
}

export function RelatorioServicos() {
  return (
    <RelatorioBase
      titulo="Relatório de Serviços"
      subtitle="Serviços mais realizados"
      cardTitulo="Serviços mais realizados"
      cardSub="Por receita gerada no período"
      comAgrupar={false}
      icone={Wrench}
      accentHex="#22c55e"
      totalTexto={(d) => (
        `${formatMoney((d || []).reduce((s, x) => s + Number(x.receita || 0), 0))} em receita`
      )}
      fetcher={relatoriosService.servicos}
      tipoExport="servicos"
      renderChart={(dados) => (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={(dados || []).slice(0, 8)} layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradServicos" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              tickFormatter={formatAxisMoney} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="nome" width={150}
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(val) => [formatMoney(val), "Receita"]}
              cursor={{ fill: "rgba(34, 197, 94, 0.08)" }}
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Bar dataKey="receita" fill="url(#gradServicos)" radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      )}
    />
  );
}