import { describe, expect, it } from "vitest";
import { MIXED, mixedCompetition } from "./__fixtures__/scenarios";
import { competitors } from "./competitors";

const ids = (attendedOnly: boolean) =>
  competitors(mixedCompetition, { attendedOnly }).map(
    ({ registrantId }) => registrantId
  );

describe("competitors", () => {
  it("keeps every accepted registration, in WCIF order, when attendance does not matter", () => {
    expect(ids(false)).toEqual([
      MIXED.alice,
      MIXED.bob,
      MIXED.carol,
      MIXED.dan,
      MIXED.eve,
      MIXED.frank,
    ]);
  });

  it("drops no-shows and staff-only registrations when only attendees count", () => {
    expect(ids(true)).toEqual([MIXED.alice, MIXED.bob, MIXED.carol, MIXED.dan]);
  });

  it("never includes pending registrations or people without a registration", () => {
    for (const attendedOnly of [false, true]) {
      expect(ids(attendedOnly)).not.toContain(MIXED.grace);
      expect(ids(attendedOnly)).not.toContain(MIXED.hank);
    }
  });
});
