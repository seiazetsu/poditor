import assert from "node:assert/strict";
import { test } from "node:test";
import { receiveMemo, completeMemoSave, hasMemoConflict } from "../src/lib/projects/memo-state.ts";

const clean = { draft: "old", base: "old", remote: "old" };

test("saved updates reach idle readers, including empty memos", () => {
  for (const content of ["new", ""]) {
    assert.deepEqual(receiveMemo(clean, content), { draft: content, base: content, remote: content });
  }
});

test("remote changes preserve unsaved input and expose a conflict", () => {
  const result = receiveMemo({ ...clean, draft: "mine" }, "theirs");
  assert.equal(result.draft, "mine");
  assert.equal(result.base, "old");
  assert.equal(result.remote, "theirs");
  assert.equal(hasMemoConflict(result), true);
});

test("identical remote content resolves a conflict", () => {
  const result = receiveMemo({ ...clean, draft: "mine" }, "mine");
  assert.equal(hasMemoConflict(result), false);
  assert.equal(result.base, "mine");
});

test("save completion works before or after the subscription acknowledgement", () => {
  const editing = { ...clean, draft: "mine" };
  const expected = { draft: "mine", base: "mine", remote: "mine" };
  assert.deepEqual(completeMemoSave(editing, "mine", "old"), expected);
  assert.deepEqual(completeMemoSave(receiveMemo(editing, "mine"), "mine", "old"), expected);
});

test("a newer remote save arriving before save completion is retained", () => {
  const state = { draft: "mine", base: "old", remote: "newer" };
  assert.deepEqual(completeMemoSave(state, "mine", "old"), { draft: "newer", base: "newer", remote: "newer" });
});
