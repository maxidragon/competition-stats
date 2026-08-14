import { SORWithPosition } from "./interfaces";
import { Competition, Person, RegistrantId, Round } from "./wcif";

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
 * compete in an event scores one worse than the last person who did.
 */
export const calculateSor = (wcif: Competition): SORWithPosition[] => {
  const people = competitors(wcif);
  const sums = new Map<RegistrantId, number>(
    people.map((person) => [person.registrantId, 0])
  );

  for (const event of wcif.events) {
    const round = firstRound(event.rounds);
    if (!round) continue;

    const rankings = new Map<RegistrantId, number>();
    let lastRanking = 0;
    for (const result of round.results) {
      // A result with no ranking yet is treated as if it were not there.
      if (result.ranking === null) continue;
      rankings.set(result.personId, result.ranking);
      lastRanking = Math.max(lastRanking, result.ranking);
    }
    if (rankings.size === 0) continue;

    for (const person of people) {
      const ranking = rankings.get(person.registrantId) ?? lastRanking + 1;
      sums.set(person.registrantId, sums.get(person.registrantId)! + ranking);
    }
  }

  const sorted = people
    .map((person) => ({ person, value: sums.get(person.registrantId)! }))
    .sort(
      (a, b) => a.value - b.value || a.person.name.localeCompare(b.person.name)
    );

  // Ties share a position, and the next competitor skips the tied places.
  const sor: SORWithPosition[] = [];
  sorted.forEach((entry, index) => {
    const tied = index > 0 && entry.value === sorted[index - 1].value;
    sor.push({ ...entry, position: tied ? sor[index - 1].position : index + 1 });
  });
  return sor;
};
