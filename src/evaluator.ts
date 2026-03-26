/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  PathNode,
  FilterExpression,
  ComparisonExpression,
  LogicalExpression,
  PathExpression,
  LiteralExpression,
} from "./parser";

/** A single match result with its value and the normalized path. */
export interface JSONPathMatch {
  value: any;
  path: string;
}

/**
 * Evaluates an AST against a JSON document and returns all matching values.
 *
 * @param nodes - The parsed AST from {@link parse}.
 * @param data - The JSON document to query.
 * @returns An array of {@link JSONPathMatch} results.
 */
export function evaluate(nodes: PathNode[], data: any): JSONPathMatch[] {
  let results: JSONPathMatch[] = [{ value: data, path: "$" }];

  for (const node of nodes) {
    if (node.type === "root") {
      results = [{ value: data, path: "$" }];
      continue;
    }
    results = results.flatMap((r) => applyNode(node, r.value, r.path, data));
  }

  return results;
}

function applyNode(
  node: PathNode,
  current: any,
  path: string,
  root: any,
): JSONPathMatch[] {
  if (current === null || current === undefined) return [];

  switch (node.type) {
    case "root":
      return [{ value: root, path: "$" }];

    case "property":
      if (typeof current === "object" && node.name in current) {
        return [{ value: current[node.name], path: `${path}['${node.name}']` }];
      }
      return [];

    case "index": {
      if (Array.isArray(current)) {
        const idx = node.value < 0 ? current.length + node.value : node.value;
        if (idx >= 0 && idx < current.length) {
          return [{ value: current[idx], path: `${path}[${idx}]` }];
        }
      }
      return [];
    }

    case "wildcard": {
      if (Array.isArray(current)) {
        return current.map((v, i) => ({ value: v, path: `${path}[${i}]` }));
      }
      if (typeof current === "object" && current !== null) {
        return Object.keys(current).map((k) => ({
          value: current[k],
          path: `${path}['${k}']`,
        }));
      }
      return [];
    }

    case "recursive":
      return descendAndApply(current, path, node.target, root);

    case "slice": {
      if (!Array.isArray(current)) return [];
      const len = current.length;
      const start = resolveSliceIndex(node.start, 0, len);
      const end = resolveSliceIndex(node.end, len, len);
      const step = node.step ?? 1;

      const results: JSONPathMatch[] = [];
      if (step > 0) {
        for (let idx = start; idx < end; idx += step) {
          results.push({ value: current[idx], path: `${path}[${idx}]` });
        }
      } else if (step < 0) {
        for (let idx = start; idx > end; idx += step) {
          results.push({ value: current[idx], path: `${path}[${idx}]` });
        }
      }
      return results;
    }

    case "union": {
      const results: JSONPathMatch[] = [];
      for (const item of node.items) {
        if (typeof item === "number" && Array.isArray(current)) {
          const idx = item < 0 ? current.length + item : item;
          if (idx >= 0 && idx < current.length) {
            results.push({ value: current[idx], path: `${path}[${idx}]` });
          }
        } else if (typeof item === "string" && typeof current === "object" && current !== null) {
          if (item in current) {
            results.push({ value: current[item], path: `${path}['${item}']` });
          }
        }
      }
      return results;
    }

    case "filter": {
      if (!Array.isArray(current)) return [];
      const results: JSONPathMatch[] = [];
      for (let idx = 0; idx < current.length; idx++) {
        if (evaluateFilter(node.expression, current[idx], root)) {
          results.push({ value: current[idx], path: `${path}[${idx}]` });
        }
      }
      return results;
    }

    default:
      return [];
  }
}

function resolveSliceIndex(value: number | null, fallback: number, len: number): number {
  if (value === null) return fallback;
  return value < 0 ? Math.max(0, len + value) : Math.min(value, len);
}

function descendAndApply(
  current: any,
  path: string,
  target: PathNode,
  root: any,
): JSONPathMatch[] {
  const results: JSONPathMatch[] = [];

  // Apply to current level
  results.push(...applyNode(target, current, path, root));

  // Recurse into children
  if (Array.isArray(current)) {
    current.forEach((v, i) => {
      results.push(...descendAndApply(v, `${path}[${i}]`, target, root));
    });
  } else if (typeof current === "object" && current !== null) {
    for (const key of Object.keys(current)) {
      results.push(...descendAndApply(current[key], `${path}['${key}']`, target, root));
    }
  }

  return results;
}

function evaluateFilter(expr: FilterExpression, current: any, root: any): boolean {
  switch (expr.type) {
    case "path":
      return resolvePath(expr, current, root) !== undefined;

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

function resolvePath(expr: PathExpression, current: any, root: any): any {
  let value: any = current;

  for (const node of expr.nodes) {
    if (value === null || value === undefined) return undefined;
    if (node.type === "root") {
      value = root;
    } else if (node.type === "property") {
      value = value?.[node.name];
    } else if (node.type === "index") {
      value = Array.isArray(value) ? value[node.value] : undefined;
    }
  }

  return value;
}

function resolveFilterValue(expr: FilterExpression, current: any, root: any): any {
  switch (expr.type) {
    case "path":
      return resolvePath(expr, current, root);
    case "literal":
      return (expr as LiteralExpression).value;
    default:
      return undefined;
  }
}

function evaluateComparison(expr: ComparisonExpression, current: any, root: any): boolean {
  const left = resolveFilterValue(expr.left, current, root);
  const right = resolveFilterValue(expr.right, current, root);

  switch (expr.operator) {
    case "==": return left == right;  
    case "!=": return left != right;  
    case "===": return left === right;
    case "!==": return left !== right;
    case "<": return left < right;
    case "<=": return left <= right;
    case ">": return left > right;
    case ">=": return left >= right;
    default: return false;
  }
}

function evaluateLogical(expr: LogicalExpression, current: any, root: any): boolean {
  const left = evaluateFilter(expr.left, current, root);
  if (expr.operator === "&&") return left && evaluateFilter(expr.right, current, root);
  if (expr.operator === "||") return left || evaluateFilter(expr.right, current, root);
  return false;
}
