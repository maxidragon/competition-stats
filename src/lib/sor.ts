import { competitors } from "./competitors";
import { sortEventIds } from "./events";
import { rankWithTies } from "./rank";
import { stageRankings, stagesInOrder, type Stage } from "./stages";
import type {
  Competition,
  EventId,
  Person,
  RegistrantId,
  ResultValue,
} from "./wcif";

export interface EventRanking {
  /** The ranking that was added to the sum for this event. */
  ranking: number;
  /**
   * False when the competitor did not take part in the event, in which case
   * `ranking` is the imputed one place behind the last competitor.
   */
  competed: boolean;
}

export interface SOR {
  person: Person;
  value: number;
  /** The ranking counted in every event, keyed by event id. */
  rankings: Record<EventId, EventRanking>;
}

export interface SORWithPosition extends SOR {
  position: number;
}

export interface SORResult {
  /** Events that counted towards the sum, in official WCA order. */
  eventIds: EventId[];
  results: SORWithPosition[];
}

/** A solved attempt or result. 0 is empty, -1 is DNF and -2 is DNS. */
const isSuccess = (value: ResultValue): boolean => value > 0;

/** A ranked result in a stage. */
interface StageResult {
  personId: RegistrantId;
  ranking: number;
  /** Whether the competitor has a successful result in any round of the stage. */
  solved: boolean;
}

/**
 * Rankings in a stage (see `stageRankings`), with whether each competitor
 * solved anything in a ranked result of the stage.
 */
const stageResults = (stage: Stage): StageResult[] => {
  const solved = new Set<RegistrantId>();
  for (const round of stage) {
    for (const result of round.results) {
      if (result.ranking !== null && isSuccess(result.best)) solved.add(result.personId);
    }
  }
  return [...stageRankings(stage)].map(([personId, ranking]) => ({
    personId,
    ranking,
    solved: solved.has(personId),
  }));
};

/**
 * Sum of ranks over every event. Each competitor gets their ranking from the
 * last round they reached. A competitor who did not compete in an event scores
 * one worse than the last person in its first round. The ranking counted in
 * each event is kept alongside the sum so it can be shown.
 */
export const calculateSor = (wcif: Competition): SORResult => {
  // Accepted registrations of people who registered as competitors and who
  // actually showed up. Everyone else (delegates and organizers without a
  // registration, staff-only registrations, pending and deleted registrations,
  // and registered no-shows) is left out.
  const people = competitors(wcif, { attendedOnly: true });
  const rankings = new Map<RegistrantId, Record<EventId, EventRanking>>(
    people.map((person) => [person.registrantId, {}])
  );
  const eventIds: EventId[] = [];

  for (const event of wcif.events) {
    const stages = stagesInOrder(event.rounds).map(stageResults);
    const firstStage = stages[0] ?? [];
    if (firstStage.length === 0) continue;

    const lastRanking = Math.max(...firstStage.map((entry) => entry.ranking));

    // Everyone without a successful solve shares the last ranking, so not
    // competing is worth exactly as much as competing without solving, and the
    // absentees join that ranking instead of being put behind it.
    const lastPlaceDidNotSolve = firstStage.some(
      (entry) => entry.ranking === lastRanking && !entry.solved
    );
    const absentRanking = lastPlaceDidNotSolve ? lastRanking : lastRanking + 1;

    // Advancing competitors use their placement in the latest stage for which
    // they have a ranking. Iterating from the first stage to the final lets a
    // later result replace an earlier one for the same person.
    const latestRoundRankings = new Map<RegistrantId, number>();
    for (const stage of stages) {
      for (const entry of stage) {
        latestRoundRankings.set(entry.personId, entry.ranking);
      }
    }

    eventIds.push(event.id);
    for (const person of people) {
      const ranking = latestRoundRankings.get(person.registrantId);
      rankings.get(person.registrantId)![event.id] =
        ranking === undefined
          ? { ranking: absentRanking, competed: false }
          : { ranking, competed: true };
    }
  }

  const sortedEventIds = sortEventIds(eventIds);
  const sorted = people
    .map((person) => {
      const personRankings = rankings.get(person.registrantId)!;
      const value = sortedEventIds.reduce(
        (sum, eventId) => sum + personRankings[eventId].ranking,
        0
      );
      return { person, value, rankings: personRankings };
    })
    .sort(
      (a, b) => a.value - b.value || a.person.name.localeCompare(b.person.name)
    );

  // Ties share a position, and the next competitor skips the tied places.
  const results: SORWithPosition[] = rankWithTies(
    sorted,
    (previous, current) => previous.value === current.value
  ).map(({ row, position }) => ({ ...row, position }));

  return { eventIds: sortedEventIds, results };
};
