# Skill: json-query

Multi-layer JSONQuery pipeline — pipes, aggregations, fallbacks, string interpolation, and auto-root.

## When to Use

- Display logic: formatting values for UI (currency, dates, uppercase)
- Template bindings with computed expressions
- Aggregating data (sum, count, average)
- Providing fallback values for missing data
- Building string templates with embedded queries

## 5-Layer Evaluation Pipeline

JSONQuery evaluates expressions through these layers in order:

1. **String interpolation** — `` `Hello {$.user.name}` `` — backtick strings with `{expr}` blocks
2. **Fallback (`??`)** — `$.primary ?? $.fallback ?? 'default'` — null-coalescing chain
3. **Pipes (`|`)** — `$.name | uppercase` — transform pipeline
4. **Aggregation functions** — `SUM($.items[*].price)` — array reduction
5. **JSONPath core** — `$.store.book[*]` with auto-root shorthand (`user.name` → `$.user.name`)

## API

### Static (one-shot)

```typescript
import { JSONQuery } from "@ecosy/json";

JSONQuery.evaluate(data, "$.user.name | uppercase");
JSONQuery.evaluate(data, "SUM($.items[*].price) | currency('$')");
JSONQuery.evaluate(data, "$.nickname ?? $.name ?? 'Anonymous'");
JSONQuery.evaluate(data, "`{$.user.name} has {COUNT($.items[*])} items`");
```

### Instance (bound data)

```typescript
const q = new JSONQuery();
q.set(data);

q.eval("$.user.name | uppercase");
q.eval("SUM($.cart[*].price)");
q.get(); // returns bound data
```

## Key Rules

1. **Use JSONQuery (not JSONPath) for pipes and aggregations** — JSONPath doesn't understand `|` or `SUM()`.
2. **Fallback `??` is pipeline-level** — it tries the next segment if the current one resolves to null/undefined.
3. **`| default(val)` is pipe-level** — it only catches null/undefined/empty after resolution. Prefer `??` for structural fallback.
4. **Auto-root only works in JSONQuery** — `user.name` becomes `$.user.name` automatically. JSONPath requires explicit `$`.
5. **Escape `{` in interpolation** — use `\{` to output a literal brace in backtick strings.

## Examples

### Dashboard computed values
```typescript
JSONQuery.evaluate(state, "SUM($.orders[?(@.status == 'completed')].total)");
JSONQuery.evaluate(state, "COUNT($.users[?(@.active == true)])");
JSONQuery.evaluate(state, "AVG($.reviews[*].rating)");
```

### Formatted display
```typescript
JSONQuery.evaluate(data, "$.price | currency('€', 'de-DE')");
JSONQuery.evaluate(data, "$.createdAt | date('en-GB')");
JSONQuery.evaluate(data, "$.tags | join(', ')");
JSONQuery.evaluate(data, "$.items | limit(5) | json");
```

### Fallback chains
```typescript
JSONQuery.evaluate(data, "$.user.avatar ?? $.user.gravatar ?? 'default.png'");
JSONQuery.evaluate(config, "$.theme.primary ?? '#333333'");
```

### String interpolation
```typescript
JSONQuery.evaluate(data, "`Welcome {$.user.name}!`");
JSONQuery.evaluate(data, "`{COUNT($.cart[*])} items, total: {SUM($.cart[*].price) | currency('$')}`");
// Escape braces: "`Price: \\{not interpolated\\}`"
```

### Reactive binding
```typescript
const query = new JSONQuery();

store.subscribe((state) => query.set(state));

// Evaluate against latest state
const display = query.eval("$.cart.total | currency('$')");
```
