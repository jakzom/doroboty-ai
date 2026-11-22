import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchI02Json } from "./i02-client";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("optional local I02 requests", () => {
  it("never contacts an endpoint in a static build, even with supplied materials", async () => {
    vi.stubEnv("I02_LOCAL_DEV", "disabled");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    for (const path of ["api/i02/chat", "api/i02/analysis"]) {
      expect(
        await fetchI02Json(
          path,
          { method: "POST", body: "synthetic materials" },
          new AbortController().signal,
        ),
      ).toBeNull();
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("times out a stalled connection and releases its timer for a deliberate retry", async () => {
    vi.stubEnv("I02_LOCAL_DEV", "enabled");
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options!.signal!.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    vi.stubGlobal("fetch", request);
    const pending = fetchI02Json(
      "api/i02/analysis",
      { method: "POST" },
      new AbortController().signal,
    );
    const rejected = expect(pending).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(50_000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
    request.mockResolvedValue(Response.json({ available: true }));
    await expect(
      fetchI02Json("api/i02/chat", {}, new AbortController().signal),
    ).resolves.toMatchObject({ ok: true, data: { available: true } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("also bounds waiting for the response body and respects cancellation", async () => {
    vi.stubEnv("I02_LOCAL_DEV", "enabled");
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
      const stream = new ReadableStream({
        start(controller) {
          options!.signal!.addEventListener("abort", () =>
            controller.error(new DOMException("Aborted", "AbortError")),
          );
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", request);
    const owner = new AbortController();
    const pending = fetchI02Json("api/i02/chat", {}, owner.signal);
    const rejected = expect(pending).rejects.toThrow("Aborted");
    await vi.advanceTimersByTimeAsync(50_000);
    await rejected;
    const cancelled = fetchI02Json("api/i02/chat", {}, owner.signal);
    const cancelResult = expect(cancelled).rejects.toThrow("Aborted");
    owner.abort();
    await cancelResult;
    expect(vi.getTimerCount()).toBe(0);
  });
});
