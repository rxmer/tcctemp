import { BarChart3 } from "lucide-react";
import styles from "../../styles/pages/relatorios.module.css";

export function EmptyRelatorio({ titulo = "Nenhum dado disponível", texto = "Ajuste o período selecionado para visualizar este relatório.", icone = BarChart3 }) {
  const Icone = icone;
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}><Icone size={22} /></span>
      <span className={styles.emptyTitle}>{titulo}</span>
      <span className={styles.emptyText}>{texto}</span>
    </div>
  );
}