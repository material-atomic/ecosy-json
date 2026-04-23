/**
 * ✅ Correct patterns for JSONPath and JSONQuery usage.
 */
import { JSONPath, JSONQuery } from "@ecosy/json";

const data = {
  store: {
    book: [
      { title: "Sayings of the Century", price: 8.95, category: "reference" },
      { title: "Sword of Honour", price: 12.99, category: "fiction" },
      { title: "Moby Dick", price: 8.99, category: "fiction" },
      { title: "The Lord of the Rings", price: 22.99, category: "fiction" },
    ],
    bicycle: { color: "red", price: 19.95 },
  },
};

// ── Compile once, reuse ──────────────────────────────────────
const titlePath = new JSONPath("$.store.book[*].title");
const titles = titlePath.query<string>(data);
const firstTitle = titlePath.first<string>(data);
const titleCount = titlePath.count(data);

// ── Filter in expression (not in JS) ────────────────────────
const cheapBooks = JSONPath.query(data, "$.store.book[?(@.price < 10)]");
const fictionBooks = JSONPath.query(data, "$.store.book[?(@.category == 'fiction')]");
const expensiveFiction = JSONPath.query(
  data,
  "$.store.book[?(@.category == 'fiction' && @.price > 15)]",
);

// ── Use built-in methods ────────────────────────────────────
const path = new JSONPath("$.store.bicycle");
path.exists(data);   // true — don't do query().length > 0
path.count(data);    // 1 — don't do query().length
path.paths(data);    // ["$['store']['bicycle']"]

// ── Recursive descent ───────────────────────────────────────
const allPrices = JSONPath.query<number>(data, "$..price");
// [8.95, 12.99, 8.99, 22.99, 19.95]

// ── Slicing ─────────────────────────────────────────────────
const firstTwo = JSONPath.query(data, "$.store.book[0:2]");
const reversed = JSONPath.query(data, "$.store.book[::-1]");

// ── JSONQuery with pipes ────────────────────────────────────
const total = JSONQuery.evaluate(data, "SUM($.store.book[*].price)");
const formatted = JSONQuery.evaluate(data, "SUM($.store.book[*].price) | currency('$')");
const upper = JSONQuery.evaluate(data, "$.store.book[0].title | uppercase");

// ── JSONQuery fallback ──────────────────────────────────────
const discount = JSONQuery.evaluate(data, "$.store.discount ?? 'No discount available'");

// ── JSONQuery interpolation ─────────────────────────────────
const summary = JSONQuery.evaluate(
  data,
  "`{COUNT($.store.book[*])} books, total: {SUM($.store.book[*].price) | currency('$')}`",
);

// ── Auto-root shorthand ─────────────────────────────────────
const bikeColor = JSONQuery.evaluate(data, "store.bicycle.color | uppercase");
// equivalent to: $.store.bicycle.color | uppercase

// ── Custom extension ────────────────────────────────────────
JSONQuery.registerPipe("slug", (v) =>
  String(v).toLowerCase().replace(/\s+/g, "-"),
);

JSONQuery.registerAggregation("DISTINCT", (arr) => [...new Set(arr)]);

const categories = JSONQuery.evaluate(data, "DISTINCT($.store.book[*].category)");
// ["reference", "fiction"]
