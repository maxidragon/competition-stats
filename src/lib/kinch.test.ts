import { describe, expect, it } from "vitest";
import { competition, event, person, result, round } from "./__fixtures__/builder";
import { calculateKinch, multiBlindWorth, type KinchResult } from "./kinch";
import type { Event, RegistrantId, ResultValue } from "./wcif";

/**
 * Every competition here is invented, and every expectation is worked out by
 * hand. Times are in centiseconds, so 800 is 8.00.
 */

const NAMES = ["Ada Alder", "Ben Birch", "Cy Cedar", "Di Dogwood"];

/** Kinch of a competition with the given events and one person per registrant id used. */
const kinchOf = (...events: Event[]): KinchResult => {
  const ids = new Set(
    events.flatMap(({ rounds }) => rounds.flatMap(({ results }) => results.map((r) => r.personId)))
  );
  return calculateKinch(
    competition({
      persons: [...ids].map((registrantId) =>
        person({ registrantId, name: NAMES[registrantId - 1] })
      ),
      events,
    })
  );
};

/** A result with the given best and average; the attempts do not matter to Kinch. */
const entry = (
  personId: RegistrantId,
  ranking: number,
  { best, average = 0 }: { best: ResultValue; average?: ResultValue }
) => result(personId, [best], { ranking, best, average });

/** A result whose single and average are the same. */
const avg = (personId: RegistrantId, ranking: number, average: ResultValue) =>
  entry(personId, ranking, { best: average, average });

const rowOf = ({ results }: KinchResult, registrantId: RegistrantId) => {
  const row = results.find(({ person }) => person.registrantId === registrantId);
  if (!row) throw new Error(`No Kinch row for registrant ${registrantId}`);
  return row;
};

const scoreOf = (kinch: KinchResult, registrantId: RegistrantId, eventId: string) =>
  rowOf(kinch, registrantId).scores[eventId];

/**
 * 3x3x3 in two rounds. Round 1: Ada 8.00, Ben 9.00, Cy 10.00, Di 12.00; the
 * top three advance. Final: Ben 5.00, Ada 10.00, Cy 20.00.
 */
const twoRound333 = event("333", [
  round("333-r1", [avg(1, 1, 800), avg(2, 2, 900), avg(3, 3, 1000), avg(4, 4, 1200)]),
  round("333-r2", [avg(2, 1, 500), avg(1, 2, 1000), avg(3, 3, 2000)]),
]);

describe("calculateKinch", () => {
  describe("round score", () => {
    it("scores a one-round event as best ÷ yours", () => {
      const kinch = kinchOf(
        event("333", [round("333-r1", [avg(1, 1, 1000), avg(2, 2, 1250), avg(3, 3, 2000)])])
      );
      expect(scoreOf(kinch, 1, "333")).toEqual({ score: 100, competed: true });
      expect(scoreOf(kinch, 2, "333").score).toBeCloseTo(80, 10);
      expect(scoreOf(kinch, 3, "333").score).toBeCloseTo(50, 10);
    });

    it("scores someone knocked out against their own round's best, not the final's", () => {
      // Round 1: Ada 8.00, Ben 9.00. Final: Ada 4.00.
      const kinch = kinchOf(
        event("333", [
          round("333-r1", [avg(1, 1, 800), avg(2, 2, 900)]),
          round("333-r2", [avg(1, 1, 400)]),
        ])
      );
      expect(scoreOf(kinch, 2, "333").score).toBeCloseTo((100 * 800) / 900, 10);
      expect(scoreOf(kinch, 2, "333").score.toFixed(2)).toBe("88.89");
      expect(scoreOf(kinch, 1, "333").score).toBe(100);
    });

    it("gives 0 in a round to someone cut off before an average", () => {
      const kinch = kinchOf(
        event("444", [
          round("444-r1", [avg(1, 1, 5000), entry(2, 2, { best: 7000, average: 0 })], {
            cutoff: { numberOfAttempts: 2, resultValue: 6500 },
          }),
        ])
      );
      expect(scoreOf(kinch, 2, "444")).toEqual({ score: 0, competed: true });
    });

    it("scores blindfolded on the single only, so a good mean does not help", () => {
      const kinch = kinchOf(
        event("333bf", [
          round(
            "333bf-r1",
            [
              entry(1, 1, { best: 2400, average: -1 }),
              // The best mean, but the single is what counts: 24.00 / 30.00.
              entry(2, 2, { best: 3000, average: 3200 }),
              entry(3, 3, { best: 6000, average: 6400 }),
            ],
            { format: "3" }
          ),
        ])
      );
      expect(scoreOf(kinch, 1, "333bf").score).toBe(100);
      expect(scoreOf(kinch, 2, "333bf").score).toBeCloseTo(80, 10);
      expect(scoreOf(kinch, 3, "333bf").score).toBeCloseTo(40, 10);
    });

    it("scores Fewest Moves on the single only", () => {
      const kinch = kinchOf(
        event("333fm", [
          round(
            "333fm-r1",
            [entry(1, 1, { best: 20, average: -1 }), entry(2, 2, { best: 24, average: 2400 })],
            { format: "m" }
          ),
        ])
      );
      expect(scoreOf(kinch, 1, "333fm").score).toBe(100);
      expect(scoreOf(kinch, 2, "333fm").score).toBeCloseTo((100 * 20) / 24, 10);
    });

    it("scores 6x6x6 on the mean, not the single", () => {
      const kinch = kinchOf(
        event("666", [
          round(
            "666-r1",
            [
              entry(2, 1, { best: 10000, average: 10000 }),
              // The best single, but the mean counts: 100.00 / 120.00.
              entry(1, 2, { best: 9000, average: 12000 }),
            ],
            { format: "m" }
          ),
        ])
      );
      expect(scoreOf(kinch, 2, "666").score).toBe(100);
      expect(scoreOf(kinch, 1, "666").score).toBeCloseTo((100 * 10000) / 12000, 10);
    });

    it("scores Multi-Blind as your worth ÷ the best worth", () => {
      const kinch = kinchOf(
        event("333mbf", [
          round(
            "333mbf-r1",
            [
              // 6/7 in 30:00: 5 points, worth 5.5.
              entry(1, 1, { best: 940180001 }),
              // 2/2 with an unknown time: worth exactly 2.
              entry(2, 2, { best: 979999900 }),
              entry(3, 3, { best: -1 }),
            ],
            { format: "1" }
          ),
        ])
      );
      expect(scoreOf(kinch, 1, "333mbf").score).toBe(100);
      expect(scoreOf(kinch, 2, "333mbf").score).toBeCloseTo((100 * 2) / 5.5, 10);
      expect(scoreOf(kinch, 3, "333mbf")).toEqual({ score: 0, competed: true });
    });

    it("falls back to the single in a stage where nobody has a valid average", () => {
      // 6x6x6 held as best of 2: 110.00 and 137.50.
      const kinch = kinchOf(
        event("666", [
          round("666-r1", [entry(1, 1, { best: 11000 }), entry(2, 2, { best: 13750 })], {
            format: "2",
          }),
        ])
      );
      expect(scoreOf(kinch, 1, "666").score).toBe(100);
      expect(scoreOf(kinch, 2, "666").score).toBeCloseTo(80, 10);
    });

    it("scores any other event on the average or the single by the round's format", () => {
      const results = [
        entry(1, 1, { best: 1000, average: 2000 }),
        entry(2, 2, { best: 1500, average: 1600 }),
      ];
      const averaged = kinchOf(event("fto", [round("fto-r1", results, { format: "a" })]));
      expect(scoreOf(averaged, 2, "fto").score).toBe(100);
      expect(scoreOf(averaged, 1, "fto").score).toBeCloseTo(80, 10);

      const bestOf3 = kinchOf(event("fto", [round("fto-r1", results, { format: "3" })]));
      expect(scoreOf(bestOf3, 1, "fto").score).toBe(100);
      expect(scoreOf(bestOf3, 2, "fto").score).toBeCloseTo((100 * 1000) / 1500, 10);
    });
  });

  describe("event score", () => {
    it("scores finalists with a floor of the last advancer's round-1 score", () => {
      const kinch = kinchOf(twoRound333);
      // Floor: Cy, the last to advance, scored 8.00 / 10.00 = 0.8 in round 1.
      // Ben won the final.
      expect(scoreOf(kinch, 2, "333").score).toBe(100);
      // Ada: 5.00 / 10.00 = 0.5 in the final, so 0.5 × 0.2 + 0.8 = 0.9.
      expect(scoreOf(kinch, 1, "333").score).toBeCloseTo(90, 10);
      expect(scoreOf(kinch, 1, "333").score.toFixed(2)).toBe("90.00");
      // Cy: 0.25 × 0.2 + 0.8 = 0.85, never below his own floor.
      expect(scoreOf(kinch, 3, "333").score).toBeCloseTo(85, 10);
      // Di was knocked out in round 1: 8.00 / 12.00.
      expect(scoreOf(kinch, 4, "333").score).toBeCloseTo((100 * 800) / 1200, 10);
    });

    it("stacks floors round by round", () => {
      // Round 1: Ada 8.00, Ben 10.00, Cy 12.50, Di 16.00; three advance.
      // Round 2: Ben 9.00, Ada 10.00, Cy 18.00; two advance.
      // Final: Ben 6.00, Ada 12.00.
      const kinch = kinchOf(
        event("333", [
          round("333-r1", [avg(1, 1, 800), avg(2, 2, 1000), avg(3, 3, 1250), avg(4, 4, 1600)]),
          round("333-r2", [avg(2, 1, 900), avg(1, 2, 1000), avg(3, 3, 1800)]),
          round("333-r3", [avg(2, 1, 600), avg(1, 2, 1200)]),
        ])
      );
      // Round 2 floor: Cy's round 1, 8.00 / 12.50 = 0.64.
      // Cy in round 2: 0.5 × 0.36 + 0.64 = 0.82.
      expect(scoreOf(kinch, 3, "333").score).toBeCloseTo(82, 10);
      // Final floor: Ada's round 2, 0.9 × 0.36 + 0.64 = 0.964.
      // Ada in the final: 0.5 × 0.036 + 0.964 = 0.982.
      expect(scoreOf(kinch, 1, "333").score).toBeCloseTo(98.2, 10);
      expect(scoreOf(kinch, 2, "333").score).toBe(100);
      expect(scoreOf(kinch, 4, "333").score).toBeCloseTo(50, 10);
    });

    it("gives a finalist with a DNF average exactly the floor", () => {
      // Round 1: Ada 8.00, Ben 10.00. Final: Ada 9.00, Ben DNF.
      const kinch = kinchOf(
        event("333", [
          round("333-r1", [avg(1, 1, 800), avg(2, 2, 1000)]),
          round("333-r2", [avg(1, 1, 900), entry(2, 2, { best: 1000, average: -1 })]),
        ])
      );
      expect(scoreOf(kinch, 2, "333")).toEqual({ score: expect.closeTo(80, 10), competed: true });
      expect(scoreOf(kinch, 1, "333").score).toBe(100);
    });

    it("treats a Dual Round as one stage, with each person's better result and best ranking", () => {
      // Rounds 1 and 2 are linked. Ada's round 1 entry carries a worse ranking
      // than her round 2 one; the stage uses the best. Combined: Ada 9.00 (r2),
      // Ben 10.00, Cy 13.00 (better than his 14.00 in r2). Ada and Ben advance.
      // Final: Ada 8.00, Ben 10.00.
      const linkedRounds = ["333-r1", "333-r2"];
      const kinch = kinchOf(
        event("333", [
          round("333-r1", [avg(1, 3, 1500), avg(2, 2, 1000), avg(3, 3, 1300)], { linkedRounds }),
          round("333-r2", [avg(1, 1, 900), avg(3, 3, 1400)], { linkedRounds }),
          round("333-r3", [avg(1, 1, 800), avg(2, 2, 1000)]),
        ])
      );
      // Cy, out after the Dual Round, against its best: 9.00 / 13.00.
      expect(scoreOf(kinch, 3, "333").score).toBeCloseTo((100 * 900) / 1300, 10);
      // Final floor: Ben, ranked 2nd in the stage, scored 9.00 / 10.00 = 0.9.
      // Ben in the final: 0.8 × 0.1 + 0.9 = 0.98.
      expect(scoreOf(kinch, 2, "333").score).toBeCloseTo(98, 10);
      expect(scoreOf(kinch, 1, "333").score).toBe(100);
    });
  });

  describe("competition score", () => {
    it("gives 0 for an event not entered, marked as not competed, and counts it in the mean", () => {
      const kinch = kinchOf(
        event("333", [round("333-r1", [avg(1, 1, 1000), avg(2, 2, 2000)])]),
        event("222", [round("222-r1", [avg(1, 1, 500)])])
      );
      expect(scoreOf(kinch, 2, "222")).toEqual({ score: 0, competed: false });
      expect(rowOf(kinch, 2).value).toBeCloseTo(25, 10);
      expect(rowOf(kinch, 1).value).toBe(100);
    });

    it("shares a position between exactly tied values and lists them by name", () => {
      // 3x3x3: Ben 10.00, Ada 20.00, Cy 40.00. 2x2x2: Ada 4.00, Ben 8.00, Cy 8.00.
      const kinch = kinchOf(
        event("333", [round("333-r1", [avg(2, 1, 1000), avg(1, 2, 2000), avg(3, 3, 4000)])]),
        event("222", [round("222-r1", [avg(1, 1, 400), avg(2, 2, 800), avg(3, 2, 800)])])
      );
      expect(
        kinch.results.map(({ person, value, position }) => [person.name, value, position])
      ).toEqual([
        ["Ada Alder", 75, 1],
        ["Ben Birch", 75, 1],
        ["Cy Cedar", 37.5, 3],
      ]);
    });

    it("ranks a small competition by the mean over every event held", () => {
      const kinch = kinchOf(
        twoRound333,
        event("222", [round("222-r1", [avg(3, 1, 500), avg(1, 2, 1000)])]),
        event("333bf", [
          round(
            "333bf-r1",
            [entry(4, 1, { best: 2000 }), entry(1, 2, { best: 3000 }), entry(2, 3, { best: -1 })],
            { format: "3" }
          ),
        ]),
        // Not started yet, so not held.
        event("555", [round("555-r1", [])])
      );

      expect(kinch.eventIds).toEqual(["333", "222", "333bf"]);
      expect(
        kinch.results.map(({ person, value, position }) => [person.name, value, position])
      ).toEqual([
        // 90 + 50 + 66.67
        ["Ada Alder", expect.closeTo((90 + 50 + 200 / 3) / 3, 10), 1],
        // 85 + 100 + 0 (did not enter 3BLD)
        ["Cy Cedar", expect.closeTo((85 + 100) / 3, 10), 2],
        // 66.67 + 0 (did not enter 2x2x2) + 100
        ["Di Dogwood", expect.closeTo((200 / 3 + 100) / 3, 10), 3],
        // 100 + 0 (did not enter) + 0 (DNF)
        ["Ben Birch", expect.closeTo(100 / 3, 10), 4],
      ]);
      expect(scoreOf(kinch, 2, "333bf")).toEqual({ score: 0, competed: true });
      expect(scoreOf(kinch, 3, "333bf")).toEqual({ score: 0, competed: false });
    });
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
