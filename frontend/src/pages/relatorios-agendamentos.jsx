import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase, formatPeriodo } from "../components/RelatorioBase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { CalendarDays } from "lucide-react";

export function RelatorioAgendamentos() {
  return (
    <RelatorioBase
      titulo="Relatório de Agendamentos"
      subtitle="Agendamentos por período"
      cardTitulo="Agendamentos por período"
      cardSub="Volume de agendamentos no período selecionado"
      comAgrupar
      icone={CalendarDays}
      accentHex="#d4a843"
      totalTexto={(d) => `${(d || []).reduce((s, x) => s + x.total, 0).toLocaleString("pt-BR")} agendamentos`}
      fetcher={relatoriosService.agendamentos}
      tipoExport="agendamentos"
      renderChart={(dados, agrupar) => (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dados || []} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAgendamentos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e6b84d" />
                <stop offset="100%" stopColor="#b8912f" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="periodo" tickFormatter={(p) => formatPeriodo(p, agrupar)}
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false}
              tickMargin={8} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(p) => formatPeriodo(p, agrupar)}
              formatter={(val) => [val, "Agendamentos"]}
              cursor={{ fill: "var(--accent-dim)" }}
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                boxShadow: "var(--shadow-md)",
              }}
            />
            <Bar dataKey="total" fill="url(#gradAgendamentos)" radius={[6, 6, 0, 0]} maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer>
      )}
    />
  );
}