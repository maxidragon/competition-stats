import { sortEventIds } from "./events";
import { EventRanking, SORResult, SORWithPosition } from "./interfaces";
import {
  Competition,
  EventId,
  Person,
  RegistrantId,
  ResultValue,
  Round,
} from "./wcif";

/** A solved attempt or result. 0 is empty, -1 is DNF and -2 is DNS. */
const isSuccess = (value: ResultValue): boolean => value > 0;

/**
 * The first round of an event. Normally `{eventId}-r1`, but we fall back to the
 * first round in the list so events with an unusual round layout still count.
 */
const firstRound = (rounds: Round[]): Round | undefined =>
  rounds.find((round) => round.id.endsWith("-r1")) ?? rounds[0];

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
 * Sum of ranks over the first round of every event. A competitor who did not
 * compete in an event scores one worse than the last person who did. The
 * ranking counted in each event is kept alongside the sum so it can be shown.
 */
export const calculateSor = (wcif: Competition): SORResult => {
  const people = competitors(wcif);
  const rankings = new Map<RegistrantId, Record<EventId, EventRanking>>(
    people.map((person) => [person.registrantId, {}])
  );
  const eventIds: EventId[] = [];

  for (const event of wcif.events) {
    const round = firstRound(event.rounds);
    if (!round) continue;

    const roundRankings = new Map<RegistrantId, number>();
    let lastRanking = 0;
    for (const result of round.results) {
      // A result with no ranking yet is treated as if it were not there.
      if (result.ranking === null) continue;
      roundRankings.set(result.personId, result.ranking);
      lastRanking = Math.max(lastRanking, result.ranking);
    }
    if (roundRankings.size === 0) continue;

    // Everyone without a successful solve shares the last ranking, so not
    // competing is worth exactly as much as competing without solving, and the
    // absentees join that ranking instead of being put behind it.
    const lastPlaceDidNotSolve = round.results.some(
      (result) => result.ranking === lastRanking && !isSuccess(result.best)
    );
    const absentRanking = lastPlaceDidNotSolve ? lastRanking : lastRanking + 1;

    eventIds.push(event.id);
    for (const person of people) {
      const ranking = roundRankings.get(person.registrantId);
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
