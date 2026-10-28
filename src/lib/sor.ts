import { sortEventIds } from "./events";
import type {
  Competition,
  EventId,
  Person,
  RegistrantId,
  ResultValue,
  Round,
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

const roundNumber = (round: Round): number =>
  Number(round.id.match(/-r(\d+)$/)?.[1]);

/**
 * Rounds whose results are ranked together. Usually a single round, but the
 * rounds of a Dual Round (WCIF `linkedRounds`, Regulation 9v) form one stage.
 */
type Stage = Round[];

/**
 * Groups rounds into stages in competition order, even if the WCIF array is
 * not sorted.
 */
const stagesInOrder = (rounds: Round[]): Stage[] => {
  const sorted = [...rounds].sort((a, b) => roundNumber(a) - roundNumber(b));
  const stages: Stage[] = [];
  const stageByRoundId = new Map<string, Stage>();
  for (const round of sorted) {
    const linked = round.linkedRounds?.find((id) => stageByRoundId.has(id));
    const stage = linked ? stageByRoundId.get(linked)! : [];
    if (!linked) stages.push(stage);
    stage.push(round);
    stageByRoundId.set(round.id, stage);
  }
  return stages;
};

/** A ranked result in a stage. */
interface StageResult {
  personId: RegistrantId;
  ranking: number;
  /** Whether the competitor has a successful result in any round of the stage. */
  solved: boolean;
}

/**
 * Rankings in a stage. A result with no ranking yet is treated as if it were
 * not there. In a Dual Round a competitor is ranked by the better of their
 * results from either round (Regulation 9v4), and the WCA writes that combined
 * ranking into each linked round, so a competitor appears once with the best
 * ranking they have in the stage.
 */
const stageResults = (stage: Stage): StageResult[] => {
  const byPerson = new Map<RegistrantId, StageResult>();
  for (const round of stage) {
    for (const result of round.results) {
      if (result.ranking === null) continue;
      const current = byPerson.get(result.personId);
      byPerson.set(result.personId, {
        personId: result.personId,
        ranking: Math.min(result.ranking, current?.ranking ?? Infinity),
        solved: isSuccess(result.best) || (current?.solved ?? false),
      });
    }
  }
  return [...byPerson.values()];
};

/**
 * People who took part in the competition, i.e. who have a result in at least
 * one round. WCA Live drops no-shows from a round entirely rather than storing
 * an empty result for them, so "has no result anywhere" means "did not attend".
 */
const attendees = (wcif: Competition): Set<RegistrantId> => {
  const ids = new Set<RegistrantId>();
  for (const event of wcif.events) {
    for (const round of event.rounds) {
      for (const result of round.results) {
        ids.add(result.personId);
      }
    }
  }
  return ids;
};

/**
 * Competitors to rank: accepted registrations of people who registered as
 * competitors and who actually showed up. Everyone else (delegates and
 * organizers without a registration, staff-only registrations, pending and
 * deleted registrations, and registered no-shows) is left out.
 */
const competitors = (wcif: Competition): Person[] => {
  const present = attendees(wcif);
  return wcif.persons.filter(
    (person) =>
      person.registration?.status === "accepted" &&
      person.registration.isCompeting &&
      present.has(person.registrantId)
  );
};

/**
 * Sum of ranks over every event. Each competitor gets their ranking from the
 * last round they reached. A competitor who did not compete in an event scores
 * one worse than the last person in its first round. The ranking counted in
 * each event is kept alongside the sum so it can be shown.
 */
export const calculateSor = (wcif: Competition): SORResult => {
  const people = competitors(wcif);
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
  const results: SORWithPosition[] = [];
  sorted.forEach((entry, index) => {
    const tied = index > 0 && entry.value === sorted[index - 1].value;
    results.push({
      ...entry,
      position: tied ? results[index - 1].position : index + 1,
    });
  });

  return { eventIds: sortedEventIds, results };
};
