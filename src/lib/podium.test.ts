import { describe, expect, it } from "vitest";
import { competition, event, person, result, round } from "./__fixtures__/builder";
import { podiumFinishers } from "./podium";

const persons = [1, 2, 3, 4, 5].map((registrantId) =>
  person({ registrantId, name: `Competitor ${registrantId}` })
);

const finishers = (...events: ReturnType<typeof event>[]) =>
  [...podiumFinishers(competition({ persons, events }))].sort();

describe("podiumFinishers", () => {
  it("takes the top three of an event's only round", () => {
    expect(
      finishers(
        event("333", [
          round("333-r1", [
            result(1, [800], { ranking: 1 }),
            result(2, [900], { ranking: 2 }),
            result(3, [1000], { ranking: 3 }),
            result(4, [1100], { ranking: 4 }),
          ]),
        ])
      )
    ).toEqual([1, 2, 3]);
  });

  it("counts only the final, not a top three in an earlier round", () => {
    expect(
      finishers(
        event("333", [
          round("333-r1", [
            result(4, [800], { ranking: 1 }),
            result(1, [900], { ranking: 2 }),
          ]),
          round("333-r2", [result(1, [850], { ranking: 1 })]),
        ])
      )
    ).toEqual([1]);
  });

  it("keeps everyone tied for a podium place", () => {
    expect(
      finishers(
        event("333", [
          round("333-r1", [
            result(1, [800], { ranking: 1 }),
            result(2, [900], { ranking: 2 }),
            result(3, [1000], { ranking: 3 }),
            result(4, [1000], { ranking: 3 }),
            result(5, [1100], { ranking: 5 }),
          ]),
        ])
      )
    ).toEqual([1, 2, 3, 4]);
  });

  it("gives no podium to a DNF in the top three", () => {
    expect(
      finishers(
        event("444bf", [
          round(
            "444bf-r1",
            [
              result(1, [30000, -1, -1], { ranking: 1 }),
              result(2, [-1, -1, -1], { ranking: 2 }),
            ],
            { format: "3" }
          ),
        ])
      )
    ).toEqual([1]);
  });

  it("reads a final that is a Dual Round across both of its rounds", () => {
    const linkedRounds = ["333-r1", "333-r2"];
    expect(
      finishers(
        event("333", [
          round(
            "333-r1",
            [
              result(1, [800], { ranking: 1 }),
              result(2, [-1], { ranking: 2 }),
              result(5, [1500], { ranking: 4 }),
            ],
            { linkedRounds }
          ),
          round(
            "333-r2",
            [
              result(1, [900], { ranking: 1 }),
              result(2, [850], { ranking: 2 }),
            ],
            { linkedRounds }
          ),
        ])
      )
    ).toEqual([1, 2]);
  });

  it("has no podium while the final is empty or unranked", () => {
    expect(
      finishers(
        event("333", [
          round("333-r1", [result(1, [800], { ranking: 1 })]),
          round("333-r2", []),
        ]),
        event("222", [round("222-r1", [result(2, [300], { ranking: null })])])
      )
    ).toEqual([]);
  });

  it("adds up the podiums of every event", () => {
    expect(
      finishers(
        event("333", [round("333-r1", [result(1, [800], { ranking: 1 })])]),
        event("222", [round("222-r1", [result(2, [300], { ranking: 1 })])])
      )
    ).toEqual([1, 2]);
  });
});
