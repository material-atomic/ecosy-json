# Skill: json-tokenizer-parser

Low-level tokenizer and parser APIs for custom tooling, debugging, and AST inspection.

## When to Use

- Building custom expression analysis tools
- Debugging why a JSONPath expression produces unexpected results
- Inspecting the AST structure of compiled expressions
- Creating expression validators or linters
- Implementing custom evaluation strategies on top of the AST

## Tokenizer API

```typescript
import { tokenize, TokenType } from "@ecosy/json";
import type { Token } from "@ecosy/json";

const tokens: Token[] = tokenize("$.store.book[?(@.price < 10)]");
// [
//   { type: TokenType.Root, value: "$" },
//   { type: TokenType.Dot, value: "." },
//   { type: TokenType.Identifier, value: "store" },
//   { type: TokenType.Dot, value: "." },
//   { type: TokenType.Identifier, value: "book" },
//   { type: TokenType.BracketOpen, value: "[" },
//   { type: TokenType.Question, value: "?" },
//   ...
// ]
```

### Token Types

`Root`, `Dot`, `DotDot`, `Wildcard`, `BracketOpen`, `BracketClose`, `Number`, `String`, `Colon`, `Comma`, `Question`, `ParenOpen`, `ParenClose`, `At`, `Operator`, `Identifier`

## Parser API

```typescript
import { parse, parseExpression } from "@ecosy/json";
import type { PathNode } from "@ecosy/json";

// From tokens
const tokens = tokenize("$.store.book[0]");
const ast: PathNode[] = parse(tokens);

// Or from string directly
const ast2 = parseExpression("$.store.book[*].title");
```

### AST Node Types

| Node Type | Description | Key Fields |
|-----------|-------------|------------|
| `RootNode` | `$` root | `type: "root"` |
| `PropertyNode` | `.key` or `['key']` | `name: string` |
| `IndexNode` | `[n]` | `value: number` |
| `WildcardNode` | `[*]` or `.*` | — |
| `RecursiveNode` | `..key` | `target: PathNode` |
| `SliceNode` | `[start:end:step]` | `start, end, step: number \| null` |
| `UnionNode` | `[a,b,c]` | `items: (string \| number)[]` |
| `FilterNode` | `[?(expr)]` | `expression: FilterExpression` |

### Filter Expression Types

| Type | Description |
|------|-------------|
| `ComparisonExpression` | `{ left, operator, right }` |
| `LogicalExpression` | `{ operator: "&&" \| "\|\|", left, right }` |
| `PathExpression` | `{ nodes: PathNode[] }` — `@.price` or `$.root` |
| `LiteralExpression` | `{ value: string \| number \| boolean \| null }` |

## Evaluator API

```typescript
import { evaluate } from "@ecosy/json";
import type { JSONPathMatch } from "@ecosy/json";

const ast = parseExpression("$.store.book[*].title");
const matches: JSONPathMatch[] = evaluate(ast, data);
// [{ value: "Moby Dick", path: "$['store']['book'][0]['title']" }, ...]
```

## Key Rules

1. **Prefer `JSONPath` class over low-level APIs** — use `tokenize`/`parse`/`evaluate` only for custom tooling.
2. **Never modify AST nodes** — they are for inspection only.
3. **`parseExpression(str)` = `parse(tokenize(str))`** — convenience shortcut.
4. **`evaluate()` returns `{ value, path }` pairs** — not raw values.

## Examples

### Expression debugging
```typescript
import { parseExpression } from "@ecosy/json";

const ast = parseExpression("$.items[?(@.price < 10 && @.active == true)]");
console.log(JSON.stringify(ast, null, 2));
// Inspect the AST to understand how the expression is parsed
```

### AST inspection via JSONPath instance
```typescript
import { JSONPath } from "@ecosy/json";

const path = new JSONPath("$.store.book[0:3]");
const ast = path.toAST();
// [
//   { type: "root" },
//   { type: "property", name: "store" },
//   { type: "property", name: "book" },
//   { type: "slice", start: 0, end: 3, step: null },
// ]
```

### Custom expression validator
```typescript
import { parseExpression, type PathNode } from "@ecosy/json";

function hasRecursiveDescent(expr: string): boolean {
  const ast = parseExpression(expr);
  return ast.some((node) => node.type === "recursive");
}

hasRecursiveDescent("$.store.book[*]");  // false
hasRecursiveDescent("$..title");          // true
```
