import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  i02AnalysisPath,
  i02AnalysisRequestSchema,
  i02ChatPath,
  i02ChatRequestSchema,
} from "../src/features/prototype/i02-chat-contract.js";
import {
  analyzeI02Application,
  askI02Model,
  type I02Provider as Provider,
} from "./i02-provider.js";

export { analyzeI02Application, askI02Model } from "./i02-provider.js";

const localAddresses = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
// Allow full snapshots and bounded conversation history, including JSON escaping.
const maxBodyBytes = 320 * 1024;

async function parseRequest(req: IncomingMessage) {
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") return null;
  const size = Number(req.headers["content-length"]);
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxBodyBytes) return null;
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk);
    received += bytes.length;
    if (received > maxBodyBytes) return null;
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

export function i02ChatPlugin(provider: Provider): Plugin {
  const busy = new Set<string>();
  async function handle(req: IncomingMessage, res: ServerResponse, path: string) {
    const host = req.headers.host ?? "";
    const origin = `http://${host}`;
    if (
      !localAddresses.has(req.socket.remoteAddress ?? "") ||
      !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host) ||
      (req.headers.origin !== undefined && req.headers.origin !== origin) ||
      req.headers["sec-fetch-site"] === "cross-site"
    )
      return json(res, 403, { error: "forbidden" });
    if (req.method === "GET") return json(res, 200, { available: Boolean(provider.key) });
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    if (req.headers.origin !== origin) return json(res, 403, { error: "forbidden" });
    if (!provider.key) return json(res, 503, { error: "not_configured" });
    if (busy.has(path)) return json(res, 429, { error: "busy" });

    const raw = await parseRequest(req).catch(() => null);
    const body =
      path === i02AnalysisPath
        ? i02AnalysisRequestSchema.safeParse(raw)
        : i02ChatRequestSchema.safeParse(raw);
    if (!body.success) return json(res, 400, { error: "invalid_request" });
    if (busy.has(path)) return json(res, 429, { error: "busy" });

    busy.add(path);
    const connection = new AbortController();
    const deadline = AbortSignal.timeout(45_000);
    res.once("close", () => connection.abort());
    try {
      const signal = AbortSignal.any([connection.signal, deadline]);
      const reply =
        "question" in body.data
          ? await askI02Model(provider, body.data, signal)
          : await analyzeI02Application(provider, body.data, signal);
      if (!res.destroyed) json(res, 200, reply);
    } catch {
      if (!res.destroyed) {
        if (deadline.aborted) json(res, 504, { error: "provider_timeout" });
        else json(res, 502, { error: "provider_failed" });
      }
    } finally {
      busy.delete(path);
    }
  }

  return {
    name: "i02-local-chat",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0].slice(1);
        if (path !== i02ChatPath && path !== i02AnalysisPath) return next();
        void handle(req, res, path);
      });
    },
  };
}
