/**
 * ✅ Correct JSONPath usage patterns.
 */
import { JSONPath } from "@ecosy/json";

const data = {
  store: {
    book: [
      { title: "Moby Dick", price: 8.99 },
      { title: "The Great Gatsby", price: 12.50 },
      { title: "1984", price: 6.99 },
    ],
    bicycle: { color: "red", price: 19.95 },
  },
};

// ✅ Compile once, query many
const titlePath = new JSONPath("$.store.book[*].title");
const titles = titlePath.query<string>(data);
const count = titlePath.count(data);
const first = titlePath.first<string>(data);

// ✅ Use built-in methods instead of manual checks
const bookPath = new JSONPath("$.store.book[0]");
bookPath.exists(data);   // not: query().length > 0
bookPath.first(data);    // not: query()[0]
bookPath.count(data);    // not: query().length

// ✅ matches() when you need paths
const matches = titlePath.matches(data);
// [{ value: "Moby Dick", path: "$['store']['book'][0]['title']" }, ...]

// ✅ Static for one-shot queries
const allPrices = JSONPath.query<number>(data, "$..price");

// ✅ Iterate with map/forEach
titlePath.forEach(data, (title, path, i) => {
  console.log(`#${i}: ${title} at ${path}`);
});
