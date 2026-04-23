/**
 * ✅ Correct filter expression patterns.
 */
import { JSONPath } from "@ecosy/json";

const data = {
  products: [
    { name: "Laptop", price: 999, tags: ["electronics", "featured"], active: true },
    { name: "Pen", price: 2.5, tags: ["office"], active: true },
    { name: "Phone", price: 599, tags: ["electronics", "sale"], active: false },
  ],
};

// ✅ Basic comparison with @
JSONPath.query(data, "$.products[?(@.price < 100)]");

// ✅ Logical AND
JSONPath.query(data, "$.products[?(@.price > 100 && @.active == true)]");

// ✅ Logical OR
JSONPath.query(data, "$.products[?(@.price < 10 || @.active == false)]");

// ✅ Wildcard inside filter (cross-product match)
JSONPath.query(data, "$.products[?(@.tags[*] == 'electronics')].name");
// ["Laptop", "Phone"]

// ✅ String equality
JSONPath.query(data, "$.products[?(@.name == 'Laptop')]");

// ✅ Extract specific field from filtered results
JSONPath.query(data, "$.products[?(@.active == true)].name");
// ["Laptop", "Pen"]
