import { competition, event, person, result, round } from "./builder";

/**
 * Invented competitions for tests. Every name, WCA ID and competition here is
 * made up; none of it comes from a real WCIF.
 */

/**
 * Four competitors in two events, with a tie in 3x3x3 and one person who
 * skipped 2x2x2.
 *
 * 3x3x3: Ann 1, Ben 2, Cid 2 (tied), Dee 4 (solved singles, DNF average).
 * 2x2x2: Ben 1, Ann 2, Cid 3 (all DNF). Dee did not compete.
 */
export const tiesCompetition = competition({
  id: "TiesInvitational2026",
  name: "Ties Invitational 2026",
  persons: [
    person({ registrantId: 1, name: "Ann Alpha", wcaId: "2020ALPH01", countryIso2: "PL" }),
    person({ registrantId: 2, name: "Ben Beta", wcaId: "2021BETA01", countryIso2: "DE" }),
    person({ registrantId: 3, name: "Cid Gamma", countryIso2: "FR" }),
    person({ registrantId: 4, name: "Dee Delta", wcaId: "2019DELT01", countryIso2: "ES" }),
  ],
  events: [
    event("333", [
      round("333-r1", [
        result(1, [800, 900, 1000, 1100, 1200], { ranking: 1, average: 1000 }),
        result(2, [900, 1000, 1100, 1200, 1300], { ranking: 2, average: 1100 }),
        result(3, [900, 1000, 1100, 1200, 1300], { ranking: 2, average: 1100 }),
        result(4, [1500, -1, -1, 1600, 1700], { ranking: 4, average: -1 }),
      ]),
    ]),
    event("222", [
      round("222-r1", [
        result(2, [300, 350, 400, 450, 500], { ranking: 1, average: 400 }),
        result(1, [400, 500, 600, 700, 800], { ranking: 2, average: 600 }),
        result(3, [-1, -1, -1, -1, -1], { ranking: 3, average: -1 }),
      ]),
    ]),
  ],
});

/** Registrant ids in `mixedCompetition`. */
export const MIXED = {
  alice: 1,
  bob: 2,
  carol: 3,
  dan: 4,
  /** Accepted competitor with no results anywhere. */
  eve: 5,
  /** Accepted, but registered as staff (`isCompeting: false`). */
  frank: 6,
  /** Registration still pending. */
  grace: 7,
  /** Delegate with no registration at all. */
  hank: 8,
} as const;

/**
 * One competition covering the awkward cases:
 *
 * - 3x3x3: a Dual Round (r1 and r2 linked, ranked together) and a final.
 *   Combined ranking Bob 1, Alice 2, Dan 3, Carol 4; Bob and Alice reach the
 *   final, where Bob wins. Carol has a DNF and Dan a DNS in r1.
 * - 4x4x4: a cutoff after two attempts. Carol misses it, so her last three
 *   attempts are empty (0) and she has no average. Bob did not compete.
 * - 3x3x3 Fewest Moves: singles are move counts, the mean is ×100. Carol did
 *   not compete; Dan, in last place, has a success.
 * - 4x4x4 Blindfolded: nobody solved, so Alice and Dan tie on DNF.
 * - 3x3x3 Multi-Blind: one attempt, encoded as 0DDTTTTTMM. Carol DNFs and is
 *   last, so absentees share her ranking.
 * - 5x5x5: a round with no results yet, which no view should count.
 *
 * Eve is an accepted no-show, Frank is staff only, Grace is pending and Hank
 * is a delegate who never registered.
 */
export const mixedCompetition = competition({
  id: "MixedCasesOpen2026",
  name: "Mixed Cases Open 2026",
  persons: [
    person({ registrantId: MIXED.alice, name: "Alice Example", wcaId: "2020EXAM01", countryIso2: "PL" }),
    person({ registrantId: MIXED.bob, name: "Bob Sample", wcaId: "2019SAMP01", countryIso2: "DE" }),
    person({ registrantId: MIXED.carol, name: "Carol Test", countryIso2: "US" }),
    person({ registrantId: MIXED.dan, name: "Dan Placeholder", wcaId: "2018PLAC01", countryIso2: "GB" }),
    person({ registrantId: MIXED.eve, name: "Eve Noshow", wcaId: "2022NOSH01", countryIso2: "PL" }),
    person({ registrantId: MIXED.frank, name: "Frank Staff", wcaId: "2017STAF01", isCompeting: false }),
    person({ registrantId: MIXED.grace, name: "Grace Pending", status: "pending" }),
    person({ registrantId: MIXED.hank, name: "Hank Delegate", wcaId: "2015DELE01", registration: null, roles: ["delegate"] }),
  ],
  events: [
    event("333", [
      round(
        "333-r1",
        [
          result(MIXED.bob, [1500, 1500, 1500, 1500, 1500], { ranking: 1, average: 1500 }),
          result(MIXED.alice, [1000, 1100, 1200, 1300, 1400], { ranking: 2, average: 1200 }),
          result(MIXED.dan, [1200, 1300, -2, 1250, 1350], { ranking: 3, average: 1300 }),
          result(MIXED.carol, [2000, -1, 2100, 2200, 2300], { ranking: 4, average: 2200 }),
        ],
        { linkedRounds: ["333-r1", "333-r2"] }
      ),
      round(
        "333-r2",
        [result(MIXED.bob, [900, 950, 1000, 1050, 1100], { ranking: 1, average: 1000 })],
        { linkedRounds: ["333-r1", "333-r2"] }
      ),
      round("333-r3", [
        result(MIXED.bob, [900, 900, 900, 900, 900], { ranking: 1, average: 900 }),
        result(MIXED.alice, [1000, 1000, 1000, 1000, 1000], { ranking: 2, average: 1000 }),
      ]),
    ]),
    event("444", [
      round(
        "444-r1",
        [
          result(MIXED.alice, [5000, 5500, 5200, 5100, 5300], { ranking: 1, average: 5200 }),
          result(MIXED.dan, [5800, 6100, 6200, 5900, 6000], { ranking: 2, average: 6000 }),
          result(MIXED.carol, [7000, 7200, 0, 0, 0], { ranking: 3 }),
        ],
        { cutoff: { numberOfAttempts: 2, resultValue: 6500 } }
      ),
    ]),
    event("333fm", [
      round(
        "333fm-r1",
        [
          result(MIXED.bob, [30, 29, 27], { ranking: 1, average: 2867 }),
          result(MIXED.alice, [28, 31, -1], { ranking: 2, average: -1 }),
          result(MIXED.dan, [-2, 35, 33], { ranking: 3, average: -1 }),
        ],
        { format: "m" }
      ),
    ]),
    event("444bf", [
      round(
        "444bf-r1",
        [
          result(MIXED.alice, [-1, -1, -1], { ranking: 1 }),
          result(MIXED.dan, [-1, -2, -2], { ranking: 1 }),
        ],
        { format: "3" }
      ),
    ]),
    event("333mbf", [
      round(
        "333mbf-r1",
        [
          // 3 solved, 1 missed (2 points) in 6:00.
          result(MIXED.bob, [970036001], { ranking: 1 }),
          result(MIXED.carol, [-1], { ranking: 2 }),
        ],
        { format: "1" }
      ),
    ]),
    event("555", [round("555-r1", [])]),
  ],
});
