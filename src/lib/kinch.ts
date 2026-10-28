import { competitors } from "./competitors";
import { sortEventIds } from "./events";
import { rankWithTies } from "./rank";
import { stageRankings, stagesInOrder, type Stage } from "./stages";
import type {
  Competition,
  Event,
  EventId,
  Person,
  RegistrantId,
  Result,
  ResultValue,
} from "./wcif";

/**
 * Kinch for one competition, scoring each round against that round's best
 * and counting only the last round a competitor reached, with a floor for
 * having advanced into it.
 *
 * Result type. Each event is scored on one type of result:
 * - the average (WCIF `average`) for 3x3x3, 2x2x2, 4x4x4, 5x5x5, One-Handed,
 *   Clock, Megaminx, Pyraminx, Skewb and Square-1 (Ao5) and for 6x6x6 and
 *   7x7x7 (Mo3);
 * - the single (WCIF `best`) for 3x3x3, 4x4x4 and 5x5x5 Blindfolded, Fewest
 *   Moves and Multi-Blind;
 * - for any other event, the average if a round of the stage is held as an
 *   average or mean (format `a` or `m`), else the single.
 *
 * Stages. Rounds are taken in round-number order, and the rounds of a Dual
 * Round (`linkedRounds`) form one stage (see `stagesInOrder`). A competitor's
 * result in a stage is their better one across its rounds, and their ranking
 * is their best ranking across its rounds (see `stageRankings`).
 *
 * Round score, 0 to 1. In a stage, a competitor scores `best ÷ theirs`, where
 * the best is over everyone with a result entry in the stage, competitor or
 * not. Multi-Blind compares worth instead (see `multiBlindWorth`), as
 * `theirs ÷ best`. No valid result of the type (DNF, DNS, empty, or cut off
 * before an average) scores 0. A stage where nobody has a valid result of the
 * type, such as a best-of-X round of an average event, is scored on singles.
 *
 * Event score, 0 to 1. Only the last stage in which a competitor has a result
 * entry counts: `K_event = K_round × (1 − K_p) + K_p`. `K_p` is 0 in the first
 * stage. In a later stage it is the event score, in the stage before, of the
 * lowest-ranked person who advanced, i.e. the person with the worst ranking in
 * the previous stage among those with an entry in both. Floors stack: each
 * stage's floor was itself computed with the floor of the stage before it.
 * Reaching a stage without a valid result scores exactly `K_p`. If nobody in
 * a stage has a ranked entry in the stage before, its floor is 0.
 *
 * WCA Live removes a competitor who withdraws before a round they qualified
 * for, so they cannot be told apart from someone who did not qualify, and are
 * scored in their previous stage.
 *
 * Competition score. The mean of the event scores over every event held (one
 * with at least one ranked result); an event not entered counts as 0. Scores
 * are exposed on a 0 to 100 scale.
 */

export interface EventScore {
  /**
   * 0 to 100, unrounded; 100 matches the best result in the last round the
   * competitor reached.
   */
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

/** Events scored on the average: Ao5, plus Mo3 for 6x6x6 and 7x7x7. */
const AVERAGE_EVENTS = new Set<EventId>([
  "333", "222", "444", "555", "666", "777", "333oh", "clock", "minx", "pyram", "skewb", "sq1",
]);

/** Events scored on the single. */
const SINGLE_EVENTS = new Set<EventId>(["333bf", "444bf", "555bf", "333fm", "333mbf"]);

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

type ResultType = "single" | "average";

/** The result type an event is scored on in a stage. */
const resultType = (eventId: EventId, stage: Stage): ResultType => {
  if (AVERAGE_EVENTS.has(eventId)) return "average";
  if (SINGLE_EVENTS.has(eventId)) return "single";
  return stage.some(({ format }) => format === "a" || format === "m") ? "average" : "single";
};

/** How a stage's results are compared. */
interface Measure {
  /** The value a result is compared on, or null if it has no valid one. */
  valueOf: (result: Result) => number | null;
  isBetter: (value: number, than: number) => boolean;
  /** Round score, 0 to 1, of `own` against the stage's `best`. */
  ratio: (own: number, best: number) => number;
}

const lowerIsBetter = (value: number, than: number) => value < than;
const validOrNull = (value: ResultValue): number | null => (isValid(value) ? value : null);

/** Times and move counts: lower is better, scored `best ÷ own`. */
const SINGLE: Measure = {
  valueOf: ({ best }) => validOrNull(best),
  isBetter: lowerIsBetter,
  ratio: (own, best) => best / own,
};
const AVERAGE: Measure = { ...SINGLE, valueOf: ({ average }) => validOrNull(average) };
/** Multi-Blind worth: higher is better, scored `own ÷ best`. */
const WORTH: Measure = {
  valueOf: ({ best }) => multiBlindWorth(best),
  isBetter: (value, than) => value > than,
  ratio: (own, best) => own / best,
};

/**
 * Every person with a result entry in the stage, with the best of their
 * values across its rounds, or null if none is valid.
 */
const bestPerPerson = (
  stage: Stage,
  { valueOf, isBetter }: Measure
): Map<RegistrantId, number | null> => {
  const bests = new Map<RegistrantId, number | null>();
  for (const round of stage) {
    for (const result of round.results) {
      const value = valueOf(result);
      const current = bests.get(result.personId) ?? null;
      const better = current === null || (value !== null && isBetter(value, current));
      bests.set(result.personId, better ? value : current);
    }
  }
  return bests;
};

/**
 * Round score (0 to 1) of every person with a result entry in the stage, or
 * null if nobody in the stage has a valid value to compare on.
 */
const scoreStage = (stage: Stage, measure: Measure): Map<RegistrantId, number> | null => {
  const values = bestPerPerson(stage, measure);
  let best: number | null = null;
  for (const value of values.values()) {
    if (value !== null && (best === null || measure.isBetter(value, best))) best = value;
  }
  if (best === null) return null;
  return new Map(
    [...values].map(([personId, own]) => [personId, own === null ? 0 : measure.ratio(own, best)])
  );
};

/**
 * Round score (0 to 1) of every person with a result entry in the stage. A
 * stage where nobody has a valid average is scored on singles; one where
 * nobody has anything valid scores 0 for everyone.
 */
const roundScores = (eventId: EventId, stage: Stage): Map<RegistrantId, number> => {
  const primary =
    eventId === MULTI_BLIND ? WORTH : resultType(eventId, stage) === "average" ? AVERAGE : SINGLE;
  return (
    scoreStage(stage, primary) ??
    (primary === AVERAGE ? scoreStage(stage, SINGLE) : null) ??
    new Map([...bestPerPerson(stage, SINGLE).keys()].map((personId) => [personId, 0]))
  );
};

/**
 * `K_round × (1 − K_p) + K_p`, written as `1 − (1 − K_round)(1 − K_p)` so a
 * round score of exactly 1 stays exactly 1.
 */
const withFloor = (roundScore: number, floor: number): number =>
  1 - (1 - roundScore) * (1 - floor);

/** Event scores and rankings in one stage. */
interface StageOutcome {
  scores: Map<RegistrantId, number>;
  rankings: Map<RegistrantId, number>;
}

/**
 * `K_p` of a stage: the event score, in the previous stage, of the person who
 * advanced with the worst ranking there. People tied on that ranking have the
 * same result; the lowest of their scores is taken so the choice is stable.
 * 0 if nobody in the stage has a ranked entry in the previous one.
 */
const advancementFloor = (entrants: Iterable<RegistrantId>, previous: StageOutcome): number => {
  let worstRanking = -Infinity;
  let floor = 0;
  for (const personId of entrants) {
    const ranking = previous.rankings.get(personId);
    const score = previous.scores.get(personId);
    if (ranking === undefined || score === undefined) continue;
    if (ranking > worstRanking || (ranking === worstRanking && score < floor)) {
      worstRanking = ranking;
      floor = score;
    }
  }
  return floor;
};

/**
 * Event score (0 to 1) of every person with a result entry in the event,
 * taken from the last stage in which they have one.
 */
const eventScores = (event: Event): Map<RegistrantId, number> => {
  const scores = new Map<RegistrantId, number>();
  let previous: StageOutcome | null = null;
  for (const stage of stagesInOrder(event.rounds)) {
    const rounds = roundScores(event.id, stage);
    if (rounds.size === 0) continue;
    const floor: number = previous ? advancementFloor(rounds.keys(), previous) : 0;
    const stageScores = new Map<RegistrantId, number>(
      [...rounds].map(([personId, roundScore]) => [personId, withFloor(roundScore, floor)])
    );
    for (const [personId, score] of stageScores) scores.set(personId, score);
    previous = { scores: stageScores, rankings: stageRankings(stage) };
  }
  return scores;
};

/** An event counts once at least one of its results has a ranking. */
const isHeld = (event: Event): boolean =>
  event.rounds.some((round) => round.results.some((result) => result.ranking !== null));

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
    const byPerson = eventScores(event);
    for (const person of people) {
      const score = byPerson.get(person.registrantId);
      scores.get(person.registrantId)![event.id] =
        score === undefined ? { score: 0, competed: false } : { score: 100 * score, competed: true };
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
