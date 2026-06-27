import { useState, useMemo } from "react";
import styles from "./Calendar.module.css";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const pad = first.getDay();
  const days = last.getDate();
  const rows = [];
  let cur = 1;
  for (let r = 0; r < 6; r++) {
    const week = [];
    for (let c = 0; c < 7; c++) {
      if ((r === 0 && c < pad) || cur > days) {
        week.push(null);
      } else {
        week.push(cur++);
      }
    }
    rows.push(week);
    if (cur > days) break;
  }
  return rows;
}

export function Calendar({ agendamentos = [], selectedDate, onDateSelect, onMonthChange }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  const countMap = useMemo(() => {
    const m = {};
    agendamentos.forEach((a) => {
      m[a.data_agendamento] = (m[a.data_agendamento] || 0) + 1;
    });
    return m;
  }, [agendamentos]);

  function navigate(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    onMonthChange?.(d.getFullYear(), d.getMonth());
  }

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    onMonthChange?.(t.getFullYear(), t.getMonth());
  }

  function dateStr(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <button type="button" className={styles.nav} onClick={() => navigate(-1)}>&lsaquo;</button>
        <span className={styles.title}>{MONTHS[month]} {year}</span>
        <button type="button" className={styles.nav} onClick={() => navigate(1)}>&rsaquo;</button>
        <button type="button" className={styles.todayBtn} onClick={goToday}>Hoje</button>
      </div>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>{d}</div>
        ))}
      </div>
      <div className={styles.grid}>
        {grid.map((week, wi) =>
          week.map((day, di) => {
            if (!day) return <div key={`${wi}-${di}`} className={styles.day} />;
            const ds = dateStr(day);
            const count = countMap[ds] || 0;
            const cls = [
              styles.day,
              ds === todayStr ? styles.dayToday : "",
              ds === selectedDate ? styles.daySelected : "",
              count > 0 ? styles.dayHasEvents : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={`${wi}-${di}`}
                className={cls}
                onClick={() => onDateSelect(ds === selectedDate ? null : ds)}
              >
                <span className={styles.dayNum}>{day}</span>
                {count > 0 && <span className={styles.badge}>{count}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
