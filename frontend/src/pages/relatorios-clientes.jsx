import { relatoriosService } from "../services/relatorios.service";
import { RelatorioBase } from "../components/RelatorioBase";
import { ClientesRanking } from "../components/relatorios/ClientesRanking";
import { Users } from "lucide-react";

export function RelatorioClientes() {
  return (
    <RelatorioBase
      titulo="Clientes Frequentes"
      subtitle="Ranking de clientes por agendamentos"
      cardTitulo="Clientes mais frequentes"
      cardSub="Por quantidade de agendamentos no período"
      comAgrupar={false}
      icone={Users}
      accentHex="#d4a843"
      totalTexto={(d) => `${(d ?? []).length} clientes`}
      fetcher={relatoriosService.clientesFrequentes}
      tipoExport="clientes_frequentes"
      renderChart={(dados) => (
        <ClientesRanking dados={dados ?? []} max={10} />
      )}
    />
  );
}