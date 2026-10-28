import { competitors } from "./competitors";
import type { Competition, Person, RegistrantId, ResultValue } from "./wcif";

export interface SolveCounts {
  /** Attempts that were made: anything but an empty attempt (0), so DNF and DNS count. */
  attempted: number;
  /** Successful attempts. */
  completed: number;
}

export interface SolvesRow extends SolveCounts {
  person: Person;
  /** Number of events the person registered for. */
  events: number;
}

const isAttempted = (value: ResultValue): boolean => value !== 0;
const isCompleted = (value: ResultValue): boolean => value > 0;

/** Attempted and completed solves per registrant, over every round of every event. */
export const solveCounts = (wcif: Competition): Map<RegistrantId, SolveCounts> => {
  const counts = new Map<RegistrantId, SolveCounts>();
  for (const event of wcif.events) {
    for (const round of event.rounds) {
      for (const result of round.results) {
        const personCounts = counts.get(result.personId) ?? { attempted: 0, completed: 0 };
        for (const { value } of result.attempts) {
          if (isAttempted(value)) personCounts.attempted++;
          if (isCompleted(value)) personCounts.completed++;
        }
        counts.set(result.personId, personCounts);
      }
    }
  }
  return counts;
};

/**
 * One row per accepted registration, in WCIF order. People with no results
 * (no-shows, staff-only registrations) are kept with zero solves.
 */
export const solvesRows = (wcif: Competition): SolvesRow[] => {
  const counts = solveCounts(wcif);
  return competitors(wcif, { attendedOnly: false }).map((person) => ({
    person,
    events: person.registration?.eventIds.length ?? 0,
    ...(counts.get(person.registrantId) ?? { attempted: 0, completed: 0 }),
  }));
};
