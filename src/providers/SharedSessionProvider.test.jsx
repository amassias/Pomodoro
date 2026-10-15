// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  SharedSessionProvider,
  useSharedSession,
} from "./SharedSessionProvider";
const backend = vi.hoisted(() => ({ calls: [], locked: false, ready: false }));
vi.mock("../lib/supabase", () => ({
  supabase: {
    rpc: async (_name, args) => {
      backend.calls.push(args);
      if (args.p_action === "ready") backend.ready = args.p_payload.ready;
      if (args.p_action === "lock") backend.locked = args.p_payload.locked;
      return {
        data: {
          isHost: true,
          memberId: "me",
          locked: backend.locked,
          participants: [{ id: "me", name: "Me", ready: backend.ready }],
          messages: [],
          expiresAt: Date.now() + 10000,
        },
        error: null,
      };
    },
  },
}));
const Harness = () => {
  const r = useSharedSession();
  return (
    <>
      <button onClick={r.createRoom}>Create</button>
      <button onClick={r.toggleReady}>Ready</button>
      <button onClick={r.toggleRoomLock}>Lock</button>
      <button onClick={r.leaveRoom}>Leave</button>
      <p>{r.connectionStatus}</p>
      <p>{r.roomLocked ? "Locked" : "Open"}</p>
      <p>{r.isReady ? "Ready now" : "Not ready"}</p>
    </>
  );
};
beforeEach(() => {
  backend.calls = [];
  backend.locked = false;
  backend.ready = false;
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});
afterEach(cleanup);
it("uses admitted server state for ready, locking and leaving", async () => {
  render(
    <SharedSessionProvider>
      <Harness />
    </SharedSessionProvider>,
  );
  fireEvent.click(screen.getByText("Create"));
  await screen.findByText("connected");
  fireEvent.click(screen.getByText("Ready"));
  await screen.findByText("Ready now");
  fireEvent.click(screen.getByText("Lock"));
  await screen.findByText("Locked");
  expect(
    backend.calls.some((c) => c.p_action === "lock" && c.p_payload.locked),
  ).toBe(true);
  fireEvent.click(screen.getByText("Leave"));
  expect(screen.getByText("idle")).toBeTruthy();
  expect(window.location.search).toBe("");
});
