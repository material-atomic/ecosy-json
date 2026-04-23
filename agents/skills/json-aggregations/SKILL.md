# Skill: json-aggregations

Built-in and custom aggregation functions for reducing arrays to scalar values.

## When to Use

- Summing numeric arrays (totals, revenue, scores)
- Counting elements (array length)
- Computing averages, min, max
- Adding custom aggregation functions (median, distinct, etc.)

## Built-in Aggregations

| Function | Description | Example |
|----------|-------------|---------|
| `SUM(expr)` | Sum of numeric values | `SUM($.items[*].price)` |
| `COUNT(expr)` | Number of elements | `COUNT($.users[*])` |
| `AVG(expr)` | Arithmetic mean | `AVG($.reviews[*].rating)` |
| `MIN(expr)` | Minimum value | `MIN($.bids[*].amount)` |
| `MAX(expr)` | Maximum value | `MAX($.scores[*])` |

## Syntax

```
FUNC_NAME(json_query_expression)
```

The inner expression is recursively evaluated — it can be a JSONPath, another aggregation, or any valid JSONQuery expression.

```typescript
SUM($.items[*].price)                    // simple
SUM($.items[?(@.active == true)].price)  // filtered first
COUNT($.users[?(@.role == 'admin')])     // count filtered
```

## Registering Custom Aggregations

```typescript
import { JSONQuery } from "@ecosy/json";

// Median
JSONQuery.registerAggregation("MEDIAN", (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
});

// Distinct values
JSONQuery.registerAggregation("DISTINCT", (arr) => [...new Set(arr)]);

// First non-null
JSONQuery.registerAggregation("FIRST", (arr) =>
  arr.find((v) => v !== null && v !== undefined),
);

// Usage
JSONQuery.evaluate(data, "MEDIAN($.scores[*])");
JSONQuery.evaluate(data, "DISTINCT($.items[*].category)");
```

## Key Rules

1. **Aggregation names are UPPERCASE** — `SUM`, `COUNT`, not `sum`, `count`.
2. **Inner expression is evaluated first** — `SUM($.items[*].price)` resolves `$.items[*].price` to an array, then passes it to `SUM`.
3. **Non-array inputs are wrapped** — if the inner expression returns a single value, it's wrapped in `[value]` before passing to the function.
4. **Combine with pipes** — `SUM($.items[*].price) | currency('$')` works — aggregation resolves first, then pipe formats.
5. **Use `registerAggregation()` not direct mutation** of `AGGREGATIONS`.

## Examples

### Dashboard metrics
```typescript
const state = {
  orders: [
    { total: 150, status: "completed" },
    { total: 75, status: "pending" },
    { total: 200, status: "completed" },
  ],
  reviews: [
    { rating: 4.5 },
    { rating: 3.0 },
    { rating: 5.0 },
  ],
};

JSONQuery.evaluate(state, "SUM($.orders[*].total)");           // 425
JSONQuery.evaluate(state, "COUNT($.orders[?(@.status == 'completed')])"); // 2
JSONQuery.evaluate(state, "AVG($.reviews[*].rating)");         // ~4.17
JSONQuery.evaluate(state, "MIN($.orders[*].total)");           // 75
JSONQuery.evaluate(state, "MAX($.orders[*].total)");           // 200
```

### With pipes and interpolation
```typescript
JSONQuery.evaluate(state, "SUM($.orders[*].total) | currency('$')");
JSONQuery.evaluate(state, "`Revenue: {SUM($.orders[?(@.status == 'completed')].total) | currency('$')}`");
JSONQuery.evaluate(state, "`Avg rating: {AVG($.reviews[*].rating)}`");
```
