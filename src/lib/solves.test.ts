import { describe, expect, it } from "vitest";
import { MIXED, mixedCompetition } from "./__fixtures__/scenarios";
import { solveCounts, solvesRows } from "./solves";

describe("solveCounts", () => {
  const counts = solveCounts(mixedCompetition);

  it("counts every round, including both rounds of a Dual Round", () => {
    // 3x3x3 r1, r2 and the final, 3 Fewest Moves attempts and 1 Multi-Blind.
    expect(counts.get(MIXED.bob)).toEqual({ attempted: 19, completed: 19 });
  });

  it("counts DNF and DNS as attempted but not completed", () => {
    // 3x3x3 r1 and final: 10/10; 4x4x4: 5/5; Fewest Moves 28, 31, DNF: 3/2;
    // 4x4x4 Blindfolded, all DNF: 3/0.
    expect(counts.get(MIXED.alice)).toEqual({ attempted: 21, completed: 17 });
    // 3x3x3 with a DNS: 5/4; 4x4x4: 5/5; Fewest Moves DNS, 35, 33: 3/2;
    // 4x4x4 Blindfolded DNF, DNS, DNS: 3/0.
    expect(counts.get(MIXED.dan)).toEqual({ attempted: 16, completed: 11 });
  });

  it("does not count the empty attempts left after a missed cutoff", () => {
    // 3x3x3 with a DNF: 5/4; 4x4x4 cut off after two: 2/2; Multi-Blind DNF: 1/0.
    expect(counts.get(MIXED.carol)).toEqual({ attempted: 8, completed: 6 });
  });

  it("has no entry for people without results", () => {
    expect(counts.has(MIXED.eve)).toBe(false);
    expect(counts.has(MIXED.frank)).toBe(false);
  });
});

describe("solvesRows", () => {
  it("lists every accepted registration with its event count, with zero solves for those without results", () => {
    const rows = solvesRows(mixedCompetition).map(
      ({ person, events, attempted, completed }) => ({
        name: person.name,
        events,
        attempted,
        completed,
      })
    );
    expect(rows).toEqual([
      { name: "Alice Example", events: 4, attempted: 21, completed: 17 },
      { name: "Bob Sample", events: 3, attempted: 19, completed: 19 },
      { name: "Carol Test", events: 4, attempted: 8, completed: 6 },
      { name: "Dan Placeholder", events: 4, attempted: 16, completed: 11 },
      { name: "Eve Noshow", events: 2, attempted: 0, completed: 0 },
      { name: "Frank Staff", events: 0, attempted: 0, completed: 0 },
    ]);
  });
});
