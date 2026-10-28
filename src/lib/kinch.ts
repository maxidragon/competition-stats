import { competitors } from "./competitors";
import { sortEventIds } from "./events";
import { rankWithTies } from "./rank";
import type {
  Competition,
  Event,
  EventId,
  Person,
  RegistrantId,
  ResultValue,
} from "./wcif";

/**
 * Kinch ranks, after the KinchRanks formula, with one change: the reference
 * in each event is the best result at this competition rather than a record.
 *
 * - Per event and result type, a competitor scores
 *   `100 × best at the competition / their best`. Times, Fewest Moves move
 *   counts and Fewest Moves means (×100) are all lower-is-better, and both
 *   sides of the ratio are in the same unit, so one formula fits them all.
 *   Someone with no valid result of that type scores 0.
 * - Most events score on the average.
 * - Blindfolded events and Fewest Moves score on the better of the single
 *   score and the average score.
 * - Multi-Blind scores on the single only, by worth (see `multiBlindWorth`),
 *   as `100 × their worth / best worth at the competition`.
 * - An event where nobody at the competition has a valid average (only
 *   best-of-X rounds were held) scores on the single.
 * - A competitor's Kinch is the mean of their scores over every event held,
 *   including the ones they did not compete in, which count as 0.
 */

export interface EventScore {
  /** 0 to 100; 100 matches the best result at the competition. */
  score: number;
  /**
   * Whether the competitor has any result in the event. Tells a 0 from not
   * competing apart from a 0 from DNFs or a missing average.
   */
  competed: boolean;
}

export interface KinchRow {
  person: Person;
  /** Mean score over every event held, unrounded. */
  value: number;
  /** The score in every event held, keyed by event id. */
  scores: Record<EventId, EventScore>;
  /** 1-based; tied competitors share a position. */
  position: number;
}

export interface KinchResult {
  /** Events held, in official WCA order. */
  eventIds: EventId[];
  /** Best Kinch first. */
  results: KinchRow[];
}

/** Events scored on the better of single and average. */
const BEST_OF_SINGLE_AND_AVERAGE = new Set<EventId>(["333bf", "444bf", "555bf", "333fm"]);

const MULTI_BLIND = "333mbf";

/** A solved result. 0 is empty, -1 is DNF and -2 is DNS. */
const isValid = (value: ResultValue): boolean => value > 0;

/** Time recorded for a Multi-Blind attempt whose time is unknown. */
const UNKNOWN_TIME = 99999;
const HOUR = 3600;

/**
 * The worth of a Multi-Blind result: `points + (3600 − seconds) / 3600`, so
 * more points always win and, on equal points, a faster time wins. The value
 * is in the WCA's `0DDTTTTTMM` format: DD is 99 − points, TTTTT the time in
 * seconds (99999 when unknown, which counts as a full hour so the time adds
 * nothing) and MM the cubes missed. Returns null for a result that does not
 * count: DNF, DNS, empty, no points (the WCA scores those as DNF), and the
 * old pre-2009 format with a leading 1, which no current WCIF should carry.
 */
export const multiBlindWorth = (value: ResultValue): number | null => {
  if (!isValid(value) || value >= 1_000_000_000) return null;
  const points = 99 - Math.floor(value / 10_000_000);
  const recorded = Math.floor(value / 100) % 100_000;
  const seconds = recorded === UNKNOWN_TIME ? HOUR : recorded;
  if (points <= 0) return null;
  return points + (HOUR - seconds) / HOUR;
};

/** Smallest valid value, or null if there is none. */
const lowestValid = (values: ResultValue[]): ResultValue | null => {
  const valid = values.filter(isValid);
  return valid.length > 0 ? Math.min(...valid) : null;
};

/** Highest worth, or null if there is none. */
const highestWorth = (worths: (number | null)[]): number | null => {
  const valid = worths.filter((worth): worth is number => worth !== null);
  return valid.length > 0 ? Math.max(...valid) : null;
};

/** `100 × reference / own` for lower-is-better results; 0 without a result. */
const lowerIsBetterScore = (reference: number | null, own: number | null): number =>
  reference === null || own === null ? 0 : (100 * reference) / own;

/** What one competitor achieved in one event, over all of its rounds. */
interface PersonBests {
  single: ResultValue | null;
  average: ResultValue | null;
  /** Multi-Blind only. */
  worth: number | null;
}

/**
 * Each competitor's best single and average in the event, across every round,
 * so improving in a later round counts and both rounds of a Dual Round count.
 */
const bestsByPerson = (event: Event): Map<RegistrantId, PersonBests> => {
  const results = new Map<RegistrantId, { singles: ResultValue[]; averages: ResultValue[] }>();
  for (const round of event.rounds) {
    for (const result of round.results) {
      const entry = results.get(result.personId) ?? { singles: [], averages: [] };
      entry.singles.push(result.best);
      entry.averages.push(result.average);
      results.set(result.personId, entry);
    }
  }
  return new Map(
    [...results].map(([personId, { singles, averages }]) => [
      personId,
      {
        single: lowestValid(singles),
        average: lowestValid(averages),
        worth: event.id === MULTI_BLIND ? highestWorth(singles.map(multiBlindWorth)) : null,
      },
    ])
  );
};

/** An event counts once at least one of its results has a ranking. */
const isHeld = (event: Event): boolean =>
  event.rounds.some((round) => round.results.some((result) => result.ranking !== null));

/**
 * The score function of one event: the competition's bests are worked out
 * once, and each competitor is scored against them.
 */
const eventScorer = (
  event: Event,
  bests: Map<RegistrantId, PersonBests>
): ((own: PersonBests) => number) => {
  const all = [...bests.values()];

  if (event.id === MULTI_BLIND) {
    const bestWorth = highestWorth(all.map(({ worth }) => worth));
    return ({ worth }) =>
      bestWorth === null || worth === null ? 0 : (100 * worth) / bestWorth;
  }

  const bestSingle = lowestValid(all.flatMap(({ single }) => single ?? []));
  const bestAverage = lowestValid(all.flatMap(({ average }) => average ?? []));
  const singleScore = ({ single }: PersonBests) => lowerIsBetterScore(bestSingle, single);
  const averageScore = ({ average }: PersonBests) => lowerIsBetterScore(bestAverage, average);

  if (bestAverage === null) return singleScore;
  if (BEST_OF_SINGLE_AND_AVERAGE.has(event.id)) {
    return (own) => Math.max(singleScore(own), averageScore(own));
  }
  return averageScore;
};

/**
 * Kinch of every competitor who attended, best first. Ties are on the exact,
 * unrounded value and share a position; tied competitors are listed by name.
 */
export const calculateKinch = (wcif: Competition): KinchResult => {
  const people = competitors(wcif, { attendedOnly: true });
  const heldEvents = wcif.events.filter(isHeld);
  const eventIds = sortEventIds(heldEvents.map(({ id }) => id));
  if (eventIds.length === 0) return { eventIds, results: [] };

  const scores = new Map<RegistrantId, Record<EventId, EventScore>>(
    people.map((person) => [person.registrantId, {}])
  );
  for (const event of heldEvents) {
    const bests = bestsByPerson(event);
    const score = eventScorer(event, bests);
    for (const person of people) {
      const own = bests.get(person.registrantId);
      scores.get(person.registrantId)![event.id] = own
        ? { score: score(own), competed: true }
        : { score: 0, competed: false };
    }
  }

  const sorted = people
    .map((person) => {
      const personScores = scores.get(person.registrantId)!;
      const total = eventIds.reduce((sum, eventId) => sum + personScores[eventId].score, 0);
      return { person, value: total / eventIds.length, scores: personScores };
    })
    .sort((a, b) => b.value - a.value || a.person.name.localeCompare(b.person.name));

  const results: KinchRow[] = rankWithTies(
    sorted,
    (previous, current) => previous.value === current.value
  ).map(({ row, position }) => ({ ...row, position }));

  return { eventIds, results };
};
