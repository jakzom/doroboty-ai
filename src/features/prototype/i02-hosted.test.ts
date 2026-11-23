import { afterEach, describe, expect, it, vi } from "vitest";
import { createI02HostedHandler } from "../../../server/i02-hosted";

const origin = "https://prototype.example";
const options = {
  provider: { key: "synthetic-test-key", model: "gpt-5-mini" },
  rateLimitReady: true,
  origins: [origin],
};
const input = {
  applicationId: "application-i02",
  question: "Za co odpowiadał kandydat?",
  history: [],
};
const reply = {
  claims: [{ text: "Kandydat opisuje pracę przy projekcie.", sourceIds: ["answer-first"] }],
  unknown: "",
};
const envelope = () =>
  Response.json({
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(reply) }] }],
  });
const request = (endpoint: string, body?: unknown, cookie?: string) =>
  new Request(`${origin}/api/i02/${endpoint}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
afterEach(() => vi.useRealTimers());

describe("hosted application AI boundary", () => {
  it("reports configured availability without exposing provider credentials", async () => {
    const handler = createI02HostedHandler("chat", () => options);
    const response = await handler(request("chat"));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ available: true });
  });

  it("fails closed without the provider key or confirmed rate-limit deployment", async () => {
    for (const configured of [
      { ...options, provider: { ...options.provider, key: "" } },
      { ...options, rateLimitReady: false },
    ]) {
      const handler = createI02HostedHandler("chat", () => configured);
      expect(await (await handler(request("chat"))).json()).toEqual({ available: false });
      expect((await handler(request("chat", input))).status).toBe(503);
    }
  });

  it("rejects cross-origin requests, unknown hosts and unsupported methods", async () => {
    const provider = vi.fn<typeof fetch>();
    const handler = createI02HostedHandler("chat", () => options, provider);
    for (const bad of [
      new Request(`${origin}/api/i02/chat`, { headers: { Origin: "https://other.example" } }),
      new Request("https://other.example/api/i02/chat"),
      new Request(`${origin}/api/i02/chat`, { headers: { "Sec-Fetch-Site": "cross-site" } }),
      new Request(`${origin}/api/i02/chat`, { method: "POST" }),
    ])
      expect((await handler(bad)).status).toBe(403);
    const method = await handler(new Request(`${origin}/api/i02/chat`, { method: "DELETE" }));
    expect(method.status).toBe(405);
    expect(method.headers.get("allow")).toBe("GET, POST");
    expect(provider).not.toHaveBeenCalled();
  });

  it("accepts public same-origin requests and validates input before calling OpenAI", async () => {
    const provider = vi.fn<typeof fetch>().mockImplementation(async () => envelope());
    const handler = createI02HostedHandler("chat", () => options, provider);
    for (const body of [
      { ...input, question: "" },
      { ...input, extra: true },
    ])
      expect((await handler(request("chat", body))).status).toBe(400);
    const oversized = request("chat", { ...input, question: "x".repeat(330_000) });
    expect((await handler(oversized)).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
    const response = await handler(request("chat", input));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(reply);
    expect(provider).toHaveBeenCalledOnce();
    expect(provider.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer synthetic-test-key",
    });
    const analysis = createI02HostedHandler("analysis", () => options, provider);
    expect((await analysis(request("analysis", {}))).status).toBe(400);
  });

  it("returns a generic failure without leaking provider details and allows deliberate retry", async () => {
    const provider = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("private provider detail"));
    const handler = createI02HostedHandler("chat", () => options, provider);
    const failed = await handler(request("chat", input));
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: "provider_failed" });
    provider.mockResolvedValueOnce(envelope());
    expect((await handler(request("chat", input))).status).toBe(200);
  });

  it("passes request cancellation through to generation", async () => {
    const owner = new AbortController();
    const provider = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(new Error("cancelled")));
        }),
    );
    const handler = createI02HostedHandler("chat", () => options, provider);
    const pending = handler(new Request(request("chat", input), { signal: owner.signal }));
    await vi.waitFor(() => expect(provider).toHaveBeenCalledOnce());
    owner.abort();
    expect((await pending).status).toBe(502);
    expect(provider.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
