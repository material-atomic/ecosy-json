/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  PathNode,
  FilterExpression,
  ComparisonExpression,
  LogicalExpression,
  PathExpression,
  LiteralExpression,
} from "./parser";

/** A single match result containing the resolved value and its normalized JSONPath. */
export interface JSONPathMatch {
  /** The matched value from the JSON document. */
  value: any;
  /** The normalized path string (e.g. `$['store']['book'][0]`). */
  path: string;
}

/**
 * Evaluates a parsed JSONPath AST against a JSON document and returns all matching values.
 *
 * Uses ES6 generators (`yield*`) internally to pipeline node evaluation
 * without allocating intermediate arrays — only the final result is materialized.
 *
 * @param nodes - The parsed AST produced by {@link parse}.
 * @param data  - The root JSON document to query against.
 * @returns An array of {@link JSONPathMatch} results with values and normalized paths.
 *
 * @example
 * ```ts
 * import { parse } from "./parser";
 * import { tokenize } from "./tokenizer";
 * import { evaluate } from "./evaluator";
 *
 * const ast = parse(tokenize("$.store.book[*].title"));
 * const matches = evaluate(ast, data);
 * // [{ value: "Sayings of the Century", path: "$['store']['book'][0]['title']" }, ...]
 * ```
 */
export function evaluate(nodes: PathNode[], data: any): JSONPathMatch[] {
  return Array.from(evaluateNodes(nodes, [{ value: data, path: "$" }], data));
}

/**
 * Lazily evaluates a sequence of AST nodes against an iterable of current matches.
 *
 * Each node is chained as a generator stage — no intermediate arrays are allocated
 * until the caller materializes the final iterable.
 *
 * @param nodes   - AST nodes to evaluate sequentially.
 * @param initial - The seed matches (typically `[{ value: root, path: "$" }]`).
 * @param root    - The root JSON document (needed for `$` reset and filter resolution).
 * @yields {@link JSONPathMatch} results after all nodes have been applied.
 */
function* evaluateNodes(
  nodes: PathNode[],
  initial: Iterable<JSONPathMatch>,
  root: any
): IterableIterator<JSONPathMatch> {
  let currentMatches: Iterable<JSONPathMatch> = initial;

  for (const node of nodes) {
    if (node.type === "root") {
      currentMatches = [{ value: root, path: "$" }];
      continue;
    }
    currentMatches = chainNodes(node, currentMatches, root);
  }

  yield* currentMatches;
}

/**
 * Chains a single AST node across all current matches without intermediate allocation.
 *
 * @param node    - The AST node to apply.
 * @param matches - The current set of matches to fan out from.
 * @param root    - The root JSON document.
 * @yields {@link JSONPathMatch} results for each input match.
 */
function* chainNodes(node: PathNode, matches: Iterable<JSONPathMatch>, root: any): IterableIterator<JSONPathMatch> {
  for (const match of matches) {
    yield* applyNode(node, match.value, match.path, root);
  }
}

/**
 * Applies a single AST node to the current value and yields all resulting matches.
 *
 * Handles property access, array indexing, wildcards, recursive descent,
 * slicing (including negative step), union, and filter expressions.
 *
 * @param node    - The AST node describing the operation.
 * @param current - The current value being traversed.
 * @param path    - The normalized path to `current`.
 * @param root    - The root JSON document (for `$` references in filters).
 * @yields {@link JSONPathMatch} results for this node.
 */
function* applyNode(node: PathNode, current: any, path: string, root: any): IterableIterator<JSONPathMatch> {
  if (current === null || current === undefined) return;

  switch (node.type) {
    case "root":
      yield { value: root, path: "$" };
      break;

    case "property":
      if (typeof current === "object" && node.name in current) {
        yield { value: current[node.name], path: `${path}['${node.name}']` };
      }
      break;

    case "index":
      if (Array.isArray(current)) {
        const idx = node.value < 0 ? current.length + node.value : node.value;
        if (idx >= 0 && idx < current.length) {
          yield { value: current[idx], path: `${path}[${idx}]` };
        }
      }
      break;

    case "wildcard":
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          yield { value: current[i], path: `${path}[${i}]` };
        }
      } else if (typeof current === "object" && current !== null) {
        for (const k of Object.keys(current)) {
          yield { value: current[k], path: `${path}['${k}']` };
        }
      }
      break;

    case "recursive":
      yield* descendAndApply(current, path, node.target, root);
      break;

    case "slice": {
      if (!Array.isArray(current)) return;
      const len = current.length;
      const step = node.step ?? 1;
      if (step === 0) return; // guard against infinite loop

      if (step > 0) {
        const start = resolveSliceIndex(node.start, 0, len);
        const end = resolveSliceIndex(node.end, len, len);
        for (let idx = start; idx < end; idx += step) {
          yield { value: current[idx], path: `${path}[${idx}]` };
        }
      } else {
        // Negative step: start defaults to end of array, end defaults to -1
        const start = resolveSliceIndex(node.start, len - 1, len);
        const end = resolveSliceIndex(node.end, -1, len);
        for (let idx = start; idx > end; idx += step) {
          yield { value: current[idx], path: `${path}[${idx}]` };
        }
      }
      break;
    }

    case "union":
      for (const item of node.items) {
        if (typeof item === "number" && Array.isArray(current)) {
          const idx = item < 0 ? current.length + item : item;
          if (idx >= 0 && idx < current.length) {
            yield { value: current[idx], path: `${path}[${idx}]` };
          }
        } else if (typeof item === "string" && typeof current === "object" && current !== null) {
          if (item in current) {
            yield { value: current[item], path: `${path}['${item}']` };
          }
        }
      }
      break;

    case "filter":
      if (!Array.isArray(current)) return;
      for (let idx = 0; idx < current.length; idx++) {
        if (evaluateFilter(node.expression, current[idx], root)) {
          yield { value: current[idx], path: `${path}[${idx}]` };
        }
      }
      break;
  }
}

/**
 * Resolves a slice boundary to a concrete array index.
 *
 * Handles `null` (use fallback), negative values (wrap from end),
 * and clamping to `[−1, len]` so reverse iteration works correctly.
 *
 * @param value    - The raw boundary from the AST (`null` if omitted).
 * @param fallback - Default value when `value` is `null`.
 * @param len      - Length of the array being sliced.
 * @returns The resolved index, clamped to a safe range.
 */
function resolveSliceIndex(value: number | null, fallback: number, len: number): number {
  if (value === null) return fallback;
  if (value < 0) return Math.max(-1, len + value); // allow -1 as sentinel for reverse loops
  return Math.min(value, len);
}

/**
 * Recursively descends into `current` (objects and arrays) and applies
 * `target` at every level, yielding all matches found at any depth.
 *
 * @param current - The value to descend into.
 * @param path    - The normalized path to `current`.
 * @param target  - The AST node to apply at each level.
 * @param root    - The root JSON document.
 * @yields {@link JSONPathMatch} results from all depths.
 */
function* descendAndApply(current: any, path: string, target: PathNode, root: any): IterableIterator<JSONPathMatch> {
  yield* applyNode(target, current, path, root);

  if (Array.isArray(current)) {
    for (let i = 0; i < current.length; i++) {
      yield* descendAndApply(current[i], `${path}[${i}]`, target, root);
    }
  } else if (typeof current === "object" && current !== null) {
    for (const key of Object.keys(current)) {
      yield* descendAndApply(current[key], `${path}['${key}']`, target, root);
    }
  }
}

/**
 * Evaluates a filter expression against the current element.
 *
 * Supports path existence checks, literal truthiness, comparison operators,
 * and logical `&&`/`||` combinators.
 *
 * @param expr    - The filter expression AST node.
 * @param current - The current array element being tested.
 * @param root    - The root JSON document (for `$` references).
 * @returns `true` if the element passes the filter.
 */
function evaluateFilter(expr: FilterExpression, current: any, root: any): boolean {
  switch (expr.type) {
    case "path": {
      const vals = resolvePath(expr, current, root);
      return vals.length > 0 && vals.some(v => v !== false && v !== null && v !== undefined);
    }
    case "literal":
      return Boolean(expr.value);

    case "comparison":
      return evaluateComparison(expr, current, root);

    case "logical":
      return evaluateLogical(expr, current, root);

    default:
      return false;
  }
}

/**
 * Resolves a path expression inside a filter by re-entering the generator pipeline.
 *
 * This allows filters to contain complex sub-expressions including wildcards
 * and recursive descent (e.g. `[?(@..price > 10)]`).
 *
 * @param expr    - The path expression to resolve.
 * @param current - The current element (`@` context).
 * @param root    - The root JSON document (`$` context).
 * @returns An array of resolved values (may contain multiple results from wildcards).
 */
function resolvePath(expr: PathExpression, current: any, root: any): any[] {
  const matches = Array.from(evaluateNodes(expr.nodes, [{ value: current, path: "@" }], root));
  return matches.map(m => m.value);
}

/**
 * Resolves a filter sub-expression to an array of concrete values.
 *
 * Path expressions may return multiple values (e.g. via wildcards);
 * literals always return a single-element array.
 *
 * @param expr    - The filter sub-expression (path or literal).
 * @param current - The current array element.
 * @param root    - The root JSON document.
 * @returns An array of resolved values.
 */
function resolveFilterValue(expr: FilterExpression, current: any, root: any): any[] {
  switch (expr.type) {
    case "path":
      return resolvePath(expr, current, root);
    case "literal":
      return [(expr as LiteralExpression).value];
    default:
      return [];
  }
}

/**
 * Evaluates a comparison expression (`==`, `!=`, `<`, `<=`, `>`, `>=`, `===`, `!==`).
 *
 * Uses cross-product semantics: if **any** left value matches **any** right value
 * under the given operator, the comparison succeeds. This correctly handles
 * wildcard paths that resolve to multiple values.
 *
 * @param expr    - The comparison expression AST node.
 * @param current - The current array element.
 * @param root    - The root JSON document.
 * @returns `true` if at least one left–right pair satisfies the operator.
 */
function evaluateComparison(expr: ComparisonExpression, current: any, root: any): boolean {
  const leftValues = resolveFilterValue(expr.left, current, root);
  const rightValues = resolveFilterValue(expr.right, current, root);

  for (const l of leftValues) {
    for (const r of rightValues) {
      let match = false;
      switch (expr.operator) {
        case "==": match = l == r; break;
        case "!=": match = l != r; break;
        case "===": match = l === r; break;
        case "!==": match = l !== r; break;
        case "<": match = l < r; break;
        case "<=": match = l <= r; break;
        case ">": match = l > r; break;
        case ">=": match = l >= r; break;
      }
      if (match) return true; 
    }
  }
  return false;
}

/**
 * Evaluates a logical expression (`&&` or `||`) with short-circuit semantics.
 *
 * @param expr    - The logical expression AST node.
 * @param current - The current array element.
 * @param root    - The root JSON document.
 * @returns The boolean result of combining the left and right sub-expressions.
 */
function evaluateLogical(expr: LogicalExpression, current: any, root: any): boolean {
  const left = evaluateFilter(expr.left, current, root);
  if (expr.operator === "&&") return left && evaluateFilter(expr.right, current, root);
  if (expr.operator === "||") return left || evaluateFilter(expr.right, current, root);
  return false;
}
