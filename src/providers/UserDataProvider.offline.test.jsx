// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UserDataProvider, useUserData } from "./UserDataProvider";
const backend = vi.hoisted(() => ({ offline: false, saved: null }));
vi.mock("./AuthProvider.jsx", () => ({
  useAuth: () => ({ user: { id: "offline-user" } }),
}));
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        abortSignal: () => q,
        maybeSingle: async () =>
          backend.offline
            ? { error: new Error("offline") }
            : {
                data: {
                  user_id: "offline-user",
                  tasks: [],
                  archived_tasks: [],
                  pomodoro_history: {},
                  settings: {},
                  updated_at: "initial",
                },
              },
      };
      return q;
    },
    rpc: async (_name, args) => {
      backend.saved = args.next_state;
      return { data: { row: { ...args.next_state, updated_at: "saved" } } };
    },
    channel: () => {
      const c = { on: () => c, subscribe: () => c };
      return c;
    },
    removeChannel: vi.fn(),
  },
}));
const Harness = () => {
  const r = useUserData();
  return (
    <>
      <p>{r.loading ? "Loading" : r.tasks[0]?.text || "Empty"}</p>
      <button
        onClick={() => r.setTasks([{ id: "local", text: "Offline work" }])}
      >
        Add
      </button>
      <p>{r.syncStatus}</p>
    </>
  );
};
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
it("restores queued account edits after an offline reload and retries when online", async () => {
  backend.offline = false;
  backend.saved = null;
  vi.stubGlobal("navigator", { onLine: false });
  const view = render(
    <UserDataProvider>
      <Harness />
    </UserDataProvider>,
  );
  await screen.findByText("Empty");
  fireEvent.click(screen.getByText("Add"));
  await screen.findByText("Offline work");
  view.unmount();
  backend.offline = true;
  render(
    <UserDataProvider>
      <Harness />
    </UserDataProvider>,
  );
  await screen.findByText("Offline work");
  vi.stubGlobal("navigator", { onLine: true });
  window.dispatchEvent(new Event("online"));
  await waitFor(
    () => expect(backend.saved?.tasks[0].text).toBe("Offline work"),
    { timeout: 3000 },
  );
});
