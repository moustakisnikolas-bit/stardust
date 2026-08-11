import { describe, expect, it } from "vitest";
import { orderPair } from "./pairOrdering.js";

describe("orderPair", () => {
  it("is order-independent", () => {
    const a = orderPair("user-x", "user-y");
    const b = orderPair("user-y", "user-x");
    expect(a).toEqual(b);
  });

  it("always puts the lexicographically smaller id first", () => {
    expect(orderPair("b", "a")).toEqual({ userAId: "a", userBId: "b" });
    expect(orderPair("a", "b")).toEqual({ userAId: "a", userBId: "b" });
  });
});
