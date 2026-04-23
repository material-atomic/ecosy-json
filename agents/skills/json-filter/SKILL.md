# Skill: json-filter

JSONPath filter expressions — conditional queries with comparison and logical operators.

## When to Use

- Filtering arrays by element properties (`[?(@.price < 10)]`)
- Combining conditions with `&&` and `||`
- Using wildcards or recursive descent inside filters
- Querying nested structures conditionally

## Syntax

### Basic Comparisons

```
$[?(@.price < 10)]              → Elements where price < 10
$[?(@.status == 'active')]      → Elements where status is "active"
$[?(@.count != 0)]              → Elements where count is not 0
$[?(@.rating >= 4.5)]           → Elements where rating >= 4.5
```

**Operators:** `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, `>=`

### Logical Combinators

```
$[?(@.age >= 18 && @.verified == true)]    → AND
$[?(@.role == 'admin' || @.role == 'mod')]  → OR
```

### `@` vs `$` in Filters

- `@` — current array element being tested
- `$` — root document (for cross-referencing)

```typescript
// ✅ Correct: @.price refers to each book's price
"$.store.book[?(@.price < 10)]"

// ❌ Wrong: $.price refers to root.price (not each book)
"$.store.book[?($.price < 10)]"
```

### Wildcards in Filters

Filters support wildcards and recursive descent in path expressions:

```typescript
// Any tag equals "sale"
"$.products[?(@.tags[*] == 'sale')]"

// Any nested category is "electronics"
"$.items[?(@..category == 'electronics')]"
```

This works because filter evaluation uses **cross-product semantics**: if any value from a wildcard path matches, the filter passes.

## Key Rules

1. **Always use `@` for the current element** — `$` inside a filter references the root.
2. **Filter in the expression, not in JS** — `[?(@.x > 5)]` is faster and simpler than `.query().filter()`.
3. **Wildcards work inside filters** — `@.tags[*] == 'featured'` checks all tags.
4. **`==` is loose, `===` is strict** — use `===` when type matters.
5. **Short-circuit** — `&&` stops on first `false`, `||` stops on first `true`.

## Examples

### Filter by property
```typescript
import { JSONPath } from "@ecosy/json";

const data = {
  products: [
    { name: "Widget", price: 5.99, inStock: true },
    { name: "Gadget", price: 29.99, inStock: false },
    { name: "Doohickey", price: 8.50, inStock: true },
  ],
};

// Cheap and in stock
const affordable = JSONPath.query(
  data,
  "$.products[?(@.price < 10 && @.inStock == true)]",
);
// [{ name: "Widget", ... }, { name: "Doohickey", ... }]
```

### Filter with nested wildcard
```typescript
const data = {
  users: [
    { name: "Alice", roles: ["admin", "user"] },
    { name: "Bob", roles: ["user"] },
    { name: "Charlie", roles: ["admin", "moderator"] },
  ],
};

// Users who have "admin" role
const admins = JSONPath.query(
  data,
  "$.users[?(@.roles[*] == 'admin')].name",
);
// ["Alice", "Charlie"]
```

### Filter referencing root
```typescript
const data = {
  threshold: 10,
  items: [
    { name: "A", score: 15 },
    { name: "B", score: 5 },
  ],
};

// Items where score exceeds root threshold
// Note: this requires $ inside filter to reference root.threshold
JSONPath.query(data, "$.items[?(@.score > $.threshold)]");
```
