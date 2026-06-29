import styles from "./styles.module.css";

export function DataTable({ columns, rows, emptyMessage = "Nenhum registro encontrado.", loading = false }) {
  if (loading) {
    return <div className={styles.loadingState}>Carregando...</div>;
  }

  if (!rows || rows.length === 0) {
    return <div className={styles.emptyState}>{emptyMessage}</div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx}>
              {columns.map((col) => (
                <td key={col.key} className={col.cellClass || ""} data-label={col.label}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActionBtn({ children, onClick, title, danger = false, className = "" }) {
  return (
    <button
      className={`${styles.actionBtn} ${danger ? styles.actionDelete : ""} ${className}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ActionBtns({ children }) {
  return <div className={styles.actionBtns}>{children}</div>;
}
