# @ecosy/json — Rules

These rules are absolute constraints when generating code with `@ecosy/json`. Violations produce incorrect, inefficient, or runtime-broken output.

## JSONPath Rules

### DO: Compile reusable expressions
```typescript
// ✅ Correct — compile once, query many
const pricePath = new JSONPath("$.store.book[*].price");
for (const doc of documents) {
  const prices = pricePath.query(doc);
}
```

### DON'T: Re-compile inside loops
```typescript
// ❌ Wrong — re-parses and re-compiles on every iteration
for (const doc of documents) {
  const prices = JSONPath.query(doc, "$.store.book[*].price");
}
```

### DO: Use built-in methods for common patterns
```typescript
// ✅ Correct — purpose-built methods
path.exists(data);  // boolean
path.count(data);   // number
path.first(data);   // T | undefined
path.paths(data);   // string[]
```

### DON'T: Re-implement what JSONPath already provides
```typescript
// ❌ Wrong — manual checks on query results
const results = path.query(data);
const exists = results.length > 0;       // Use path.exists(data)
const count = results.length;            // Use path.count(data)
const first = results[0];               // Use path.first(data)
```

### DO: Use recursive descent for deep searches
```typescript
// ✅ Correct — finds all "title" fields at any depth
JSONPath.query(data, "$..title");
```

### DON'T: Hand-roll recursive traversal
```typescript
// ❌ Wrong — bypasses generator-based evaluation, no path tracking
function findAllTitles(obj: any): string[] {
  const results: string[] = [];
  if (obj.title) results.push(obj.title);
  for (const v of Object.values(obj)) {
    if (typeof v === "object") results.push(...findAllTitles(v));
  }
  return results;
}
```

## Filter Rules

### DO: Use filter expressions for conditional queries
```typescript
// ✅ Correct — filter in the expression
JSONPath.query(data, "$.store.book[?(@.price < 10)]");
JSONPath.query(data, "$.items[?(@.status == 'active' && @.count > 0)]");
```

### DON'T: Filter manually after querying
```typescript
// ❌ Wrong — fetches ALL then filters in JS
const all = JSONPath.query(data, "$.store.book[*]");
const cheap = all.filter((b: any) => b.price < 10);
```

### DO: Use `@` for current element in filters
```typescript
// ✅ Correct — @ refers to the current array element
"$[?(@.age >= 18)]"
"$[?(@.tags[*] == 'featured')]"  // wildcard in filter
```

### DON'T: Use `$` when you mean `@` inside filters
```typescript
// ❌ Wrong — $ refers to root, not the current element
"$[?($.age >= 18)]"  // This checks root.age, not each item's age
```

## JSONQuery Rules

### DO: Use JSONQuery.evaluate for expressions with pipes/aggregations
```typescript
// ✅ Correct — multi-layer pipeline
JSONQuery.evaluate(data, "SUM($.items[*].price) | currency('$')");
JSONQuery.evaluate(data, "$.name ?? 'Anonymous' | uppercase");
```

### DON'T: Parse JSONQuery syntax with JSONPath
```typescript
// ❌ Wrong — JSONPath doesn't understand pipes or aggregations
JSONPath.query(data, "$.name | uppercase");       // Parse error
JSONPath.query(data, "SUM($.items[*].price)");    // Parse error
```

### DO: Register custom pipes/aggregations at startup
```typescript
// ✅ Correct — register once at app init
JSONQuery.registerPipe("slug", (v) =>
  String(v).toLowerCase().replace(/\s+/g, "-"),
);
JSONQuery.registerAggregation("FIRST", (arr) => arr[0]);
```

### DON'T: Mutate PIPES/AGGREGATIONS directly in production
```typescript
// ❌ Wrong — no validation, no type safety
import { PIPES } from "@ecosy/json";
PIPES["myPipe"] = (v) => v; // Use registerPipe() instead
```

### DO: Use backtick interpolation for complex templates
```typescript
// ✅ Correct — readable template with embedded queries
JSONQuery.evaluate(data, "`{$.user.name} ordered {COUNT($.items[*])} items for {SUM($.items[*].price) | currency('$')}`");
```

### DON'T: Concatenate multiple evaluate calls
```typescript
// ❌ Wrong — inefficient, loses pipeline benefits
const name = JSONQuery.evaluate(data, "$.user.name");
const count = JSONQuery.evaluate(data, "COUNT($.items[*])");
const msg = `${name} ordered ${count} items`; // Use interpolation!
```

## Auto-Root Shorthand Rules

### DO: Use shorthand for simple paths in JSONQuery
```typescript
// ✅ Correct — auto-prefixed to $.user.name
JSONQuery.evaluate(data, "user.name | uppercase");
```

### DON'T: Use shorthand in JSONPath (not supported)
```typescript
// ❌ Wrong — JSONPath requires explicit $
JSONPath.query(data, "user.name");  // Fails! Must be $.user.name
```

## General Rules

1. **Never import from internal paths** — only import from `@ecosy/json` (the package root) or documented subpath exports.
2. **Never modify AST nodes** — the AST returned by `toAST()` and `parse()` is for inspection only. Create a new expression string if you need different behavior.
3. **Always handle `undefined` returns** — `first()`, `last()`, and `JSONQuery.evaluate()` return `undefined` when no match is found.
4. **Use `matches()` when you need paths** — `query()` returns values only; `matches()` returns `{ value, path }` pairs for tracing and debugging.
5. **Prefer `??` over `| default`** — `$.primary ?? 'fallback'` is evaluated at the pipeline level (tries next segment); `| default('fallback')` only catches null/undefined/empty after resolution.
