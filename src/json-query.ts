/* eslint-disable @typescript-eslint/no-explicit-any */
import { JSONPath } from "./json-path";

/**
 * Built-in pipe transforms that can be applied to query results via the `|` operator.
 *
 * Each pipe is a function `(value, ...args) => transformedValue`.
 * Custom pipes can be added at runtime via {@link JSONQuery.registerPipe}.
 *
 * Built-in pipes:
 * - `uppercase`  — Converts to upper case.
 * - `lowercase`  — Converts to lower case.
 * - `currency`   — Formats a number with locale and currency symbol.
 * - `date`       — Formats an ISO date string to locale date.
 * - `json`       — Serializes to a JSON string with optional indentation.
 * - `default`    — Returns a fallback when value is null/undefined/empty.
 * - `limit`      — Truncates an array to at most N items.
 * - `join`       — Joins an array into a string with a separator.
 *
 * @example
 * ```ts
 * // In a query expression:
 * // $.user.name | uppercase
 * // $.price | currency('€', 'de-DE')
 * // $.tags | join(', ')
 * ```
 */
export const PIPES: Record<string, (val: any, ...args: any[]) => any> = {
  uppercase: (v) => (v ? String(v).toUpperCase() : ""),
  lowercase: (v) => (v ? String(v).toLowerCase() : ""),
  currency: (v, symbol = "$", locale = "en-US") =>
    (v != null ? Number(v).toLocaleString(locale) + symbol : ""),
  date: (v, locale = "en-US") =>
    (v ? new Date(v).toLocaleDateString(locale) : ""),
  json: (v, spaces = 2) => JSON.stringify(v, null, Number(spaces)),
  default: (v, def) => (v === null || v === undefined || v === "" ? def : v),
  limit: (v, max) => (Array.isArray(v) ? v.slice(0, Number(max)) : v),
  join: (v, separator = ",") => (Array.isArray(v) ? v.join(separator) : v),
};

/**
 * Built-in aggregation functions that operate on arrays of values.
 *
 * Aggregations are invoked in query expressions using function-call syntax:
 * `SUM($.cart.items[*].price)`.
 *
 * Custom aggregations can be added at runtime via {@link JSONQuery.registerAggregation}.
 *
 * Built-in aggregations:
 * - `SUM`   — Sum of all numeric values.
 * - `COUNT` — Number of elements.
 * - `AVG`   — Arithmetic mean.
 * - `MIN`   — Minimum numeric value.
 * - `MAX`   — Maximum numeric value.
 *
 * @example
 * ```ts
 * JSONQuery.evaluate(data, "SUM($.items[*].price)");
 * JSONQuery.evaluate(data, "COUNT($.users[*])");
 * ```
 */
export const AGGREGATIONS: Record<string, (arr: any[]) => any> = {
  SUM: (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + Number(b || 0), 0) : 0),
  COUNT: (arr) => (Array.isArray(arr) ? arr.length : 0),
  AVG: (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + Number(b || 0), 0) / arr.length;
  },
  MIN: (arr) => (Array.isArray(arr) && arr.length ? Math.min(...arr.map(Number)) : 0),
  MAX: (arr) => (Array.isArray(arr) && arr.length ? Math.max(...arr.map(Number)) : 0),
};

/**
 * Extended JSON query engine built on top of {@link JSONPath}.
 *
 * Adds a multi-layer evaluation pipeline on top of standard JSONPath:
 *
 * 1. **String interpolation** — `` `Hello {$.user.name}` ``
 * 2. **Fallback (`??`)** — `$.primary ?? $.fallback ?? 'default'`
 * 3. **Pipes (`|`)** — `$.name | uppercase`
 * 4. **Aggregation functions** — `SUM($.items[*].price)`
 * 5. **Auto-root shorthand** — `user.name` resolves as `$.user.name`
 *
 * @example
 * ```ts
 * const q = new JSONQuery("$.user.name");
 * q.set({ user: { name: "Ken" } });
 * q.eval("$.user.name | uppercase"); // "KEN"
 *
 * JSONQuery.evaluate(data, "SUM($.cart[*].price) | currency('$')");
 * ```
 */
export class JSONQuery extends JSONPath {
  /** The data source for instance-level evaluation. */
  private data: any = {};

  /**
   * Creates a new JSONQuery instance.
   *
   * @param expression - A JSONPath expression string (defaults to `$` — the root).
   */
  constructor(expression: string = "$") {
    super(expression);
  }

  /**
   * Returns the current data source bound to this instance.
   *
   * @returns The data object previously set via {@link set}.
   */
  get(): any {
    return this.data;
  }

  /**
   * Binds a data source to this instance for subsequent {@link eval} calls.
   *
   * @param data - The root JSON document (state, API response, etc.).
   */
  set(data: any) {
    this.data = data;
  }

  /**
   * Evaluates an expression against the instance's bound data source.
   *
   * Shorthand for `JSONQuery.evaluate(this.data, expr)`.
   *
   * @param expr - The query expression string.
   * @returns The resolved value after applying pipes, aggregations, and fallbacks.
   */
  eval(expr: string): any {
    return JSONQuery.evaluate(this.data, expr);
  }

  /**
   * Registers a custom pipe transform at runtime.
   *
   * @param name - The pipe name used in expressions (e.g. `"truncate"`).
   * @param fn   - The transform function `(value, ...args) => result`.
   *
   * @example
   * ```ts
   * JSONQuery.registerPipe("truncate", (v, len = 50) =>
   *   String(v).slice(0, Number(len)),
   * );
   * // Usage: $.description | truncate(100)
   * ```
   */
  static registerPipe(name: string, fn: (val: any, ...args: any[]) => any) {
    PIPES[name] = fn;
  }

  /**
   * Registers a custom aggregation function at runtime.
   *
   * @param name - The function name used in expressions (e.g. `"MEDIAN"`).
   * @param fn   - The aggregation function `(array) => result`.
   *
   * @example
   * ```ts
   * JSONQuery.registerAggregation("MEDIAN", (arr) => {
   *   const sorted = [...arr].sort((a, b) => a - b);
   *   const mid = Math.floor(sorted.length / 2);
   *   return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
   * });
   * ```
   */
  static registerAggregation(name: string, fn: (arr: any[]) => any) {
    AGGREGATIONS[name] = fn;
  }

  /**
   * Evaluates a query expression against a JSON document.
   *
   * This is the main entry point for the multi-layer evaluation pipeline:
   * string interpolation → fallback → pipes → aggregation → JSONPath core.
   *
   * @param data - The root JSON document to query against.
   * @param expr - The query expression string.
   * @returns The resolved value, or `undefined` if nothing matched.
   *
   * @example
   * ```ts
   * JSONQuery.evaluate(data, "$.user.name | uppercase");
   * JSONQuery.evaluate(data, "SUM($.items[*].price) | currency('$')");
   * JSONQuery.evaluate(data, "`Total: {SUM($.items[*].price)}`");
   * JSONQuery.evaluate(data, "$.primary ?? $.fallback ?? 'N/A'");
   * ```
   */
  static evaluate(data: any, expr: string): any {
    if (!expr) return undefined;
    expr = expr.trim();

    // Layer 1: String interpolation — `Total: {SUM($.cart.items[*].price)}`
    if (expr.startsWith("`") && expr.endsWith("`")) {
      const innerStr = expr.slice(1, -1);
      // Replace `{...}` blocks (skip escaped `\{`)
      return innerStr.replace(/(^|[^\\])\{([^}]+)\}/g, (match, prefix, queryObj) => {
        const val = this.evaluate(data, queryObj);
        const strVal = val !== undefined && val !== null ? String(val) : "";
        return prefix + strVal;
      }).replace(/\\{/g, "{"); // unescape
    }

    // Layer 2 & 3: Fallback (??) and Pipes (|)
    // Split carefully, respecting quotes and parentheses
    const fallbackSegments = this.smartSplit(expr, "??");
    let resolvedValue: any = null;

    for (const fbSegment of fallbackSegments) {
      const pipeSegments = this.smartSplit(fbSegment, "|");
      const coreExprStr = pipeSegments[0];

      resolvedValue = this.resolveSegment(data, coreExprStr);

      // If core resolved to a valid value, apply pipes and break out of fallback loop
      if (resolvedValue !== null && resolvedValue !== undefined) {
        const pipesToApply = pipeSegments.slice(1);
        resolvedValue = pipesToApply.reduce((acc, pipeStr) => this.applyPipe(acc, pipeStr), resolvedValue);
        break;
      }
    }

    return resolvedValue;
  }

  /**
   * Resolves a single segment to a concrete value.
   *
   * Handles (in order): static strings, numbers, booleans, `null`,
   * aggregation function calls, and JSONPath expressions.
   * Bare identifiers (e.g. `user.name`) are auto-prefixed with `$`.
   *
   * @param data    - The root JSON document.
   * @param segment - The raw segment string to resolve.
   * @returns The resolved value, or `undefined` if unresolvable.
   */
  private static resolveSegment(data: any, segment: string): any {
    segment = segment.trim();

    // 1. Static strings: 'default.png' or "default.png"
    if (/^['"].*['"]$/.test(segment)) {
      return segment.slice(1, -1);
    }

    // 2. Numbers & booleans
    if (!isNaN(Number(segment))) return Number(segment);
    if (segment === "true") return true;
    if (segment === "false") return false;
    if (segment === "null") return null;

    // 3. Aggregation functions: SUM($.items[*].price)
    const funcMatch = segment.match(/^([A-Z_]+)\((.*)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const innerExpr = funcMatch[2];
      const innerValue = this.evaluate(data, innerExpr);

      if (AGGREGATIONS[funcName]) {
        // Normalize to array (JSONPath may return a single value)
        const arrValue = Array.isArray(innerValue) ? innerValue : (innerValue != null ? [innerValue] : []);
        return AGGREGATIONS[funcName](arrValue);
      }
    }

    // 4. JSONPath core: auto-prefix bare identifiers with `$`
    let jsonPathQuery = segment;

    if (/^[a-zA-Z_]/.test(segment)) {
      jsonPathQuery = `$.${segment}`;
    }

    if (jsonPathQuery.startsWith("$.") || jsonPathQuery.startsWith("@.") || jsonPathQuery === "$") {
      try {
        const result = JSONPath.query(data, jsonPathQuery);
        // Unwrap single-element arrays for ergonomic pipe usage
        return result.length === 1 ? result[0] : (result.length === 0 ? undefined : result);
      } catch {
        console.warn(`[JSONQuery] Invalid path query: ${jsonPathQuery}`);
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * Parses and applies a single pipe expression to a value.
   *
   * Extracts the pipe name and optional arguments from the expression string
   * (e.g. `currency('VND', 'vi-VN')`) and invokes the matching {@link PIPES} entry.
   *
   * @param value    - The input value to transform.
   * @param pipeExpr - The raw pipe expression (e.g. `"uppercase"` or `"limit(5)"`).
   * @returns The transformed value, or the original value if the pipe is unknown.
   */
  private static applyPipe(value: any, pipeExpr: string): any {
    pipeExpr = pipeExpr.trim();
    const match = pipeExpr.match(/^([a-zA-Z0-9_]+)(?:\((.*)\))?$/);
    if (!match) return value;

    const pipeName = match[1];
    const rawArgsStr = match[2];

    const args = rawArgsStr
      ? this.smartSplit(rawArgsStr, ",").map(s => this.resolveSegment({}, s))
      : [];

    const pipeFunc = PIPES[pipeName];
    if (!pipeFunc) {
      console.warn(`[JSONQuery] Warning: Pipe '${pipeName}' is not registered.`);
      return value;
    }

    return pipeFunc(value, ...args);
  }

  /**
   * Splits a string by a delimiter while respecting quotes and parentheses.
   *
   * Prevents splitting inside quoted strings (`'...'`, `"..."`) or nested
   * parentheses (`(...)`), ensuring expressions like `currency('$', 'en-US')`
   * are not broken apart by a `,` delimiter.
   *
   * @param str       - The string to split.
   * @param delimiter - The delimiter to split on (e.g. `","`, `"|"`, `"??"`).
   * @returns An array of trimmed segments.
   */
  private static smartSplit(str: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let parenLevel = 0;
    let i = 0;

    while (i < str.length) {
      const char = str[i];
      const nextChars = str.slice(i, i + delimiter.length);

      // Track quoting and nesting context
      if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
      else if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
      else if (char === '(' && !inSingleQuote && !inDoubleQuote) parenLevel++;
      else if (char === ')' && !inSingleQuote && !inDoubleQuote) parenLevel--;

      // Only split at top level (not inside quotes or parens)
      if (!inSingleQuote && !inDoubleQuote && parenLevel === 0 && nextChars === delimiter) {
        result.push(current);
        current = "";
        i += delimiter.length;
        continue;
      }

      current += char;
      i++;
    }
    
    if (current !== "") result.push(current);
    return result.map(s => s.trim());
  }
}
