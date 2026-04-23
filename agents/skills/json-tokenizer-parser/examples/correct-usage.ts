/**
 * ✅ Correct low-level API usage patterns.
 */
import {
  tokenize, parse, parseExpression, evaluate,
  TokenType, JSONPath,
} from "@ecosy/json";
import type { Token, PathNode, JSONPathMatch } from "@ecosy/json";

const data = {
  store: {
    book: [
      { title: "Moby Dick", price: 8.99 },
      { title: "1984", price: 6.99 },
    ],
  },
};

// ✅ Step-by-step compilation
const tokens: Token[] = tokenize("$.store.book[*].title");
const ast: PathNode[] = parse(tokens);
const matches: JSONPathMatch[] = evaluate(ast, data);
// [{ value: "Moby Dick", path: "..." }, { value: "1984", path: "..." }]

// ✅ Convenience shortcut
const ast2 = parseExpression("$.store.book[?(@.price < 10)]");
const results = evaluate(ast2, data);

// ✅ AST inspection via JSONPath instance
const path = new JSONPath("$.store.book[0:2]");
const inspectedAst = path.toAST();
// [{ type: "root" }, { type: "property", name: "store" }, ...]

// ✅ Custom expression analysis
function countFilters(expr: string): number {
  const ast = parseExpression(expr);
  return ast.filter((n) => n.type === "filter").length;
}

countFilters("$.items[?(@.a > 1)]");  // 1
countFilters("$.items[*].name");       // 0
