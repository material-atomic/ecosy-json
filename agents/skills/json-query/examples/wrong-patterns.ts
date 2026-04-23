/**
 * ❌ Anti-patterns for JSONQuery.
 */
import { JSONPath, JSONQuery } from "@ecosy/json";

const data = { user: { name: "Alice" }, items: [1, 2, 3] };

// ❌ Using pipes with JSONPath (not supported)
// JSONPath.query(data, "$.user.name | uppercase"); // Parse error!
// ✅ Fix: JSONQuery.evaluate(data, "$.user.name | uppercase");

// ❌ Concatenating multiple evaluations
const name = JSONQuery.evaluate(data, "$.user.name");
const count = JSONQuery.evaluate(data, "COUNT($.items[*])");
const msg = `${name} has ${count} items`;
// ✅ Fix: JSONQuery.evaluate(data, "`{$.user.name} has {COUNT($.items[*])} items`");

// ❌ Using auto-root in JSONPath
// JSONPath.query(data, "user.name"); // Fails!
// ✅ Fix: JSONPath.query(data, "$.user.name");
// Or: JSONQuery.evaluate(data, "user.name"); // auto-root works here

// ❌ Using | default when ?? is more appropriate
JSONQuery.evaluate(data, "$.missing | default('fallback')");
// Works, but the path is still fully evaluated first
// ✅ Better: JSONQuery.evaluate(data, "$.missing ?? 'fallback'");
// ?? skips to next segment immediately when null/undefined
