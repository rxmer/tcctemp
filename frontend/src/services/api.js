import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const REQUEST_TIMEOUT = 30000;

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
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

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Requisição excedeu o tempo limite. Tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
