export function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr, emptyValue = "") {
  if (!dateStr) return emptyValue;
  const [y, m, d] = String(dateStr).split("-");
  return `${d}/${m}/${y}`;
}