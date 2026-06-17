import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }

  return res.json();
}
