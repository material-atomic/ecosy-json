# Skill: json-path

Core JSONPath compiled expression evaluator — compile once, query many.

## When to Use

- Extracting values from nested JSON documents
- Checking existence of paths in data
- Counting, mapping, or iterating over matched elements
- Reusing the same query against multiple documents (compiled instances)

## API

### Constructor

```typescript
import { JSONPath } from "@ecosy/json";

// Compiles expression to AST once — reuse for multiple documents
const path = new JSONPath("$.store.book[*].title");
```

### Instance Methods

```typescript
// Core queries
path.query<T>(data)       // T[] — all matched values
path.matches(data)        // { value, path }[] — values with normalized paths
path.first<T>(data)       // T | undefined — first match
path.last<T>(data)        // T | undefined — last match

// Checks
path.exists(data)         // boolean — any match exists?
path.count(data)          // number — how many matches?

// Paths
path.paths(data)          // string[] — all normalized path strings

// Iteration
path.map(data, (value, path, index) => transformed)
path.forEach(data, (value, path, index) => { /* side effect */ })

// Introspection
path.toAST()              // ReadonlyArray<PathNode> — compiled AST
path.toString()           // string — original expression
```

### Static Shortcuts

```typescript
// One-shot queries (re-compiles each call — use for single queries only)
JSONPath.query<T>(data, expr)       // T[]
JSONPath.first<T>(data, expr)       // T | undefined
JSONPath.exists(data, expr)         // boolean
JSONPath.tokenize(expr)             // Token[]
JSONPath.parse(expr)                // PathNode[]
```

## Key Rules

1. **Compile once for repeated use** — `new JSONPath(expr)` is O(n) parsing. Don't call static methods inside loops.
2. **Use `exists()` not `query().length > 0`** — purpose-built, more readable.
3. **Use `first()` not `query()[0]`** — returns `undefined` cleanly, no indexing risk.
4. **Use `matches()` when you need paths** — `query()` gives values only; `matches()` gives `{ value, path }`.
5. **All expressions start with `$`** — `$` is required as root reference. Auto-root shorthand is JSONQuery only.

## Examples

### Compile and reuse
```typescript
const pricePath = new JSONPath("$.store.book[*].price");

for (const document of documents) {
  const prices = pricePath.query<number>(document);
  const total = prices.reduce((a, b) => a + b, 0);
}
```

### Rich query methods
```typescript
const path = new JSONPath("$.users[?(@.active == true)]");

if (path.exists(data)) {
  console.log(`Found ${path.count(data)} active users`);
  const firstUser = path.first(data);
  const allPaths = path.paths(data);
  // ["$['users'][0]", "$['users'][2]", ...]
}
```

### Map over results
```typescript
const path = new JSONPath("$.products[*]");

const summaries = path.map(data, (product: any, path, index) => ({
  index,
  name: product.name,
  path, // normalized JSONPath string
}));
```
