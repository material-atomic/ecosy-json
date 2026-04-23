# @ecosy/json — Architecture Guide

## Overview

`@ecosy/json` is a zero-dependency TypeScript JSONPath and JSONQuery engine. It provides a full JSONPath implementation with generator-based evaluation, plus an extended JSONQuery layer with pipes, aggregations, fallbacks, and string interpolation.

## Core Concepts

### 1. JSONPath — Compiled Expression Evaluator

`JSONPath` is the foundation. It compiles a JSONPath expression string into an AST once, then evaluates it against any JSON document.

```typescript
import { JSONPath } from "@ecosy/json";

const data = {
  store: {
    book: [
      { title: "Moby Dick", price: 8.99 },
      { title: "The Great Gatsby", price: 12.50 },
    ],
  },
};

// Compile once, reuse
const path = new JSONPath("$.store.book[*].title");
path.query(data);    // ["Moby Dick", "The Great Gatsby"]
path.count(data);    // 2
path.first(data);    // "Moby Dick"
path.exists(data);   // true

// One-shot static helpers
JSONPath.query(data, "$.store.book[?(@.price < 10)].title");
// ["Moby Dick"]
```

### 2. Tokenizer + Parser — Compilation Pipeline

The expression string goes through two stages: tokenization (string → Token[]) and parsing (Token[] → PathNode[] AST). These are exposed as low-level APIs for custom tooling.

```typescript
import { tokenize, parse, parseExpression, evaluate } from "@ecosy/json";

// Two-step
const tokens = tokenize("$.store.book[*]");
const ast = parse(tokens);
const matches = evaluate(ast, data);

// One-step convenience
const ast2 = parseExpression("$.store.book[?(@.price < 10)]");
```

### 3. Evaluator — Generator-Based Traversal

The evaluator uses ES6 generators (`yield*`) to chain node evaluation without allocating intermediate arrays. Each AST node becomes a generator stage that fans out results lazily.

Supported node types: root (`$`), property (`.key`), index (`[n]`), wildcard (`[*]`), recursive descent (`..`), slice (`[start:end:step]`), union (`[a,b]`), filter (`[?(expr)]`).

### 4. JSONQuery — Multi-Layer Pipeline

`JSONQuery` extends `JSONPath` with 5 evaluation layers:

1. **String interpolation** — `` `{$.user.name} bought {COUNT($.items[*])} items` ``
2. **Fallback (`??`)** — `$.primary ?? $.secondary ?? 'default'`
3. **Pipes (`|`)** — `$.price | currency('$', 'en-US')`
4. **Aggregation functions** — `SUM($.items[*].price)`
5. **JSONPath core** — with auto-root shorthand (`user.name` → `$.user.name`)

```typescript
import { JSONQuery } from "@ecosy/json";

JSONQuery.evaluate(data, "SUM($.store.book[*].price) | currency('$')");
JSONQuery.evaluate(data, "$.store.discount ?? 'No discount'");
JSONQuery.evaluate(data, "`Total: {SUM($.store.book[*].price)}`");
```

### 5. PIPES and AGGREGATIONS — Extension Registries

Built-in pipes: `uppercase`, `lowercase`, `currency`, `date`, `json`, `default`, `limit`, `join`.
Built-in aggregations: `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`.

Extend at runtime:

```typescript
JSONQuery.registerPipe("slug", (v) =>
  String(v).toLowerCase().replace(/\s+/g, "-"),
);

JSONQuery.registerAggregation("MEDIAN", (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
});
```

## Skill Reading Order

When working with @ecosy/json, read skills in this order:

1. `json-path` — Compiled expression evaluator (compile once, query many)
2. `json-filter` — Filter expressions with comparisons, logic operators, wildcards
3. `json-tokenizer-parser` — Low-level tokenizer, parser, and AST inspection
4. `json-query` — Multi-layer pipeline (interpolation, fallback, pipes, aggregations)
5. `json-pipes` — Built-in and custom pipe transforms
6. `json-aggregations` — Built-in and custom aggregation functions
7. `ecosy-json` — Complete reference covering all features end-to-end

## JSONPath Syntax Quick Reference

| Syntax | Meaning |
|--------|---------|
| `$` | Root |
| `.key` / `['key']` | Property |
| `[n]` / `[-n]` | Index (negative = from end) |
| `[*]` / `.*` | Wildcard |
| `..key` | Recursive descent |
| `[start:end:step]` | Slice |
| `[a,b,c]` | Union |
| `[?(expr)]` | Filter (`@` = current, `$` = root) |
| `==`, `!=`, `<`, `<=`, `>`, `>=` | Comparison operators |
| `&&`, `\|\|` | Logical operators |
