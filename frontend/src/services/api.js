import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const REQUEST_TIMEOUT = 30000;

async function doFetch(path, options, session) {
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
      const text = await res.text();
      let body;
      try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
      return { ok: false, status: res.status, body };
    }

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { ok: true, data };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Requisição excedeu o tempo limite. Tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const result = await doFetch(path, options, session);

  if (!result.ok && result.status === 401) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session) {
      const retryResult = await doFetch(path, options, refreshData.session);
      if (retryResult.ok) return retryResult.data;
      throw new Error(retryResult.body?.error ?? "Sessão expirada. Faça login novamente.");
    }
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!result.ok) {
    throw new Error(result.body?.error ?? `Erro ${result.status}`);
  }

  return result.data;
}
