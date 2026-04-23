import { describe, it, expect } from "vitest";
import { tokenize, TokenType } from "../src/index";

describe("tokenize", () => {
  it("tokenizes root ($)", () => {
    const tokens = tokenize("$");
    expect(tokens).toEqual([{ type: TokenType.Root, value: "$" }]);
  });

  it("tokenizes dot property access", () => {
    const tokens = tokenize("$.store.book");
    expect(tokens).toHaveLength(5);
    expect(tokens[0].type).toBe(TokenType.Root);
    expect(tokens[1].type).toBe(TokenType.Dot);
    expect(tokens[2]).toEqual({ type: TokenType.Identifier, value: "store" });
    expect(tokens[4]).toEqual({ type: TokenType.Identifier, value: "book" });
  });

  it("tokenizes recursive descent (..)", () => {
    const tokens = tokenize("$..title");
    expect(tokens[1]).toEqual({ type: TokenType.DotDot, value: ".." });
    expect(tokens[2]).toEqual({ type: TokenType.Identifier, value: "title" });
  });

  it("tokenizes wildcard (*)", () => {
    const tokens = tokenize("$.*");
    expect(tokens[2]).toEqual({ type: TokenType.Wildcard, value: "*" });
  });

  it("tokenizes bracket notation", () => {
    const tokens = tokenize("$[0]");
    expect(tokens[1].type).toBe(TokenType.BracketOpen);
    expect(tokens[2]).toEqual({ type: TokenType.Number, value: "0" });
    expect(tokens[3].type).toBe(TokenType.BracketClose);
  });

  it("tokenizes negative numbers", () => {
    const tokens = tokenize("$[-1]");
    expect(tokens[2]).toEqual({ type: TokenType.Number, value: "-1" });
  });

  it("tokenizes string literals (single quotes)", () => {
    const tokens = tokenize("$['store']");
    expect(tokens[2]).toEqual({ type: TokenType.String, value: "store" });
  });

  it("tokenizes string literals (double quotes)", () => {
    const tokens = tokenize('$["store"]');
    expect(tokens[2]).toEqual({ type: TokenType.String, value: "store" });
  });

  it("tokenizes slice notation (:)", () => {
    const tokens = tokenize("$[0:3]");
    expect(tokens.some((t) => t.type === TokenType.Colon)).toBe(true);
  });

  it("tokenizes comma (union)", () => {
    const tokens = tokenize("$[0,1,2]");
    expect(tokens.filter((t) => t.type === TokenType.Comma)).toHaveLength(2);
  });

  it("tokenizes filter expression tokens", () => {
    const tokens = tokenize("$[?(@.price < 10)]");
    expect(tokens.some((t) => t.type === TokenType.Question)).toBe(true);
    expect(tokens.some((t) => t.type === TokenType.At)).toBe(true);
    expect(tokens.some((t) => t.type === TokenType.ParenOpen)).toBe(true);
    expect(tokens.some((t) => t.type === TokenType.ParenClose)).toBe(true);
    expect(tokens.some((t) => t.type === TokenType.Operator && t.value === "<")).toBe(true);
  });

  it("tokenizes comparison operators", () => {
    expect(tokenize("==")[0]).toEqual({ type: TokenType.Operator, value: "==" });
    expect(tokenize("!=")[0]).toEqual({ type: TokenType.Operator, value: "!=" });
    expect(tokenize("<=")[0]).toEqual({ type: TokenType.Operator, value: "<=" });
    expect(tokenize(">=")[0]).toEqual({ type: TokenType.Operator, value: ">=" });
    expect(tokenize("<")[0]).toEqual({ type: TokenType.Operator, value: "<" });
    expect(tokenize(">")[0]).toEqual({ type: TokenType.Operator, value: ">" });
  });

  it("tokenizes logical operators", () => {
    expect(tokenize("&&")[0]).toEqual({ type: TokenType.Operator, value: "&&" });
    expect(tokenize("||")[0]).toEqual({ type: TokenType.Operator, value: "||" });
  });

  it("skips whitespace", () => {
    const tokens = tokenize("$ . store");
    expect(tokens.every((t) => t.value.trim() === t.value)).toBe(true);
  });

  it("handles escaped characters in strings", () => {
    const tokens = tokenize("$['it\\'s']");
    expect(tokens[2]).toEqual({ type: TokenType.String, value: "it's" });
  });

  it("throws on unexpected character", () => {
    expect(() => tokenize("$~")).toThrow(/Unexpected character/);
  });
});
