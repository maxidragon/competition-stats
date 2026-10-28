import { describe, expect, it } from "vitest";
import { rankWithTies } from "./rank";

const positions = (values: number[]) =>
  rankWithTies(values, (previous, current) => previous === current).map(
    ({ position }) => position
  );

describe("rankWithTies", () => {
  it("numbers rows without ties from 1", () => {
    expect(positions([5, 4, 3])).toEqual([1, 2, 3]);
  });

  it("gives tied rows the same position and skips the tied places", () => {
    expect(positions([9, 7, 7, 3])).toEqual([1, 2, 2, 4]);
  });

  it("handles a tie at the top and a tie spanning the whole list", () => {
    expect(positions([8, 8, 6])).toEqual([1, 1, 3]);
    expect(positions([2, 2, 2])).toEqual([1, 1, 1]);
  });

  it("compares each row with the one before it, not with the group's first", () => {
    const ranked = rankWithTies(
      [10, 9, 8, 7],
      (previous, current) => previous - current <= 1
    );
    expect(ranked.map(({ position }) => position)).toEqual([1, 1, 1, 1]);
  });

  it("keeps the rows and returns nothing for an empty list", () => {
    expect(rankWithTies(["a", "b"], () => false)).toEqual([
      { row: "a", position: 1 },
      { row: "b", position: 2 },
    ]);
    expect(rankWithTies([], () => true)).toEqual([]);
  });
});
