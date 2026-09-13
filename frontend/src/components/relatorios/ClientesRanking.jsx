import { Users } from "lucide-react";
import { EmptyRelatorio } from "./EmptyRelatorio";
import styles from "../../styles/pages/relatorios.module.css";

function iniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

export function ClientesRanking({ dados = [], max = 5 }) {
  const lista = dados.slice(0, max);
  if (lista.length === 0) {
    return (
      <EmptyRelatorio
        titulo="Sem clientes no período"
        texto="Agendamentos realizados aparecem aqui como ranking de frequência."
        icone={Users}
      />
    );
  }

  const maxQtd = Math.max(...lista.map((c) => c.quantidade), 1);

  return (
    <div className={styles.rankList}>
      {lista.map((c, i) => (
        <div key={c.cliente_id} className={styles.rankItem}>
          <span className={`${styles.rankMedal} ${i === 0 ? styles.rankMedalTop : ""}`}>{i + 1}</span>
          <span className={styles.rankAvatar}>{iniciais(c.nome)}</span>
          <div className={styles.rankBody}>
            <span className={styles.rankName}>{c.nome}</span>
            {c.telefone && <span className={styles.rankPhone}>{c.telefone}</span>}
            <span className={styles.rankProgress}>
              <span className={styles.rankProgressFill} style={{ transform: `scaleX(${c.quantidade / maxQtd})` }} />
            </span>
          </div>
          <span className={styles.rankCount}>{c.quantidade}<small>x</small></span>
        </div>
      ))}
    </div>
  );
}