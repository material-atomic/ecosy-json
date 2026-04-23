import { describe, it, expect } from "vitest";
import { JSONPath } from "../src/index";

const data = {
  store: {
    book: [
      { title: "Sayings of the Century", price: 8.95, author: "Nigel Rees" },
      { title: "Sword of Honour", price: 12.99, author: "Evelyn Waugh" },
      { title: "Moby Dick", price: 8.99, author: "Herman Melville" },
      { title: "The Lord of the Rings", price: 22.99, author: "J.R.R. Tolkien" },
    ],
    bicycle: { color: "red", price: 19.95 },
  },
};

describe("JSONPath", () => {
  // ─── Constructor & compilation ──────────────────────────────────
  it("compiles an expression on construction", () => {
    const jp = new JSONPath("$.store.book[*].title");
    expect(jp.expression).toBe("$.store.book[*].title");
  });

  // ─── query ──────────────────────────────────────────────────────
  it("query returns all matching values", () => {
    const jp = new JSONPath("$.store.book[*].title");
    expect(jp.query(data)).toEqual([
      "Sayings of the Century",
      "Sword of Honour",
      "Moby Dick",
      "The Lord of the Rings",
    ]);
  });

  it("query returns empty array for no match", () => {
    const jp = new JSONPath("$.store.nonexistent");
    expect(jp.query(data)).toEqual([]);
  });

  // ─── matches ────────────────────────────────────────────────────
  it("matches returns value and path", () => {
    const jp = new JSONPath("$.store.book[0].title");
    const result = jp.matches(data);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("Sayings of the Century");
    expect(result[0].path).toBe("$['store']['book'][0]['title']");
  });

  // ─── first ──────────────────────────────────────────────────────
  it("first returns the first match", () => {
    const jp = new JSONPath("$.store.book[*].title");
    expect(jp.first(data)).toBe("Sayings of the Century");
  });

  it("first returns undefined when no match", () => {
    const jp = new JSONPath("$.store.nonexistent");
    expect(jp.first(data)).toBeUndefined();
  });

  // ─── last ───────────────────────────────────────────────────────
  it("last returns the last match", () => {
    const jp = new JSONPath("$.store.book[*].title");
    expect(jp.last(data)).toBe("The Lord of the Rings");
  });

  it("last returns undefined when no match", () => {
    const jp = new JSONPath("$.store.nonexistent");
    expect(jp.last(data)).toBeUndefined();
  });

  // ─── exists ─────────────────────────────────────────────────────
  it("exists returns true when matches found", () => {
    const jp = new JSONPath("$.store.book[0]");
    expect(jp.exists(data)).toBe(true);
  });

  it("exists returns false when no matches", () => {
    const jp = new JSONPath("$.store.nonexistent");
    expect(jp.exists(data)).toBe(false);
  });

  // ─── count ──────────────────────────────────────────────────────
  it("count returns the number of matches", () => {
    const jp = new JSONPath("$.store.book[*]");
    expect(jp.count(data)).toBe(4);
  });

  it("count returns 0 when no matches", () => {
    const jp = new JSONPath("$.store.nonexistent");
    expect(jp.count(data)).toBe(0);
  });

  // ─── paths ──────────────────────────────────────────────────────
  it("paths returns normalized path strings", () => {
    const jp = new JSONPath("$.store.book[:2].title");
    const result = jp.paths(data);
    expect(result).toEqual([
      "$['store']['book'][0]['title']",
      "$['store']['book'][1]['title']",
    ]);
  });

  // ─── map ────────────────────────────────────────────────────────
  it("map applies a function to each match", () => {
    const jp = new JSONPath("$.store.book[*].price");
    const doubled = jp.map(data, (v: number) => v * 2);
    expect(doubled).toEqual([17.9, 25.98, 17.98, 45.98]);
  });

  it("map callback receives value, path, and index", () => {
    const jp = new JSONPath("$.store.book[0].title");
    jp.map(data, (value, path, index) => {
      expect(value).toBe("Sayings of the Century");
      expect(path).toBe("$['store']['book'][0]['title']");
      expect(index).toBe(0);
      return value;
    });
  });

  // ─── forEach ────────────────────────────────────────────────────
  it("forEach iterates over all matches", () => {
    const jp = new JSONPath("$.store.book[*].author");
    const authors: string[] = [];
    jp.forEach(data, (value) => authors.push(value));
    expect(authors).toEqual([
      "Nigel Rees",
      "Evelyn Waugh",
      "Herman Melville",
      "J.R.R. Tolkien",
    ]);
  });

  // ─── toAST ──────────────────────────────────────────────────────
  it("toAST returns the compiled AST", () => {
    const jp = new JSONPath("$.store");
    const ast = jp.toAST();
    expect(ast).toHaveLength(2);
    expect(ast[0]).toEqual({ type: "root" });
    expect(ast[1]).toEqual({ type: "property", name: "store" });
  });

  // ─── toString ───────────────────────────────────────────────────
  it("toString returns the original expression", () => {
    const expr = "$.store.book[*].title";
    const jp = new JSONPath(expr);
    expect(jp.toString()).toBe(expr);
  });

  // ─── Compile once, query many ──────────────────────────────────
  it("reuses compiled AST across multiple queries", () => {
    const jp = new JSONPath("$.store.book[*].title");
    const data2 = {
      store: { book: [{ title: "A" }, { title: "B" }] },
    };
    expect(jp.query(data)).toHaveLength(4);
    expect(jp.query(data2)).toEqual(["A", "B"]);
  });

  // ─── Static API ────────────────────────────────────────────────
  describe("static methods", () => {
    it("JSONPath.query returns values", () => {
      expect(JSONPath.query(data, "$.store.book[0].title")).toEqual([
        "Sayings of the Century",
      ]);
    });

    it("JSONPath.first returns first value", () => {
      expect(JSONPath.first(data, "$.store.book[*].author")).toBe("Nigel Rees");
    });

    it("JSONPath.exists returns boolean", () => {
      expect(JSONPath.exists(data, "$.store.bicycle")).toBe(true);
      expect(JSONPath.exists(data, "$.store.motorcycle")).toBe(false);
    });

    it("JSONPath.tokenize returns tokens", () => {
      const tokens = JSONPath.tokenize("$.store");
      expect(tokens.length).toBeGreaterThan(0);
    });

    it("JSONPath.parse returns AST", () => {
      const ast = JSONPath.parse("$.store");
      expect(ast[0]).toEqual({ type: "root" });
      expect(ast[1]).toEqual({ type: "property", name: "store" });
    });
  });

  // ─── Complex expressions ───────────────────────────────────────
  it("handles filter with chained property", () => {
    expect(
      JSONPath.query(data, "$.store.book[?(@.price < 10)].title"),
    ).toEqual(["Sayings of the Century", "Moby Dick"]);
  });

  it("handles recursive descent + filter", () => {
    const result = JSONPath.query(data, "$..book[?(@.price > 20)].title");
    expect(result).toEqual(["The Lord of the Rings"]);
  });
});
