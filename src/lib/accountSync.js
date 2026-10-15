import { readJson, writeJson, scopedKey } from "./storage";
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
export const mergeAccountState = (base, local, remote) => {
  if (equal(base, local)) return remote;
  if (Array.isArray(local) && Array.isArray(remote)) {
    const all = [...(base || []), ...local, ...remote];
    const identity = (item) => item?.id ?? item?.sessionId;
    if (all.every((item) => identity(item) != null)) {
      const b = new Map((base || []).map((x) => [identity(x), x]));
      const l = new Map(local.map((x) => [identity(x), x]));
      const r = new Map(remote.map((x) => [identity(x), x]));
      const order = [...new Set([...l.keys(), ...r.keys()])];
      return order
        .filter((id) => l.has(id) || !b.has(id))
        .map((id) =>
          l.has(id)
            ? mergeAccountState(b.get(id), l.get(id), r.get(id))
            : r.get(id),
        )
        .filter(Boolean);
    }
    return local;
  }
  if (record(local) && record(remote)) {
    const result = { ...remote };
    for (const key of new Set([
      ...Object.keys(base || {}),
      ...Object.keys(local),
    ])) {
      if (["updated_at", "created_at", "user_id"].includes(key)) continue;
      if (!Object.hasOwn(local, key)) {
        if (Object.hasOwn(base || {}, key)) delete result[key];
      } else if (!equal(base?.[key], local[key]))
        result[key] = mergeAccountState(base?.[key], local[key], remote[key]);
    }
    return result;
  }
  return local;
};
const key = (id) => scopedKey(id, "account-cache-v2");
export const readAccountCache = (id) => readJson(key(id), null);
export const cacheAccountState = (id, row, pending = null) =>
  writeJson(key(id), { row, pending });
export const syncAccountState = async (client, id, base, local) => {
  let current = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = mergeAccountState(base, local, current);
    const { data, error } = await client.rpc("save_focus_state", {
      expected_updated_at: current?.updated_at || null,
      next_state: { ...next, user_id: id },
    });
    if (error) throw error;
    if (!data.conflict) return data.row;
    current = data.row;
  }
  throw new Error(
    "Concurrent edits are still arriving. Your changes remain queued.",
  );
};
