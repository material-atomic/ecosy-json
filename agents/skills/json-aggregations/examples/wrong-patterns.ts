/**
 * ❌ Anti-patterns for aggregations.
 */
import { JSONPath, JSONQuery, AGGREGATIONS } from "@ecosy/json";

const data = { items: [{ price: 10 }, { price: 20 }] };

// ❌ Manual aggregation in JS after query
const prices = JSONPath.query<number>(data, "$.items[*].price");
const sum = prices.reduce((a, b) => a + b, 0);
// ✅ Fix: JSONQuery.evaluate(data, "SUM($.items[*].price)");

// ❌ Lowercase function name
// JSONQuery.evaluate(data, "sum($.items[*].price)"); // Not recognized
// ✅ Fix: "SUM($.items[*].price)" — uppercase required

// ❌ Mutating AGGREGATIONS directly
AGGREGATIONS["CUSTOM"] = (arr) => arr[0];
// ✅ Fix: JSONQuery.registerAggregation("CUSTOM", (arr) => arr[0]);

// ❌ Using aggregation in JSONPath
// JSONPath.query(data, "SUM($.items[*].price)"); // Parse error!
// ✅ Fix: JSONQuery.evaluate(data, "SUM($.items[*].price)");
