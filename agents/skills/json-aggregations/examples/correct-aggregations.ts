/**
 * ✅ Correct aggregation patterns.
 */
import { JSONQuery } from "@ecosy/json";

const data = {
  orders: [
    { total: 150, status: "completed" },
    { total: 75, status: "pending" },
    { total: 200, status: "completed" },
  ],
  scores: [85, 92, 78, 95, 88],
};

// ✅ Built-in aggregations
JSONQuery.evaluate(data, "SUM($.orders[*].total)");     // 425
JSONQuery.evaluate(data, "COUNT($.orders[*])");          // 3
JSONQuery.evaluate(data, "AVG($.scores[*])");            // 87.6
JSONQuery.evaluate(data, "MIN($.scores[*])");            // 78
JSONQuery.evaluate(data, "MAX($.scores[*])");            // 95

// ✅ Aggregation on filtered data
JSONQuery.evaluate(data, "SUM($.orders[?(@.status == 'completed')].total)");
// 350

// ✅ Combined with pipes
JSONQuery.evaluate(data, "SUM($.orders[*].total) | currency('$')");

// ✅ In interpolation
JSONQuery.evaluate(
  data,
  "`{COUNT($.orders[*])} orders, total: {SUM($.orders[*].total)}`",
);

// ✅ Custom aggregation
JSONQuery.registerAggregation("MEDIAN", (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
});

JSONQuery.evaluate(data, "MEDIAN($.scores[*])"); // 88
