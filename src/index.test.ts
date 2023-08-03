import { head, second } from "https://deno.land/x/gamla@11.0.0/src/index.ts";
import { index } from "./index.ts";
import { assertEquals } from "https://deno.land/std@0.174.0/testing/asserts.ts";

Deno.test("index", () => {
  type Element = [number, number, number];
  const { build, query, insert } = index<Element, number, Element[]>(
    [head<Element>, second<Element>],
    (x, y) => {
      x.push(y);
      return x;
    },
    () => [],
  );
  const queryDb = query(
    insert(build(), [
      [1, 2, 8],
      [3, 4, 7],
      [1, 2, 5],
    ]),
  );
  assertEquals(queryDb([3, 4]), [[3, 4, 7]]);
  assertEquals(queryDb([1, 2]), [
    [1, 2, 8],
    [1, 2, 5],
  ]);
  assertEquals(queryDb([9, 15]), []);
});
