/**
 * ❌ Anti-patterns for pipes.
 */
import { JSONPath, JSONQuery, PIPES } from "@ecosy/json";

const data = { name: "Alice", score: null };

// ❌ Using pipes with JSONPath
// JSONPath.query(data, "$.name | uppercase"); // Parse error!
// ✅ Fix: JSONQuery.evaluate(data, "$.name | uppercase");

// ❌ Mutating PIPES directly
PIPES["custom"] = (v) => v;
// ✅ Fix: JSONQuery.registerPipe("custom", (v) => v);

// ❌ Using | default when ?? is more appropriate for fallback chains
JSONQuery.evaluate(data, "$.missing | default('fallback')");
// ✅ Better: JSONQuery.evaluate(data, "$.missing ?? 'fallback'");

// ❌ Formatting in JS after query
const name = JSONQuery.evaluate(data, "$.name");
const upper = String(name).toUpperCase();
// ✅ Fix: JSONQuery.evaluate(data, "$.name | uppercase");
