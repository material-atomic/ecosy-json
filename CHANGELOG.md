# Changelog

## 0.1.0 (2026-04-22)

### Features

- **JSONPath**: Full JSONPath expression engine with compiled AST — supports `$`, `.key`, `['key']`, `[n]`, `[-n]`, `.*`, `[*]`, `..key`, `[start:end:step]`, `[a,b,c]`, and `[?(expr)]` syntax
- **JSONPath**: Reusable compiled instances — `new JSONPath(expr)` compiles once, `query(data)` evaluates many times against different documents
- **JSONPath**: Rich query API — `query()`, `matches()`, `first()`, `last()`, `exists()`, `count()`, `paths()`, `map()`, `forEach()`, `toAST()`
- **JSONPath**: Static one-shot shortcuts — `JSONPath.query(data, expr)`, `JSONPath.first()`, `JSONPath.exists()`
- **Tokenizer**: Character-by-character lexer producing 16 token types — handles quoted strings, numbers, operators, identifiers, and structural tokens
- **Parser**: Recursive descent parser converting token streams to `PathNode[]` AST — supports all JSONPath node types including nested filter expressions with operator precedence
- **Evaluator**: Generator-based (`yield*`) evaluation pipeline with zero intermediate array allocation — chains `evaluateNodes()` → `chainNodes()` → `applyNode()` lazily
- **Evaluator**: Negative slice support — correctly handles `[start:end:step]` with negative step values, defaulting start to `len-1` and end to `-1` for reverse iteration
- **Evaluator**: Cross-product filter semantics — wildcard paths inside filter expressions correctly match when any left value satisfies the comparison against any right value
- **Evaluator**: Recursive filter resolution — filter expressions containing `[*]` (wildcard) and `..` (recursive descent) are resolved by re-entering the generator pipeline
- **JSONQuery**: Multi-layer evaluation pipeline extending JSONPath with 5 processing layers: string interpolation → fallback (`??`) → pipes (`|`) → aggregation functions → JSONPath core
- **JSONQuery**: String interpolation — `` `Hello {$.user.name}, total: {SUM($.items[*].price)}` `` with `\{` escape support
- **JSONQuery**: Null-coalescing fallback — `$.primary ?? $.fallback ?? 'default'` chains multiple expressions
- **JSONQuery**: Auto-root shorthand — bare identifiers like `user.name` are automatically prefixed with `$` for ergonomic queries
- **JSONQuery**: Smart expression splitting — `smartSplit()` respects quotes and parentheses when splitting by `??`, `|`, or `,` delimiters
- **PIPES**: 8 built-in pipe transforms — `uppercase`, `lowercase`, `currency(symbol, locale)`, `date(locale)`, `json(spaces)`, `default(fallback)`, `limit(max)`, `join(separator)`
- **AGGREGATIONS**: 5 built-in aggregation functions — `SUM`, `COUNT`, `AVG`, `MIN`, `MAX`
- **Extensibility**: Runtime registration — `JSONQuery.registerPipe(name, fn)` and `JSONQuery.registerAggregation(name, fn)` for custom transforms
- **Agent Skills**: Full `agents/` directory with structured AI documentation — `PROMPT.md`, `RULES.md`, skill with correct/wrong pattern examples
- Zero dependencies — fully standalone package, no peer or runtime deps

### Exports

```
JSONPath
JSONQuery, PIPES, AGGREGATIONS
tokenize, TokenType, Token
parse, parseExpression
evaluate, JSONPathMatch
PathNode, RootNode, PropertyNode, IndexNode, WildcardNode
RecursiveNode, SliceNode, UnionNode, FilterNode
FilterExpression, ComparisonExpression, LogicalExpression
PathExpression, LiteralExpression
```
