/**
 * ❌ Anti-patterns for JSONPath.
 */
import { JSONPath } from "@ecosy/json";

const data = { users: [{ name: "Alice" }, { name: "Bob" }] };

// ❌ Re-compiling inside a loop
const items = [data, data, data];
for (const item of items) {
  JSONPath.query(item, "$.users[*].name"); // re-compiles each time!
}
// ✅ Fix:
// const path = new JSONPath("$.users[*].name");
// for (const item of items) path.query(item);

// ❌ Manual existence check
const results = JSONPath.query(data, "$.users[0]");
const exists = results.length > 0;
// ✅ Fix: JSONPath.exists(data, "$.users[0]");

// ❌ Manual first element
const first = JSONPath.query(data, "$.users[0].name")[0];
// ✅ Fix: JSONPath.first(data, "$.users[0].name");

// ❌ Missing $ root prefix
// JSONPath.query(data, "users[0].name"); // Fails!
// ✅ Fix: JSONPath.query(data, "$.users[0].name");
