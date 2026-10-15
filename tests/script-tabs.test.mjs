import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import * as status from "../src/lib/scripts/status.ts";

// Exercise the actual Firebase helpers against a transactional in-memory adapter.
// No credentials, network access, or production data are used.
const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/firebase/scripts.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const projectPath = "projects/p";
const pathFor = (id) => `${projectPath}/scripts/${id}`;
function fixture(scripts, version = 1) {
  const data = new Map([[projectPath, { scriptStatusSchemaVersion: version }], ...Object.entries(scripts).map(([id, value]) => [pathFor(id), { ...value }])]);
  const reads = [], writes = [];
  const snapshot = (ref) => ({ id: ref.split("/").at(-1), ref, exists: () => data.has(ref), data: () => data.get(ref) });
  const sdk = {
    Timestamp: class {},
    collection: (_, ...segments) => segments.join("/"),
    doc: (_, ...segments) => segments.join("/"),
    where: (field, op, values) => ({ field, op, values }),
    query: (collection, ...constraints) => ({ collection, constraints }),
    getDocFromServer: async (ref) => snapshot(ref),
    getDocs: async (query) => {
      reads.push(query);
      const collection = typeof query === "string" ? query : query.collection;
      return { docs: [...data.keys()].filter((ref) => ref.startsWith(collection + "/") && ref.split("/").length === collection.split("/").length + 1)
        .filter((ref) => typeof query === "string" || query.constraints.every(({ field, values }) => values.includes(data.get(ref)[field])))
        .map(snapshot) };
    },
    serverTimestamp: () => "server-time",
    updateDoc: async (ref, patch) => { writes.push(ref); data.set(ref, { ...data.get(ref), ...patch }); },
    runTransaction: async (_, callback) => {
      const pending = [];
      const result = await callback({ get: async (ref) => snapshot(ref), update: (ref, patch) => pending.push([ref, patch]) });
      for (const [ref, patch] of pending) await sdk.updateDoc(ref, patch);
      return result;
    }
  };
  const exports = {};
  runInNewContext(compiled, { exports, require: (name) => {
    if (name === "firebase/firestore") return sdk;
    if (name === "@/lib/firebase/firestore") return { getFirebaseFirestore: () => ({}) };
    if (name === "@/lib/scripts/status") return status;
    return {};
  } });
  return { api: exports, data, reads, writes };
}

test("six statuses are partitioned across exactly three tabs", () => {
  assert.deepEqual(status.SCRIPT_TABS.flatMap(status.getTabStatuses), status.SCRIPT_STATUS_OPTIONS);
  for (const item of status.SCRIPT_STATUS_OPTIONS) assert.ok(status.getTabStatuses(status.getScriptTab(item)).includes(item));
  assert.equal(status.getNextScriptStatus("recorded"), "draft");
  assert.equal(status.getNextScriptStatus("idea"), "idea");
  assert.equal(status.getNextScriptStatus("archived"), "archived");
});

test("each list request filters on the server and never reads the other tabs", async () => {
  const f = fixture(Object.fromEntries(status.SCRIPT_STATUS_OPTIONS.map((item) => [item, { status: item }])));
  for (const tab of status.SCRIPT_TABS) {
    const result = await f.api.fetchScriptsByProjectId("p", tab);
    assert.deepEqual([...result.map((item) => item.status)].sort(), status.getTabStatuses(tab).sort());
    assert.equal(f.reads.at(-1).constraints[0].field, "status");
  }
  assert.equal(f.reads.length, 3);
});

test("each tab can reorder without changing other tabs or edit timestamps", async () => {
  for (const tab of status.SCRIPT_TABS) {
    const state = status.getTabStatuses(tab)[0];
    const other = tab === "ideas" ? "archived" : "idea";
    const f = fixture({ a: { status: state, sortOrder: 3, updatedAt: "yesterday" }, b: { status: state, sortOrder: 5 }, untouched: { status: other, sortOrder: 99 } });
    await f.api.reorderProjectScripts("p", tab, ["b", "a"]);
    assert.equal(f.data.get(pathFor("b")).sortOrder, 0);
    assert.equal(f.data.get(pathFor("a")).sortOrder, 1);
    assert.equal(f.data.get(pathFor("a")).updatedAt, "yesterday");
    assert.equal(f.data.get(pathFor("untouched")).sortOrder, 99);
    assert.deepEqual(f.writes, [pathFor("b"), pathFor("a")]);
    const result = await f.api.fetchScriptsByProjectId("p", tab);
    assert.deepEqual([...result.map((item) => item.id)], ["b", "a"]);
  }
});

test("reordering refuses scripts moved to another tab or deleted since loading", async () => {
  for (const target of [{ status: "archived" }, null]) {
    const f = fixture({ a: { status: "draft", sortOrder: 1 }, ...(target ? { b: target } : {}) });
    await assert.rejects(f.api.reorderProjectScripts("p", "scripts", ["b", "a"]));
    assert.equal(f.writes.length, 0);
  }
});

test("duplicate reorder IDs are rejected before writes", async () => {
  const f = fixture({ a: { status: "idea" } });
  await assert.rejects(f.api.reorderProjectScripts("p", "ideas", ["a", "a"]));
  assert.equal(f.writes.length, 0);
});

test("moving tabs puts the script first; workflow changes retain its order", async () => {
  const f = fixture({ a: { status: "idea", sortOrder: 8 }, b: { status: "draft", sortOrder: 4 } });
  await f.api.updateProjectScriptStatus("p", "a", { status: "draft" });
  assert.ok(f.data.get(pathFor("a")).sortOrder < 0);
  const order = f.data.get(pathFor("a")).sortOrder;
  await f.api.updateProjectScriptStatus("p", "a", { status: "completed" });
  assert.equal(f.data.get(pathFor("a")).sortOrder, order);
  assert.equal(f.data.get(pathFor("b")).sortOrder, 4);
  await f.api.updateProjectScriptStatus("p", "a", { status: "archived" });
  assert.equal(f.data.get(pathFor("a")).status, "archived");
  await f.api.updateProjectScriptStatus("p", "a", { status: "recorded" });
  assert.equal(f.data.get(pathFor("a")).status, "recorded");
});

test("legacy status migration preserves contents/order and is only performed once", async () => {
  const f = fixture({ old: { title: "legacy", sortOrder: 7, updatedAt: "before" }, existing: { status: "completed", sortOrder: 1 } }, 0);
  await f.api.migrateProjectScriptStatuses("p");
  assert.deepEqual(f.data.get(pathFor("old")), { title: "legacy", sortOrder: 7, updatedAt: "before", status: "draft" });
  assert.equal(f.data.get(pathFor("existing")).status, "completed");
  assert.equal(f.data.get(projectPath).scriptStatusSchemaVersion, 1);
  const reads = f.reads.length;
  await f.api.migrateProjectScriptStatuses("p");
  assert.equal(f.reads.length, reads);
  assert.ok((await f.api.fetchScriptsByProjectId("p", "scripts")).some((item) => item.id === "old"));
});
