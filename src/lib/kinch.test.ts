import { describe, expect, it } from "vitest";
import {
  KINCH,
  MIXED,
  kinchCompetition,
  kinchTiesCompetition,
  mixedCompetition,
} from "./__fixtures__/scenarios";
import { calculateKinch, multiBlindWorth, type KinchResult } from "./kinch";
import type { RegistrantId } from "./wcif";

const rowOf = ({ results }: KinchResult, registrantId: RegistrantId) => {
  const row = results.find(({ person }) => person.registrantId === registrantId);
  if (!row) throw new Error(`No Kinch row for registrant ${registrantId}`);
  return row;
};

/** Every expectation below is worked out by hand from the fixtures. */
describe("calculateKinch", () => {
  describe("in a competition with the awkward cases", () => {
    const kinch = calculateKinch(mixedCompetition);
    const score = (registrantId: RegistrantId, eventId: string) =>
      rowOf(kinch, registrantId).scores[eventId];

    it("counts every event with a ranked result, in official order", () => {
      // 5x5x5 has no results yet.
      expect(kinch.eventIds).toEqual(["333", "444", "333fm", "444bf", "333mbf"]);
    });

    it("scores most events as 100 × the best average at the competition ÷ yours", () => {
      // Best 4x4x4 average: Alice's 52.00.
      expect(score(MIXED.alice, "444")).toEqual({ score: 100, competed: true });
      expect(score(MIXED.dan, "444").score).toBeCloseTo((100 * 5200) / 6000, 10);
    });

    it("takes the best result across rounds, counting both rounds of a Dual Round", () => {
      // Bob averaged 15.00 in r1, improved to 10.00 in the linked r2 and to
      // 9.00 in the final, which is the best average at the competition.
      expect(score(MIXED.bob, "333").score).toBe(100);
      // Alice: 12.00 in r1, 10.00 in the final.
      expect(score(MIXED.alice, "333").score).toBeCloseTo((100 * 900) / 1000, 10);
      // Dan only has his Dual Round r1 average.
      expect(score(MIXED.dan, "333").score).toBeCloseTo((100 * 900) / 1300, 10);
    });

    it("gives 0 to a competitor who was cut off and has no average", () => {
      expect(score(MIXED.carol, "444")).toEqual({ score: 0, competed: true });
    });

    it("gives 0 to everyone in an event nobody solved", () => {
      expect(score(MIXED.alice, "444bf")).toEqual({ score: 0, competed: true });
      expect(score(MIXED.dan, "444bf")).toEqual({ score: 0, competed: true });
    });

    it("gives 0 for an event not entered, marked as not competed", () => {
      expect(score(MIXED.bob, "444")).toEqual({ score: 0, competed: false });
      expect(score(MIXED.carol, "333fm")).toEqual({ score: 0, competed: false });
    });

    it("compares Fewest Moves singles with singles and means (×100) with means", () => {
      // Bob has both the best single (27) and the best mean (28.67).
      expect(score(MIXED.bob, "333fm").score).toBe(100);
      // Alice has no mean, so her single counts: 27 / 28.
      expect(score(MIXED.alice, "333fm").score).toBeCloseTo((100 * 27) / 28, 10);
    });

    it("scores a Multi-Blind DNF as 0", () => {
      expect(score(MIXED.bob, "333mbf").score).toBe(100);
      expect(score(MIXED.carol, "333mbf")).toEqual({ score: 0, competed: true });
    });

    it("averages over every event held, including the ones not entered", () => {
      expect(
        kinch.results.map(({ person, value, position }) => ({
          name: person.name,
          value,
          position,
        }))
      ).toEqual([
        // 100 + 0 + 100 + 0 + 100
        { name: "Bob Sample", value: 60, position: 1 },
        // 90 + 100 + 96.43 + 0 + 0
        {
          name: "Alice Example",
          value: expect.closeTo((90 + 100 + (100 * 27) / 28) / 5, 10),
          position: 2,
        },
        // 69.23 + 86.67 + 81.82 + 0 + 0
        {
          name: "Dan Placeholder",
          value: expect.closeTo(
            ((100 * 900) / 1300 + (100 * 5200) / 6000 + (100 * 27) / 33) / 5,
            10
          ),
          position: 3,
        },
        // 40.91 + 0 + 0 + 0 + 0
        { name: "Carol Test", value: expect.closeTo((100 * 900) / 2200 / 5, 10), position: 4 },
      ]);
    });
  });

  describe("in a competition with blindfolded, Fewest Moves, Multi-Blind and best-of-X events", () => {
    const kinch = calculateKinch(kinchCompetition);
    const score = (registrantId: RegistrantId, eventId: string) =>
      rowOf(kinch, registrantId).scores[eventId].score;

    it("scores on singles in an event where nobody has an average", () => {
      expect(score(KINCH.kim, "666")).toBe(100);
      expect(score(KINCH.lou, "666")).toBeCloseTo(80, 10);
      expect(score(KINCH.nia, "666")).toBeCloseTo(50, 10);
      expect(score(KINCH.max, "666")).toBe(0);
    });

    it("scores blindfolded on the better of single and mean", () => {
      // Best single without a mean.
      expect(score(KINCH.lou, "333bf")).toBe(100);
      // Single 80, mean 100.
      expect(score(KINCH.kim, "333bf")).toBe(100);
      // Single 40, mean 50.
      expect(score(KINCH.max, "333bf")).toBeCloseTo(50, 10);
    });

    it("scores Fewest Moves on the better of single and mean, in matching units", () => {
      expect(score(KINCH.lou, "333fm")).toBe(100);
      // Single 20 / 24 = 83.33, mean 24.00 is the best: 100.
      expect(score(KINCH.max, "333fm")).toBe(100);
      // Single 20 / 25 and mean 2400 / 3000 are both 80.
      expect(score(KINCH.kim, "333fm")).toBeCloseTo(80, 10);
    });

    it("scores Multi-Blind on worth, ignoring old-format results", () => {
      // 5.5 is the best worth; Lou's unknown time leaves him at exactly 2.
      expect(score(KINCH.kim, "333mbf")).toBe(100);
      expect(score(KINCH.lou, "333mbf")).toBeCloseTo((100 * 2) / 5.5, 10);
      expect(rowOf(kinch, KINCH.max).scores["333mbf"]).toEqual({ score: 0, competed: true });
    });

    it("ranks by the mean over all four events", () => {
      expect(kinch.eventIds).toEqual(["666", "333bf", "333fm", "333mbf"]);
      expect(
        kinch.results.map(({ person, value, position }) => [person.name, value, position])
      ).toEqual([
        ["Kim Koala", 95, 1],
        ["Lou Lynx", expect.closeTo((80 + 100 + 100 + (100 * 2) / 5.5) / 4, 10), 2],
        ["Max Moose", 37.5, 3],
        ["Nia Newt", 12.5, 4],
      ]);
    });
  });

  it("shares a position between exactly tied values and lists them by name", () => {
    const kinch = calculateKinch(kinchTiesCompetition);
    expect(
      kinch.results.map(({ person, value, position }) => [person.name, value, position])
    ).toEqual([
      ["Oz Otter", 75, 1],
      ["Pia Puffin", 75, 1],
      ["Quinn Quail", 37.5, 3],
    ]);
  });
});

describe("multiBlindWorth", () => {
  it("decodes points and time from 0DDTTTTTMM", () => {
    // 2 points (3/4) in 6:00.
    expect(multiBlindWorth(970036001)).toBeCloseTo(2 + 3240 / 3600, 10);
    // 5 points (6/7) in 30:00.
    expect(multiBlindWorth(940180001)).toBe(5.5);
  });

  it("counts an unknown time as a full hour", () => {
    expect(multiBlindWorth(979999900)).toBe(2);
  });

  it("does not count DNF, DNS, empty, zero-point or old-format results", () => {
    expect(multiBlindWorth(-1)).toBeNull();
    expect(multiBlindWorth(-2)).toBeNull();
    expect(multiBlindWorth(0)).toBeNull();
    // 0 points (1/2) in 10:00.
    expect(multiBlindWorth(990060001)).toBeNull();
    expect(multiBlindWorth(1970203600)).toBeNull();
  });
});
