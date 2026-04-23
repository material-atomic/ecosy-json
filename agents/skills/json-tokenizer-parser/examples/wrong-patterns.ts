/**
 * ❌ Anti-patterns for low-level APIs.
 */
import { parseExpression, evaluate } from "@ecosy/json";

const data = { items: [1, 2, 3] };

// ❌ Using low-level APIs when JSONPath class is sufficient
const ast = parseExpression("$.items[*]");
const matches = evaluate(ast, data);
const values = matches.map((m) => m.value);
// ✅ Fix: const values = new JSONPath("$.items[*]").query(data);

// ❌ Modifying AST nodes (they are for inspection only)
const ast2 = parseExpression("$.items[0]");
// (ast2[1] as any).value = 1; // Don't mutate!
// ✅ Fix: Create a new expression string: parseExpression("$.items[1]")

// ❌ Re-parsing the same expression repeatedly
function query(data: any) {
  const ast = parseExpression("$.items[*]"); // re-parses every call!
  return evaluate(ast, data);
}
// ✅ Fix: const path = new JSONPath("$.items[*]"); path.query(data);
