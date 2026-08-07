/**
 * Cliente mínimo de Evolution API para provisionar la línea privada de WhatsApp
 * de un club (crear instancia, traer el QR, consultar estado).
 *
 * Config por env (no hardcodear secretos):
 *   EVOLUTION_URL      → base URL del servidor Evolution
 *   EVOLUTION_API_KEY  → AUTHENTICATION_API_KEY global del servidor
 */

const EVO_URL = process.env.EVOLUTION_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";

export function evolutionConfigured(): boolean {
  return Boolean(EVO_URL && EVO_KEY);
}

type EvoResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function evoFetch<T>(
  path: string,
  init?: RequestInit
): Promise<EvoResult<T>> {
  if (!evolutionConfigured()) {
    return { ok: false, error: "WhatsApp no está configurado en el servidor." };
  }
  try {
    const res = await fetch(`${EVO_URL}${path}`, {
      ...init,
      headers: {
        apikey: EVO_KEY,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as T;
    if (!res.ok) {
      return { ok: false, error: `Evolution respondió ${res.status}.` };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, error: "No pudimos contactar el servidor de WhatsApp." };
  }
}

/** Crea la instancia si no existe. Idempotente: si ya existe, no falla. */
export async function ensureInstance(
  instanceName: string
): Promise<EvoResult<unknown>> {
  const res = await evoFetch<unknown>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  });
  // Si ya existía, Evolution devuelve 403/409: lo tratamos como éxito.
  if (!res.ok && /40[39]/.test(res.error)) return { ok: true, data: null };
  return res;
}

/** Trae el QR (base64) para vincular el teléfono del club. */
export async function connectInstance(
  instanceName: string
): Promise<EvoResult<{ base64: string | null }>> {
  const res = await evoFetch<{ base64?: string; code?: string }>(
    `/instance/connect/${instanceName}`
  );
  if (!res.ok) return res;
  return { ok: true, data: { base64: res.data.base64 ?? null } };
}

/** Estado de conexión: 'connected' (open) | 'connecting' | 'disconnected'. */
export async function instanceState(
  instanceName: string
): Promise<EvoResult<{ status: string; phone: string | null }>> {
  const res = await evoFetch<{
    instance?: { state?: string; owner?: string; number?: string };
  }>(`/instance/connectionState/${instanceName}`);
  if (!res.ok) return res;
  const state = res.data.instance?.state ?? "close";
  const status =
    state === "open"
      ? "connected"
      : state === "connecting"
        ? "connecting"
        : "disconnected";
  const owner = res.data.instance?.owner ?? res.data.instance?.number ?? null;
  const phone = owner ? owner.replace(/@.*/, "") : null;
  return { ok: true, data: { status, phone } };
}
