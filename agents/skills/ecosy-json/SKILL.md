# Skill: ecosy-json

Complete guide for `@ecosy/json` — a zero-dependency JSONPath and JSONQuery engine.

## When to Use

- Extracting values from nested JSON documents
- Building reactive template bindings with computed expressions
- Filtering, slicing, and searching arrays within JSON
- Aggregating numeric data (sum, count, average)
- Formatting values with transform pipes
- Building query expressions with fallback chains

## API Overview

### JSONPath — Data Extraction

```typescript
import { JSONPath } from "@ecosy/json";

// Compile once (recommended for repeated use)
const path = new JSONPath("$.store.book[*].title");
const titles = path.query(data);          // string[]
const first = path.first(data);           // string | undefined
const exists = path.exists(data);         // boolean
const count = path.count(data);           // number
const paths = path.paths(data);           // string[] (normalized paths)
const matches = path.matches(data);       // { value, path }[]

// Map / iterate
path.map(data, (value, path, index) => transform(value));
path.forEach(data, (value, path, index) => process(value));

// Static one-shot (re-compiles each call)
JSONPath.query(data, "$.users[?(@.active == true)].email");
JSONPath.first(data, "$.config.timeout");
JSONPath.exists(data, "$.features.darkMode");
```

### JSONQuery — Display & Templates

```typescript
import { JSONQuery } from "@ecosy/json";

// Aggregations
JSONQuery.evaluate(data, "SUM($.items[*].price)");     // number
JSONQuery.evaluate(data, "COUNT($.users[*])");          // number
JSONQuery.evaluate(data, "AVG($.scores[*])");           // number

// Pipes
JSONQuery.evaluate(data, "$.user.name | uppercase");
JSONQuery.evaluate(data, "$.price | currency('€', 'de-DE')");
JSONQuery.evaluate(data, "$.tags | join(', ')");
JSONQuery.evaluate(data, "$.items | limit(5)");

// Fallback
JSONQuery.evaluate(data, "$.nickname ?? $.name ?? 'Anonymous'");

// String interpolation
JSONQuery.evaluate(data, "`Hello {$.user.name}, you have {COUNT($.items[*])} items`");

// Auto-root (shorthand without $.)
JSONQuery.evaluate(data, "user.name | uppercase");  // → $.user.name | uppercase

// Instance-based (bind data once)
const q = new JSONQuery();
q.set(data);
q.eval("SUM($.cart[*].price)");
q.eval("$.user.name | uppercase");
```

### Extending at Runtime

```typescript
import { JSONQuery } from "@ecosy/json";

// Custom pipe
JSONQuery.registerPipe("truncate", (v, maxLen = 50) =>
  String(v).length > Number(maxLen)
    ? String(v).slice(0, Number(maxLen)) + "..."
    : String(v),
);
// Usage: $.description | truncate(100)

// Custom aggregation
JSONQuery.registerAggregation("DISTINCT", (arr) =>
  [...new Set(arr)],
);
// Usage: DISTINCT($.items[*].category)
```

### Low-Level API

```typescript
import { tokenize, parse, parseExpression, evaluate } from "@ecosy/json";

// Step-by-step compilation
const tokens = tokenize("$.store.book[?(@.price < 10)]");
const ast = parse(tokens);
const results = evaluate(ast, data);
// results: [{ value: {...}, path: "$['store']['book'][0]" }, ...]

// Convenience (tokenize + parse in one step)
const ast2 = parseExpression("$.items[0:3]");
```

## JSONPath Syntax

### Basic Access
```
$                          → Root document
$.store                    → Property access
$['store']                 → Bracket notation
$.items[0]                 → First element
$.items[-1]                → Last element
$.items[*]                 → All elements (wildcard)
$.store.*                  → All properties of store
```

### Recursive & Slice
```
$..title                   → All "title" fields at any depth
$.items[0:3]               → First 3 items (index 0, 1, 2)
$.items[1:5:2]             → Items at index 1, 3
$.items[::-1]              → All items reversed
```

### Union & Filter
```
$['name','age']            → Multiple properties
$[0,2,4]                   → Multiple indices
$[?(@.price < 10)]         → Filter: price under 10
$[?(@.active == true)]     → Filter: active items
$[?(@.tags[*] == 'sale')]  → Filter: has 'sale' tag (wildcard in filter)
$[?(@.age >= 18 && @.verified == true)]  → Logical AND
$[?(@.role == 'admin' || @.role == 'mod')]  → Logical OR
```

## Built-in Pipes

| Pipe | Args | Description |
|------|------|-------------|
| `uppercase` | — | Convert to UPPER CASE |
| `lowercase` | — | Convert to lower case |
| `currency` | `symbol?, locale?` | Format number as currency (default: `$`, `en-US`) |
| `date` | `locale?` | Format ISO date string (default: `en-US`) |
| `json` | `spaces?` | Serialize to JSON string (default: 2 spaces) |
| `default` | `fallback` | Return fallback if value is null/undefined/empty |
| `limit` | `max` | Truncate array to N items |
| `join` | `separator?` | Join array elements (default: `,`) |

## Built-in Aggregations

| Function | Description |
|----------|-------------|
| `SUM(expr)` | Sum of all numeric values |
| `COUNT(expr)` | Number of matched elements |
| `AVG(expr)` | Arithmetic mean |
| `MIN(expr)` | Minimum value |
| `MAX(expr)` | Maximum value |

## Common Patterns

### Dashboard computed values
```typescript
// Revenue summary
JSONQuery.evaluate(state, "SUM($.orders[?(@.status == 'completed')].total)");

// User count with formatting
JSONQuery.evaluate(state, "`{COUNT($.users[*])} active users`");

// Fallback for missing config
JSONQuery.evaluate(config, "$.theme.primaryColor ?? $.defaults.color ?? '#333'");
```

### Reactive data binding
```typescript
const query = new JSONQuery();

// Update data when state changes
store.subscribe((state) => {
  query.set(state);
});

// Evaluate expressions against latest state
const display = query.eval("$.cart.total | currency('$')");
```

### Table column transforms
```typescript
const columns = [
  { field: "$.user.name | uppercase", label: "Name" },
  { field: "$.createdAt | date('en-GB')", label: "Created" },
  { field: "$.amount | currency('€', 'de-DE')", label: "Amount" },
];

const rows = data.map((row) =>
  columns.map((col) => JSONQuery.evaluate(row, col.field)),
);
```

## Anti-Patterns

### ❌ Re-compiling in loops
```typescript
// Wrong — recompiles on every iteration
items.forEach((item) => {
  JSONPath.query(item, "$.nested.value");
});

// ✅ Correct
const path = new JSONPath("$.nested.value");
items.forEach((item) => path.query(item));
```

### ❌ Manual filtering after wildcard
```typescript
// Wrong — fetches everything then filters in JS
const all = JSONPath.query(data, "$.items[*]");
const active = all.filter((i: any) => i.active);

// ✅ Correct — filter in the expression
JSONPath.query(data, "$.items[?(@.active == true)]");
```

### ❌ Using JSONPath for pipe expressions
```typescript
// Wrong — JSONPath doesn't understand pipes
JSONPath.query(data, "$.name | uppercase"); // Error!

// ✅ Correct — use JSONQuery for pipes
JSONQuery.evaluate(data, "$.name | uppercase");
```

### ❌ Using $ instead of @ in filters
```typescript
// Wrong — $ is root, not current element
"$[?($.price < 10)]"   // checks root.price for every element

// ✅ Correct — @ is the current element
"$[?(@.price < 10)]"
```
