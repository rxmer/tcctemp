export function estadoLabel(estado) {
  if (!estado) return "";
  const t = estado.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function estadoGrupo(estado) {
  if (!estado) return "agendando";
  if (estado === "FALANDO_COM_ATENDENTE") return "atendente";
  if (estado === "MENU_PRINCIPAL") return "menu";
  return "agendando";
}