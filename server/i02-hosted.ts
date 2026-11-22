import {
  i02AnalysisRequestSchema,
  i02ChatRequestSchema,
} from "../src/features/prototype/i02-chat-contract.js";
import { analyzeI02Application, askI02Model, type I02Provider } from "./i02-provider.js";

type Endpoint = "chat" | "analysis";
type HostedOptions = {
  provider: I02Provider;
  rateLimitReady: boolean;
  origins: string[];
};
const maxBodyBytes = 320 * 1024;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });
}

async function readJson(request: Request, maxBytes: number) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return null;
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]);
  const cancel = () => void reader.cancel().catch(() => {});
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

// Public provider access is enabled only after its Vercel WAF limit is verified.
export function createI02HostedHandler(
  endpoint: Endpoint,
  options: () => HostedOptions,
  providerRequest: typeof fetch = fetch,
) {
  let running = 0;
  return async (request: Request) => {
    const { provider, rateLimitReady, origins } = options();
    const origin = request.headers.get("origin");
    const sameOrigin = origins.includes(new URL(request.url).origin);
    if (
      !sameOrigin ||
      (origin !== null && origin !== new URL(request.url).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return json({ error: "forbidden" }, 403);
    const configured = Boolean(provider.key) && rateLimitReady;
    if (request.method === "GET") return json({ available: configured });
    if (request.method !== "POST") return json({ error: "method" }, 405, { Allow: "GET, POST" });
    if (origin !== new URL(request.url).origin) return json({ error: "forbidden" }, 403);
    if (!configured) return json({ error: "not_configured" }, 503);
    const raw = await readJson(request, maxBodyBytes).catch(() => null);
    const body =
      endpoint === "analysis"
        ? i02AnalysisRequestSchema.safeParse(raw)
        : i02ChatRequestSchema.safeParse(raw);
    if (!body.success) return json({ error: "invalid_request" }, 400);
    // Additional instance backpressure; request quotas are enforced by Vercel WAF.
    if (running >= 2) return json({ error: "busy" }, 429, { "Retry-After": "10" });
    running++;
    const deadline = AbortSignal.timeout(45_000);
    try {
      const signal = AbortSignal.any([request.signal, deadline]);
      signal.throwIfAborted();
      const reply =
        "question" in body.data
          ? await askI02Model(provider, body.data, signal, providerRequest)
          : await analyzeI02Application(provider, body.data, signal, providerRequest);
      return json(reply);
    } catch {
      return json(
        { error: deadline.aborted ? "provider_timeout" : "provider_failed" },
        deadline.aborted ? 504 : 502,
      );
    } finally {
      running--;
    }
  };
}

export function hostedI02Options(): HostedOptions {
  return {
    provider: {
      key: process.env.I02_OPENAI_API_KEY?.trim() ?? "",
      model: process.env.I02_OPENAI_MODEL?.trim() || "gpt-5-mini",
    },
    rateLimitReady: process.env.I02_RATE_LIMIT_READY === "enabled",
    origins: [
      process.env.I02_SITE_ORIGIN?.trim() ?? "",
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ].filter(Boolean),
  };
}
