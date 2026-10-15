import { afterEach, expect, it, vi } from "vitest";
import handler from "../../api/youtube/radio.js";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("returns only a live embeddable broadcast from the official channel", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "rFZHOHl-L8A",
              snippet: {
                channelId: "UCSJ4gkVC6NrvII8umztf0Ow",
                title: "Bossa radio",
                liveBroadcastContent: "live",
              },
              status: { embeddable: true },
            },
          ],
        }),
      }),
  );
  const res = { setHeader: vi.fn(), end: vi.fn() };
  await handler({ method: "GET" }, res);
  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({
    videoId: "rFZHOHl-L8A",
    title: "Bossa radio",
  });
});
it("discovers a verified replacement after the known broadcast ends", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "test");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: { videoId: "abcdefghijk" } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "abcdefghijk",
              snippet: {
                channelId: "UCSJ4gkVC6NrvII8umztf0Ow",
                title: "New study radio",
                liveBroadcastContent: "live",
              },
              status: { embeddable: true },
            },
          ],
        }),
      }),
  );
  const res = { setHeader: vi.fn(), end: vi.fn() };
  await handler({ method: "GET" }, res);
  expect(JSON.parse(res.end.mock.calls[0][0]).videoId).toBe("abcdefghijk");
  expect(fetch).toHaveBeenCalledTimes(3);
});
