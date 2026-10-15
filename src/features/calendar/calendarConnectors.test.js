import { expect, it, vi } from "vitest";
import { readCalendarEvents, writeCalendarEvent } from "./calendarConnectors";
it("reads the selected Google calendar and normalizes events", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "a",
            summary: "Study",
            start: { dateTime: "2026-10-15T12:00:00Z" },
            end: { dateTime: "2026-10-15T12:25:00Z" },
          },
        ],
      }),
    });
  const events = await readCalendarEvents(
    "google",
    "token",
    "work@example.test",
    request,
  );
  expect(request.mock.calls[0][0]).toContain("work%40example.test/events");
  expect(events[0].title).toBe("Study");
});
it("writes a UTC Outlook event with an idempotent transaction ID", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ id: "created" }) });
  await writeCalendarEvent(
    "outlook",
    "token",
    "primary",
    {
      title: "Focus",
      details: "Plan",
      start: new Date("2026-10-15T12:00:00Z"),
      end: new Date("2026-10-15T12:25:00Z"),
    },
    "transaction",
    request,
  );
  const body = JSON.parse(request.mock.calls[0][1].body);
  expect(body.start).toEqual({
    dateTime: "2026-10-15T12:00:00.000",
    timeZone: "UTC",
  });
  expect(body.transactionId).toBe("transaction");
});
it("normalizes Outlook UTC values before displaying them in a local timezone", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          {
            id: "a",
            subject: "Focus",
            start: { dateTime: "2026-10-15T12:00:00", timeZone: "UTC" },
            end: { dateTime: "2026-10-15T12:25:00", timeZone: "UTC" },
          },
        ],
      }),
    });
  expect(
    (await readCalendarEvents("outlook", "token", "selected", request))[0]
      .start,
  ).toBe("2026-10-15T12:00:00Z");
});
it("recovers a Google event after a duplicate retry instead of creating another block", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ status: 409, ok: false })
    .mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ id: "transaction" }),
    });
  const result = await writeCalendarEvent(
    "google",
    "token",
    "primary",
    {
      title: "Focus",
      details: "",
      start: new Date("2026-10-15T12:00:00Z"),
      end: new Date("2026-10-15T12:25:00Z"),
    },
    "transaction",
    request,
  );
  expect(result.id).toBe("transaction");
  expect(request.mock.calls[1][0]).toContain("/events/transaction");
  expect(request.mock.calls[1][1].method).toBeUndefined();
});
