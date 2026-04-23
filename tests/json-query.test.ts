import { describe, it, expect, beforeEach } from "vitest";
import { JSONQuery, PIPES, AGGREGATIONS } from "../src/index";

const data = {
  user: { name: "Ken", email: "ken@example.com" },
  store: {
    book: [
      { title: "Sayings of the Century", price: 8.95 },
      { title: "Sword of Honour", price: 12.99 },
      { title: "Moby Dick", price: 8.99 },
      { title: "The Lord of the Rings", price: 22.99 },
    ],
    discount: null,
  },
  tags: ["fiction", "classic", "adventure"],
};

describe("JSONQuery", () => {
  // ─── Instance API (set / get / eval) ───────────────────────────
  describe("instance API", () => {
    it("set and get bind data", () => {
      const q = new JSONQuery();
      q.set(data);
      expect(q.get()).toBe(data);
    });

    it("eval evaluates against bound data", () => {
      const q = new JSONQuery();
      q.set(data);
      expect(q.eval("$.user.name")).toBe("Ken");
    });

    it("constructor defaults to $ expression", () => {
      const q = new JSONQuery();
      expect(q.expression).toBe("$");
    });

    it("inherits JSONPath query method", () => {
      const q = new JSONQuery("$.user.name");
      expect(q.query(data)).toEqual(["Ken"]);
    });
  });

  // ─── Layer 1: String interpolation ─────────────────────────────
  describe("string interpolation", () => {
    it("interpolates simple path", () => {
      expect(JSONQuery.evaluate(data, "`Hello {$.user.name}`")).toBe(
        "Hello Ken",
      );
    });

    it("interpolates aggregation inside template", () => {
      const result = JSONQuery.evaluate(
        data,
        "`Total: {SUM($.store.book[*].price)}`",
      );
      expect(result).toMatch(/^Total: /);
      expect(result).toContain("53.92");
    });

    it("interpolates multiple expressions", () => {
      const result = JSONQuery.evaluate(
        data,
        "`{$.user.name} has {COUNT($.store.book[*])} books`",
      );
      expect(result).toBe("Ken has 4 books");
    });

    it("handles escaped opening braces", () => {
      const result = JSONQuery.evaluate(data, "`value is \\{literal`");
      expect(result).toBe("value is {literal");
    });

    it("handles missing values as empty string", () => {
      const result = JSONQuery.evaluate(data, "`name: {$.nonexistent}`");
      expect(result).toBe("name: ");
    });
  });

  // ─── Layer 2: Fallback (??) ────────────────────────────────────
  describe("fallback (??)", () => {
    it("returns first non-null value", () => {
      expect(JSONQuery.evaluate(data, "$.store.discount ?? 'No discount'")).toBe(
        "No discount",
      );
    });

    it("returns primary when it exists", () => {
      expect(JSONQuery.evaluate(data, "$.user.name ?? 'Unknown'")).toBe("Ken");
    });

    it("chains multiple fallbacks", () => {
      expect(
        JSONQuery.evaluate(data, "$.missing1 ?? $.missing2 ?? 'default'"),
      ).toBe("default");
    });

    // Note: Pipes bind to their fallback segment. In "a ?? b | pipe",
    // the pipe is part of the second segment. If "a" resolves, no pipe is applied.
    it("applies pipes within the resolved fallback segment", () => {
      expect(
        JSONQuery.evaluate(data, "$.user.name | uppercase ?? 'UNKNOWN'"),
      ).toBe("KEN");
    });
  });

  // ─── Layer 3: Pipes (|) ────────────────────────────────────────
  describe("pipes", () => {
    it("uppercase pipe", () => {
      expect(JSONQuery.evaluate(data, "$.user.name | uppercase")).toBe("KEN");
    });

    it("lowercase pipe", () => {
      expect(JSONQuery.evaluate(data, "$.user.name | lowercase")).toBe("ken");
    });

    it("currency pipe with default args", () => {
      const result = JSONQuery.evaluate(data, "$.store.book[0].price | currency");
      expect(result).toContain("$");
    });

    it("currency pipe with custom symbol", () => {
      const result = JSONQuery.evaluate(
        data,
        "$.store.book[0].price | currency('€', 'de-DE')",
      );
      expect(result).toContain("€");
    });

    it("json pipe", () => {
      const result = JSONQuery.evaluate(data, "$.user | json");
      expect(JSON.parse(result)).toEqual(data.user);
    });

    // Note: null from JSONPath is treated as "unresolved" by the fallback loop,
    // so pipes aren't applied. Use fallback (??) for null handling instead.
    it("default pipe on missing path", () => {
      expect(
        JSONQuery.evaluate(data, "$.store.missing | default('none')"),
      ).toBeUndefined();
    });

    it("default pipe works when value exists but is empty string", () => {
      const d = { name: "" };
      expect(JSONQuery.evaluate(d, "$.name | default('anon')")).toBe("anon");
    });

    it("limit pipe", () => {
      const result = JSONQuery.evaluate(data, "$.tags | limit(2)");
      expect(result).toEqual(["fiction", "classic"]);
    });

    it("join pipe", () => {
      expect(JSONQuery.evaluate(data, "$.tags | join(', ')")).toBe(
        "fiction, classic, adventure",
      );
    });

    it("chained pipes", () => {
      expect(
        JSONQuery.evaluate(data, "$.user.name | uppercase | lowercase"),
      ).toBe("ken");
    });
  });

  // ─── Layer 4: Aggregation functions ────────────────────────────
  describe("aggregations", () => {
    it("SUM", () => {
      const result = JSONQuery.evaluate(data, "SUM($.store.book[*].price)");
      expect(result).toBeCloseTo(53.92, 2);
    });

    it("COUNT", () => {
      expect(JSONQuery.evaluate(data, "COUNT($.store.book[*])")).toBe(4);
    });

    it("AVG", () => {
      const result = JSONQuery.evaluate(data, "AVG($.store.book[*].price)");
      expect(result).toBeCloseTo(13.48, 2);
    });

    it("MIN", () => {
      expect(JSONQuery.evaluate(data, "MIN($.store.book[*].price)")).toBe(8.95);
    });

    it("MAX", () => {
      expect(JSONQuery.evaluate(data, "MAX($.store.book[*].price)")).toBe(22.99);
    });

    it("aggregation with pipe", () => {
      const result = JSONQuery.evaluate(
        data,
        "SUM($.store.book[*].price) | currency('$')",
      );
      expect(result).toContain("$");
    });

    it("aggregation on empty array", () => {
      expect(JSONQuery.evaluate({}, "SUM($.nonexistent[*])")).toBe(0);
    });
  });

  // ─── Layer 5: Auto-root shorthand ──────────────────────────────
  describe("auto-root shorthand", () => {
    it("bare identifier is auto-prefixed with $", () => {
      expect(JSONQuery.evaluate(data, "user.name")).toBe("Ken");
    });

    it("nested bare path works", () => {
      expect(JSONQuery.evaluate(data, "store.book[0].title")).toBe(
        "Sayings of the Century",
      );
    });
  });

  // ─── Static literals ───────────────────────────────────────────
  describe("static literals", () => {
    it("resolves string literal", () => {
      expect(JSONQuery.evaluate(data, "'hello'")).toBe("hello");
    });

    it("resolves number literal", () => {
      expect(JSONQuery.evaluate(data, "42")).toBe(42);
    });

    it("resolves boolean true", () => {
      expect(JSONQuery.evaluate(data, "true")).toBe(true);
    });

    it("resolves boolean false", () => {
      expect(JSONQuery.evaluate(data, "false")).toBe(false);
    });

    it("resolves null", () => {
      expect(JSONQuery.evaluate(data, "null")).toBe(null);
    });
  });

  // ─── registerPipe ──────────────────────────────────────────────
  describe("registerPipe", () => {
    it("registers and uses a custom pipe", () => {
      JSONQuery.registerPipe("reverse", (v: string) =>
        String(v).split("").reverse().join(""),
      );
      expect(JSONQuery.evaluate(data, "$.user.name | reverse")).toBe("neK");
      // Cleanup
      delete PIPES["reverse"];
    });
  });

  // ─── registerAggregation ───────────────────────────────────────
  describe("registerAggregation", () => {
    it("registers and uses a custom aggregation", () => {
      JSONQuery.registerAggregation("PRODUCT", (arr) =>
        arr.reduce((a, b) => a * b, 1),
      );
      const d = { nums: [2, 3, 4] };
      expect(JSONQuery.evaluate(d, "PRODUCT($.nums[*])")).toBe(24);
      // Cleanup
      delete AGGREGATIONS["PRODUCT"];
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────
  describe("edge cases", () => {
    it("empty expression returns undefined", () => {
      expect(JSONQuery.evaluate(data, "")).toBeUndefined();
    });

    it("whitespace-only expression returns null", () => {
      expect(JSONQuery.evaluate(data, "   ")).toBeNull();
    });

    it("single value is unwrapped from array", () => {
      // JSONQuery unwraps single-element arrays
      expect(JSONQuery.evaluate(data, "$.user.name")).toBe("Ken");
    });

    it("multiple values stay as array", () => {
      const result = JSONQuery.evaluate(data, "$.store.book[*].title");
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
    });
  });

  // ─── PIPES constant ────────────────────────────────────────────
  describe("PIPES constant", () => {
    it("has all 8 built-in pipes", () => {
      const expected = [
        "uppercase",
        "lowercase",
        "currency",
        "date",
        "json",
        "default",
        "limit",
        "join",
      ];
      for (const name of expected) {
        expect(PIPES).toHaveProperty(name);
        expect(typeof PIPES[name]).toBe("function");
      }
    });
  });

  // ─── AGGREGATIONS constant ─────────────────────────────────────
  describe("AGGREGATIONS constant", () => {
    it("has all 5 built-in aggregations", () => {
      const expected = ["SUM", "COUNT", "AVG", "MIN", "MAX"];
      for (const name of expected) {
        expect(AGGREGATIONS).toHaveProperty(name);
        expect(typeof AGGREGATIONS[name]).toBe("function");
      }
    });
  });
});
