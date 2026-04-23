/**
 * ✅ Correct JSONQuery pipeline patterns.
 */
import { JSONQuery } from "@ecosy/json";

const data = {
  user: { name: "Ken Nguyen", email: "ken@example.com" },
  cart: {
    items: [
      { name: "Widget", price: 9.99, qty: 2 },
      { name: "Gadget", price: 24.99, qty: 1 },
    ],
  },
  config: { theme: null },
};

// ✅ Pipes for display formatting
JSONQuery.evaluate(data, "$.user.name | uppercase");
// "KEN NGUYEN"

// ✅ Aggregation with pipe
JSONQuery.evaluate(data, "SUM($.cart.items[*].price) | currency('$')");

// ✅ Fallback for missing values
JSONQuery.evaluate(data, "$.config.theme ?? $.config.defaultTheme ?? 'light'");
// "light"

// ✅ String interpolation
JSONQuery.evaluate(
  data,
  "`{$.user.name} has {COUNT($.cart.items[*])} items totaling {SUM($.cart.items[*].price) | currency('$')}`",
);

// ✅ Auto-root shorthand
JSONQuery.evaluate(data, "user.email | lowercase");
// equivalent to $.user.email | lowercase

// ✅ Instance binding for reactive use
const q = new JSONQuery();
q.set(data);
q.eval("$.user.name");
q.eval("SUM($.cart.items[*].price)");
