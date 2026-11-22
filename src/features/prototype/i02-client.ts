// Portable static builds stay offline; hosted builds explicitly enable same-origin APIs.
export async function fetchI02Json(path: string, options: RequestInit, signal: AbortSignal) {
  if (import.meta.env.I02_API_ENABLED !== "enabled") return null;
  signal.throwIfAborted();
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const timeout = setTimeout(() => controller.abort(), 50_000);
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const data: unknown = response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : null;
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}
