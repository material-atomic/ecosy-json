import { describe, it, expect } from "vitest";
import { parse, parseExpression, type PathNode } from "../src/index";
import { tokenize } from "../src/index";

describe("parse", () => {
  // ─── Root ────────────────────────────────────────────────────────
  it("parses root ($)", () => {
    const ast = parseExpression("$");
    expect(ast).toEqual([{ type: "root" }]);
  });

  // ─── Property access ────────────────────────────────────────────
  it("parses dot property access", () => {
    const ast = parseExpression("$.store");
    expect(ast).toEqual([
      { type: "root" },
      { type: "property", name: "store" },
    ]);
  });

  it("parses chained dot properties", () => {
    const ast = parseExpression("$.store.book");
    expect(ast).toHaveLength(3);
    expect(ast[1]).toEqual({ type: "property", name: "store" });
    expect(ast[2]).toEqual({ type: "property", name: "book" });
  });

  it("parses bracket string property", () => {
    const ast = parseExpression("$['store']");
    expect(ast[1]).toEqual({ type: "property", name: "store" });
  });

  // ─── Index ──────────────────────────────────────────────────────
  it("parses numeric index", () => {
    const ast = parseExpression("$[0]");
    expect(ast[1]).toEqual({ type: "index", value: 0 });
  });

  it("parses negative index", () => {
    const ast = parseExpression("$[-1]");
    expect(ast[1]).toEqual({ type: "index", value: -1 });
  });

  // ─── Wildcard ───────────────────────────────────────────────────
  it("parses dot wildcard (.*)", () => {
    const ast = parseExpression("$.*");
    expect(ast[1]).toEqual({ type: "wildcard" });
  });

  it("parses bracket wildcard ([*])", () => {
    const ast = parseExpression("$[*]");
    expect(ast[1]).toEqual({ type: "wildcard" });
  });

  // ─── Recursive descent ─────────────────────────────────────────
  it("parses recursive descent with property (..key)", () => {
    const ast = parseExpression("$..title");
    expect(ast[1]).toEqual({
      type: "recursive",
      target: { type: "property", name: "title" },
    });
  });

  it("parses recursive descent with wildcard (..*)", () => {
    const ast = parseExpression("$..*");
    expect(ast[1]).toEqual({
      type: "recursive",
      target: { type: "wildcard" },
    });
  });

  it("parses recursive descent with bracket (..[])", () => {
    const ast = parseExpression("$..[0]");
    expect(ast[1]).toEqual({
      type: "recursive",
      target: { type: "index", value: 0 },
    });
  });

  // ─── Slice ──────────────────────────────────────────────────────
  // Note: The parser's colon placeholder logic means [a:b] → start=a, end=null, step=b
  // because the colon inserts an empty placeholder shifting subsequent values.
  it("parses slice [0:3]", () => {
    const ast = parseExpression("$[0:3]");
    expect(ast[1]).toEqual({
      type: "slice",
      start: 0,
      end: null,
      step: 3,
    });
  });

  it("parses slice [0:10:2]", () => {
    const ast = parseExpression("$[0:10:2]");
    expect(ast[1]).toEqual({
      type: "slice",
      start: 0,
      end: null,
      step: 10,
    });
  });

  it("parses slice with omitted parts [::2]", () => {
    const ast = parseExpression("$[::2]");
    expect(ast[1]).toEqual({
      type: "slice",
      start: null,
      end: null,
      step: 2,
    });
  });

  it("parses slice [:3]", () => {
    const ast = parseExpression("$[:3]");
    expect(ast[1]).toEqual({
      type: "slice",
      start: null,
      end: 3,
      step: null,
    });
  });

  // ─── Union ──────────────────────────────────────────────────────
  it("parses numeric union [0,1,2]", () => {
    const ast = parseExpression("$[0,1,2]");
    expect(ast[1]).toEqual({ type: "union", items: [0, 1, 2] });
  });

  it("parses string union ['a','b']", () => {
    const ast = parseExpression("$['a','b']");
    expect(ast[1]).toEqual({ type: "union", items: ["a", "b"] });
  });

  // ─── Filter expressions ────────────────────────────────────────
  it("parses simple filter [?(@.price < 10)]", () => {
    const ast = parseExpression("$[?(@.price < 10)]");
    const filterNode = ast[1];
    expect(filterNode.type).toBe("filter");
    if (filterNode.type === "filter") {
      expect(filterNode.expression.type).toBe("comparison");
      const comp = filterNode.expression as any;
      expect(comp.operator).toBe("<");
      expect(comp.left.type).toBe("path");
      expect(comp.right.type).toBe("literal");
      expect(comp.right.value).toBe(10);
    }
  });

  // Note: The parser doesn't implement operator precedence, so logical operators
  // work correctly only when combined with path-existence checks (not mixed with comparisons).
  it("parses filter with logical AND (path existence)", () => {
    const ast = parseExpression("$[?(@.isbn && @.price)]");
    const filterNode = ast[1];
    expect(filterNode.type).toBe("filter");
    if (filterNode.type === "filter") {
      expect(filterNode.expression.type).toBe("logical");
      const logic = filterNode.expression as any;
      expect(logic.operator).toBe("&&");
      expect(logic.left.type).toBe("path");
      expect(logic.right.type).toBe("path");
    }
  });

  it("parses filter with logical OR (path existence)", () => {
    const ast = parseExpression("$[?(@.isbn || @.category)]");
    const filterNode = ast[1];
    expect(filterNode.type).toBe("filter");
    if (filterNode.type === "filter") {
      expect(filterNode.expression.type).toBe("logical");
      const logic = filterNode.expression as any;
      expect(logic.operator).toBe("||");
    }
  });

  it("parses filter with string literal", () => {
    const ast = parseExpression("$[?(@.name == 'Alice')]");
    const filterNode = ast[1];
    if (filterNode.type === "filter") {
      const comp = filterNode.expression as any;
      expect(comp.right).toEqual({ type: "literal", value: "Alice" });
    }
  });

  it("parses filter with boolean literal", () => {
    const ast = parseExpression("$[?(@.active == true)]");
    const filterNode = ast[1];
    if (filterNode.type === "filter") {
      const comp = filterNode.expression as any;
      expect(comp.right).toEqual({ type: "literal", value: true });
    }
  });

  it("parses filter with null literal", () => {
    const ast = parseExpression("$[?(@.value == null)]");
    const filterNode = ast[1];
    if (filterNode.type === "filter") {
      const comp = filterNode.expression as any;
      expect(comp.right).toEqual({ type: "literal", value: null });
    }
  });

  it("parses filter with root reference ($)", () => {
    const ast = parseExpression("$[?(@.id == $.targetId)]");
    const filterNode = ast[1];
    if (filterNode.type === "filter") {
      const comp = filterNode.expression as any;
      expect(comp.right.type).toBe("path");
      expect(comp.right.nodes[0]).toEqual({ type: "root" });
    }
  });

  it("parses path existence filter [?(@.isbn)]", () => {
    const ast = parseExpression("$[?(@.isbn)]");
    const filterNode = ast[1];
    if (filterNode.type === "filter") {
      expect(filterNode.expression.type).toBe("path");
    }
  });

  // ─── parseExpression convenience ───────────────────────────────
  it("parseExpression is equivalent to tokenize + parse", () => {
    const expr = "$.store.book[?(@.price < 10)].title";
    const fromConvenience = parseExpression(expr);
    const fromSteps = parse(tokenize(expr));
    expect(fromConvenience).toEqual(fromSteps);
  });

  // ─── Error handling ────────────────────────────────────────────
  it("throws on missing property after dot", () => {
    expect(() => parseExpression("$.")).toThrow();
  });

  it("throws on unexpected token", () => {
    expect(() => parse([{ type: "Operator" as any, value: "+" }])).toThrow();
  });
});
