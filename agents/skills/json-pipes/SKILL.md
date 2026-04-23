# Skill: json-pipes

Built-in and custom pipe transforms for formatting query results.

## When to Use

- Formatting values for display (uppercase, currency, dates)
- Transforming arrays (limit, join)
- Providing default values for empty/null results
- Serializing data to JSON strings
- Adding custom transforms at application startup

## Built-in Pipes

| Pipe | Signature | Example |
|------|-----------|---------|
| `uppercase` | `(value) → string` | `$.name \| uppercase` |
| `lowercase` | `(value) → string` | `$.email \| lowercase` |
| `currency` | `(value, symbol?, locale?) → string` | `$.price \| currency('€', 'de-DE')` |
| `date` | `(value, locale?) → string` | `$.createdAt \| date('en-GB')` |
| `json` | `(value, spaces?) → string` | `$.config \| json(4)` |
| `default` | `(value, fallback) → any` | `$.nickname \| default('Anonymous')` |
| `limit` | `(value, max) → array` | `$.items \| limit(5)` |
| `join` | `(value, separator?) → string` | `$.tags \| join(', ')` |

## Pipe Syntax

```
expression | pipeName
expression | pipeName(arg1, arg2)
expression | pipe1 | pipe2        ← chaining
```

Arguments can be strings (`'text'`), numbers (`42`), or booleans (`true`).

## Registering Custom Pipes

```typescript
import { JSONQuery } from "@ecosy/json";

// Simple transform
JSONQuery.registerPipe("trim", (v) => String(v).trim());

// With arguments
JSONQuery.registerPipe("truncate", (v, maxLen = 50, suffix = "...") =>
  String(v).length > Number(maxLen)
    ? String(v).slice(0, Number(maxLen)) + String(suffix)
    : String(v),
);

// Array transform
JSONQuery.registerPipe("sort", (v) =>
  Array.isArray(v) ? [...v].sort() : v,
);

// Usage in expressions
JSONQuery.evaluate(data, "$.description | truncate(100, '…')");
JSONQuery.evaluate(data, "$.tags | sort | join(', ')");
```

## Key Rules

1. **Pipes are JSONQuery only** — `JSONPath.query()` does not understand `|` syntax.
2. **Use `registerPipe()` not direct mutation** — don't write to `PIPES` object directly.
3. **Pipes receive the resolved value** — the first argument is always the current value, subsequent args come from the expression.
4. **Chain pipes left to right** — `$.x | a | b` applies `a` first, then `b` to the result.
5. **Prefer `??` over `| default` for structural fallback** — `??` tries the next expression; `| default` only catches null/undefined/empty after resolution.

## Examples

### Display formatting
```typescript
JSONQuery.evaluate(data, "$.user.name | uppercase");
JSONQuery.evaluate(data, "$.price | currency('$', 'en-US')");
JSONQuery.evaluate(data, "$.publishedAt | date('vi-VN')");
```

### Array transforms
```typescript
JSONQuery.evaluate(data, "$.categories | limit(3) | join(' > ')");
JSONQuery.evaluate(data, "$.scores | sort | json");
```

### Chaining
```typescript
JSONQuery.evaluate(data, "$.bio | default('No bio') | truncate(200)");
```

### In string interpolation
```typescript
JSONQuery.evaluate(data, "`Price: {$.amount | currency('€')}`");
```
