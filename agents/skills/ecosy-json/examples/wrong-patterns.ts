/**
 * ❌ Anti-patterns — common mistakes when using @ecosy/json.
 */
import { JSONPath, JSONQuery, PIPES } from "@ecosy/json";

const data = {
  users: [
    { name: "Alice", age: 25, active: true },
    { name: "Bob", age: 17, active: false },
    { name: "Charlie", age: 30, active: true },
  ],
};

// ── ❌ Re-compiling inside loops ────────────────────────────
// Wrong: re-parses expression on every call
const items = [{}, {}, {}];
for (const item of items) {
  JSONPath.query(item, "$.nested.value"); // re-compiles each time!
}
// ✅ Fix: const path = new JSONPath("$.nested.value"); path.query(item);

// ── ❌ Filtering in JS after wildcard ───────────────────────
// Wrong: fetches all, then filters manually
const allUsers = JSONPath.query(data, "$.users[*]");
const activeUsers = allUsers.filter((u: any) => u.active);
// ✅ Fix: JSONPath.query(data, "$.users[?(@.active == true)]");

// ── ❌ Manual existence check ───────────────────────────────
// Wrong: checking array length
const results = JSONPath.query(data, "$.users[0]");
const exists = results.length > 0;
// ✅ Fix: JSONPath.exists(data, "$.users[0]"); — returns boolean directly

// ── ❌ Using $ instead of @ in filters ──────────────────────
// Wrong: $ refers to root document, not current array element
JSONPath.query(data, "$.users[?($.age >= 18)]");
// This checks data.age (root level), not each user's age!
// ✅ Fix: "$.users[?(@.age >= 18)]" — @ is the current element

// ── ❌ Using pipes with JSONPath ────────────────────────────
// Wrong: JSONPath doesn't understand pipe syntax
// JSONPath.query(data, "$.users[0].name | uppercase"); // Parse error!
// ✅ Fix: JSONQuery.evaluate(data, "$.users[0].name | uppercase");

// ── ❌ Concatenating multiple evaluations ───────────────────
// Wrong: multiple calls when interpolation handles it
const name = JSONQuery.evaluate(data, "$.users[0].name");
const count = JSONQuery.evaluate(data, "COUNT($.users[*])");
const msg = `${name} of ${count} users`;
// ✅ Fix: JSONQuery.evaluate(data, "`{$.users[0].name} of {COUNT($.users[*])} users`");

// ── ❌ Mutating PIPES directly ──────────────────────────────
// Wrong: direct mutation bypasses any validation
PIPES["myPipe"] = (v) => v;
// ✅ Fix: JSONQuery.registerPipe("myPipe", (v) => v);

// ── ❌ Hand-rolling recursive descent ───────────────────────
// Wrong: manual recursion misses path tracking and generator efficiency
function findAll(obj: any, key: string): any[] {
  const results: any[] = [];
  if (obj && typeof obj === "object") {
    if (key in obj) results.push(obj[key]);
    for (const v of Object.values(obj)) {
      results.push(...findAll(v, key));
    }
  }
  return results;
}
// ✅ Fix: JSONPath.query(data, "$..name"); — uses generator pipeline

// ── ❌ Using shorthand in JSONPath ──────────────────────────
// Wrong: auto-root shorthand only works in JSONQuery
// JSONPath.query(data, "users[0].name"); // Fails! No $ prefix
// ✅ Fix: JSONPath.query(data, "$.users[0].name");
// Or use JSONQuery: JSONQuery.evaluate(data, "users[0].name");
