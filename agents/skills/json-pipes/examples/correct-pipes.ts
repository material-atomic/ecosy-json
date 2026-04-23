/**
 * ✅ Correct pipe usage patterns.
 */
import { JSONQuery } from "@ecosy/json";

const data = {
  user: { name: "Ken Nguyen", bio: "" },
  product: { price: 29.99, tags: ["electronics", "sale", "featured"] },
  event: { date: "2026-04-22T10:00:00Z" },
};

// ✅ Built-in pipes
JSONQuery.evaluate(data, "$.user.name | uppercase");          // "KEN NGUYEN"
JSONQuery.evaluate(data, "$.user.name | lowercase");          // "ken nguyen"
JSONQuery.evaluate(data, "$.product.price | currency('$')");  // "29.99$"
JSONQuery.evaluate(data, "$.event.date | date('en-US')");     // localized date
JSONQuery.evaluate(data, "$.product | json(2)");              // JSON string
JSONQuery.evaluate(data, "$.user.bio | default('No bio')");   // "No bio"
JSONQuery.evaluate(data, "$.product.tags | limit(2)");        // ["electronics", "sale"]
JSONQuery.evaluate(data, "$.product.tags | join(', ')");      // "electronics, sale, featured"

// ✅ Chaining pipes
JSONQuery.evaluate(data, "$.product.tags | limit(2) | join(' + ')");

// ✅ Custom pipe registration
JSONQuery.registerPipe("slug", (v) =>
  String(v).toLowerCase().replace(/\s+/g, "-"),
);
JSONQuery.evaluate(data, "$.user.name | slug"); // "ken-nguyen"

// ✅ In string interpolation
JSONQuery.evaluate(data, "`Name: {$.user.name | uppercase}`");
