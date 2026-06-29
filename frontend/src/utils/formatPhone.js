export function formatPhone(phone) {
  if (!phone) return "";
  const d = String(phone).replace(/\D/g, "");
  if (d.length === 13) {
    return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12) {
    return `(${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  return d;
}

export function maskPhone(value) {
  const d = String(value).replace(/\D/g, "");
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9, 13)}`;
}
