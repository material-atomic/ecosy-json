/**
 * ❌ Anti-patterns for filter expressions.
 */
import { JSONPath } from "@ecosy/json";

const data = {
  users: [
    { name: "Alice", age: 25, active: true },
    { name: "Bob", age: 17, active: false },
  ],
};

// ❌ Using $ instead of @ in filter
JSONPath.query(data, "$.users[?($.age >= 18)]");
// Checks root.age (undefined), NOT each user's age!
// ✅ Fix: "$.users[?(@.age >= 18)]"

// ❌ Filtering in JS after querying all
const all = JSONPath.query(data, "$.users[*]");
const active = all.filter((u: any) => u.active);
// ✅ Fix: JSONPath.query(data, "$.users[?(@.active == true)]");

// ❌ Using JS truthiness assumptions
// JSONPath.query(data, "$.users[?(@.active)]");
// The evaluator checks if the path exists and has a truthy value.
// For explicit boolean checks:
// ✅ Fix: "$.users[?(@.active == true)]"
