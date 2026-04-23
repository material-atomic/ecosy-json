# @ecosy/json

A type-safe, zero-dependency JSONPath and JSONQuery engine with generator-based evaluation, multi-layer query pipelines, and extensible transforms — built for reactive data systems.

## AI Agent Learning

If you are an AI Coding Assistant, Agent, or Copilot analyzing or generating code for a repository that lists `@ecosy/json` as a dependency:

1. **Read `package.json` → `"agents"` first.** This package self-documents its architecture via `agents.prompts`, `agents.rules`, `agents.skills`, and `agents.workflows`. Interpret `$this://` as the package root directory. Start with `agents.workflows` — it defines the reading order.
2. **Use `JSONPath` for data extraction, `JSONQuery` for display logic.** `JSONPath` gives you typed arrays of matched values. `JSONQuery` adds pipes, aggregations, fallbacks, and string interpolation on top — ideal for template bindings.
3. **Never hand-roll recursive traversal.** The evaluator uses generators (`yield*`) to pipeline node evaluation with zero intermediate allocation. Use `$..*` (recursive descent) and `[?(@.field == value)]` (filters) instead.
4. **Extend via registries, not subclasses.** Add custom transforms with `JSONQuery.registerPipe()` and `JSONQuery.registerAggregation()` at startup. The `PIPES` and `AGGREGATIONS` objects are the extension points.
5. **Compile once, query many.** `new JSONPath(expr)` compiles the expression to an AST once. Reuse the instance across multiple `query(data)` calls instead of calling `JSONPath.query(data, expr)` repeatedly.

---

## Features

- **Full JSONPath** — `$`, `.key`, `[0]`, `[-1]`, `.*`, `..key`, `[0:5:2]`, `[a,b]`, `[?(@.price < 10)]`
- **Generator-based evaluation** — `yield*` pipeline with zero intermediate arrays
- **JSONQuery pipeline** — String interpolation → Fallback (`??`) → Pipes (`|`) → Aggregations → JSONPath core
- **Built-in transforms** — 8 pipes (`uppercase`, `lowercase`, `currency`, `date`, `json`, `default`, `limit`, `join`) + 5 aggregations (`SUM`, `COUNT`, `AVG`, `MIN`, `MAX`)
- **Runtime extensibility** — Register custom pipes and aggregations at startup
- **Auto-root shorthand** — `user.name` resolves as `$.user.name` in JSONQuery
- **Cross-product filter semantics** — Wildcard paths in filters correctly match across all values
- **Zero dependencies** — Standalone package, no peer or runtime deps

## Installation

```bash
yarn add @ecosy/json
```

## Quick Start

```typescript
import { JSONPath, JSONQuery } from "@ecosy/json";

const data = {
  store: {
    book: [
      { title: "Sayings of the Century", price: 8.95 },
      { title: "Sword of Honour", price: 12.99 },
      { title: "Moby Dick", price: 8.99 },
    ],
  },
};

// 1. Basic JSONPath query
const titles = JSONPath.query(data, "$.store.book[*].title");
// ["Sayings of the Century", "Sword of Honour", "Moby Dick"]

// 2. Filter
const cheap = JSONPath.query(data, "$.store.book[?(@.price < 10)].title");
// ["Sayings of the Century", "Moby Dick"]

// 3. Compile once, reuse
const path = new JSONPath("$.store.book[*].price");
path.exists(data);  // true
path.count(data);   // 3
path.first(data);   // 8.95

// 4. JSONQuery — pipes, aggregations, fallbacks
JSONQuery.evaluate(data, "SUM($.store.book[*].price)");
// 30.93

JSONQuery.evaluate(data, "$.store.book[0].title | uppercase");
// "SAYINGS OF THE CENTURY"

JSONQuery.evaluate(data, "`Total: {SUM($.store.book[*].price)} for {COUNT($.store.book[*])} books`");
// "Total: 30.93 for 3 books"

JSONQuery.evaluate(data, "$.store.discount ?? 'N/A'");
// "N/A"
```

## Core API

### `JSONPath`

Compiled JSONPath expression evaluator.

| Method | Description |
|--------|-------------|
| `query<T>(data)` | Query a document, return matched values |
| `matches(data)` | Query with value + path metadata |
| `first<T>(data)` | First matched value |
| `last<T>(data)` | Last matched value |
| `exists(data)` | Check if any match exists |
| `count(data)` | Count matches |
| `paths(data)` | Return all normalized paths |
| `map(data, fn)` | Map over matches |
| `forEach(data, fn)` | Iterate over matches |
| `toAST()` | Get the compiled AST |

**Static shortcuts:**

```typescript
JSONPath.query(data, "$.store.book[*].title");    // one-shot query
JSONPath.first(data, "$.store.book[0].title");     // one-shot first
JSONPath.exists(data, "$.store.book[?(@.price)]"); // one-shot exists
```

### `JSONQuery`

Extended query engine with multi-layer evaluation pipeline.

```typescript
// Static (one-shot)
JSONQuery.evaluate(data, "SUM($.items[*].price) | currency('$')");

// Instance (bound data)
const q = new JSONQuery("$.user.name");
q.set(data);
q.eval("$.user.name | uppercase");
```

**5-Layer Pipeline:**

1. **String interpolation** — `` `Hello {$.user.name}` ``
2. **Fallback (`??`)** — `$.primary ?? $.fallback ?? 'default'`
3. **Pipes (`|`)** — `$.name | uppercase`
4. **Aggregation functions** — `SUM($.items[*].price)`
5. **Auto-root shorthand** — `user.name` → `$.user.name`

### `PIPES` / `AGGREGATIONS`

Built-in registries — extend at runtime:

```typescript
import { JSONQuery, PIPES, AGGREGATIONS } from "@ecosy/json";

// Built-in pipes: uppercase, lowercase, currency, date, json, default, limit, join
// Built-in aggregations: SUM, COUNT, AVG, MIN, MAX

// Register custom pipe
JSONQuery.registerPipe("truncate", (v, len = 50) =>
  String(v).slice(0, Number(len)),
);

// Register custom aggregation
JSONQuery.registerAggregation("MEDIAN", (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
});
```

### Low-level API

```typescript
import { tokenize, parse, parseExpression, evaluate } from "@ecosy/json";

// Step by step
const tokens = tokenize("$.store.book[*].title");
const ast = parse(tokens);
const matches = evaluate(ast, data); // [{ value, path }, ...]

// Or in one step
const ast2 = parseExpression("$.store.book[?(@.price < 10)]");
```

## JSONPath Syntax Reference

| Syntax | Description | Example |
|--------|-------------|---------|
| `$` | Root object | `$` |
| `.key` | Property access | `$.store.name` |
| `['key']` | Bracket property | `$['store']['name']` |
| `[n]` | Array index | `$.items[0]` |
| `[-n]` | Negative index (from end) | `$.items[-1]` |
| `[*]` / `.*` | Wildcard (all children) | `$.items[*].name` |
| `..key` | Recursive descent | `$..title` |
| `[start:end]` | Array slice | `$.items[0:3]` |
| `[start:end:step]` | Slice with step | `$.items[::2]` |
| `[a,b,c]` | Union (multiple keys/indices) | `$['name','age']` |
| `[?(expr)]` | Filter expression | `$[?(@.price < 10)]` |

**Filter operators:** `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, `>=`, `&&`, `||`

## Architecture

```
JSONQuery (extends JSONPath)
  │
  ├─ Layer 1: String interpolation    ← `{...}` blocks in backtick strings
  ├─ Layer 2: Fallback (??)           ← Null-coalescing chain
  ├─ Layer 3: Pipes (|)               ← Transform pipeline
  ├─ Layer 4: Aggregations            ← SUM(), COUNT(), AVG(), MIN(), MAX()
  └─ Layer 5: JSONPath core           ← Auto-root + standard JSONPath
      │
      ├─ tokenize(expr)               ← Lexer → Token[]
      ├─ parse(tokens)                ← Parser → PathNode[] (AST)
      └─ evaluate(ast, data)          ← Generator-based evaluator
          │
          ├─ evaluateNodes()          ← Pipeline generator (zero-alloc)
          ├─ chainNodes()             ← Fan-out generator
          ├─ applyNode()             ← Per-node dispatch (8 node types)
          ├─ descendAndApply()        ← Recursive descent generator
          └─ evaluateFilter()         ← Filter expression evaluator
              ├─ evaluateComparison() ← Cross-product semantics
              └─ evaluateLogical()    ← Short-circuit &&/||
```

## License

MIT
