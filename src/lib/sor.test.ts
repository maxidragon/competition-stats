import { describe, expect, it } from "vitest";
import { mixedCompetition, tiesCompetition } from "./__fixtures__/scenarios";
import { calculateSor, type SORResult } from "./sor";

/**
 * Characterization tests: they pin what calculateSor returns today, worked
 * out by hand from the fixtures, so refactoring it cannot change a ranking
 * unnoticed.
 */

const summarize = ({ results }: SORResult) =>
  results.map(({ person, value, position, rankings }) => ({
    name: person.name,
    value,
    position,
    rankings: Object.fromEntries(
      Object.entries(rankings).map(([eventId, { ranking, competed }]) => [
        eventId,
        competed ? ranking : `${ranking} (did not compete)`,
      ])
    ),
  }));

describe("calculateSor", () => {
  it("shares a position between tied sums and skips the tied places", () => {
    const sor = calculateSor(tiesCompetition);

    expect(sor.eventIds).toEqual(["333", "222"]);
    expect(summarize(sor)).toEqual([
      { name: "Ann Alpha", value: 3, position: 1, rankings: { "333": 1, "222": 2 } },
      { name: "Ben Beta", value: 3, position: 1, rankings: { "333": 2, "222": 1 } },
      { name: "Cid Gamma", value: 5, position: 3, rankings: { "333": 2, "222": 3 } },
      // Last place in 2x2x2 did not solve, so skipping it is worth the same.
      { name: "Dee Delta", value: 7, position: 4, rankings: { "333": 4, "222": "3 (did not compete)" } },
    ]);
  });

  it("ranks only accepted competitors who attended, across awkward events", () => {
    const sor = calculateSor(mixedCompetition);

    // In official order; 5x5x5 has no results yet and does not count.
    expect(sor.eventIds).toEqual(["333", "444", "333fm", "444bf", "333mbf"]);
    expect(summarize(sor)).toEqual([
      {
        name: "Alice Example",
        value: 8,
        position: 1,
        rankings: {
          // Latest stage reached: the final.
          "333": 2,
          "444": 1,
          "333fm": 2,
          "444bf": 1,
          // Last place (Carol) did not solve, so absentees share her ranking.
          "333mbf": "2 (did not compete)",
        },
      },
      {
        name: "Bob Sample",
        value: 8,
        position: 1,
        rankings: {
          "333": 1,
          // Last place (Carol) solved, so absentees go one behind.
          "444": "4 (did not compete)",
          "333fm": 1,
          // Nobody solved, so everyone ties first and absentees join them.
          "444bf": "1 (did not compete)",
          "333mbf": 1,
        },
      },
      {
        name: "Dan Placeholder",
        value: 11,
        position: 3,
        rankings: {
          // Dual Round: ranked together with r2, where Bob improved.
          "333": 3,
          "444": 2,
          "333fm": 3,
          "444bf": 1,
          "333mbf": "2 (did not compete)",
        },
      },
      {
        name: "Carol Test",
        value: 14,
        position: 4,
        rankings: {
          "333": 4,
          // Missed the cutoff, still ranked on her single.
          "444": 3,
          "333fm": "4 (did not compete)",
          "444bf": "1 (did not compete)",
          "333mbf": 2,
        },
      },
    ]);
  });
});
