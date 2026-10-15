import { expect, it } from "vitest";
import { mergeAccountState, syncAccountState } from "./accountSync";
it("merges independent edits, preserves remote additions and applies explicit local deletions", () => {
  const base = {
    tasks: [
      { id: 1, text: "Old" },
      { id: 2, text: "Delete" },
    ],
    settings: { alarmVolume: 50, focusDuration: 25 },
    pomodoro_history: {},
  };
  const local = {
    ...base,
    tasks: [{ id: 1, text: "Edited" }],
    settings: { ...base.settings, alarmVolume: 0 },
  };
  const remote = {
    ...base,
    tasks: [...base.tasks, { id: 3, text: "Other device" }],
    settings: { ...base.settings, focusDuration: 50 },
  };
  expect(mergeAccountState(base, local, remote)).toEqual({
    ...remote,
    tasks: [
      { id: 1, text: "Edited" },
      { id: 3, text: "Other device" },
    ],
    settings: { alarmVolume: 0, focusDuration: 50 },
  });
});
it("retries a revision conflict without dropping a concurrent edit", async () => {
  const rpc = async (_name, args) => ({
    data:
      args.expected_updated_at === "old"
        ? {
            conflict: true,
            row: { updated_at: "new", tasks: [{ id: 2, text: "remote" }] },
          }
        : { row: { ...args.next_state, updated_at: "saved" } },
    error: null,
  });
  const result = await syncAccountState(
    { rpc },
    "user",
    { tasks: [], updated_at: "old" },
    { tasks: [{ id: 1, text: "local" }] },
  );
  expect(result.tasks.map((t) => t.id)).toEqual([1, 2]);
});
