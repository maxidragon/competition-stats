import type { Competition, Person, RegistrantId } from "./wcif";

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

export interface CompetitorsOptions {
  /**
   * Keep only people who registered as competitors and who actually showed
   * up. Without it, every accepted registration counts, including staff-only
   * registrations and no-shows.
   */
  attendedOnly: boolean;
}

/**
 * Competitors of a competition, in WCIF order. Always limited to accepted
 * registrations, so delegates and organizers without a registration, and
 * pending and deleted registrations, are left out.
 */
export const competitors = (
  wcif: Competition,
  { attendedOnly }: CompetitorsOptions
): Person[] => {
  const accepted = wcif.persons.filter(
    (person) => person.registration?.status === "accepted"
  );
  if (!attendedOnly) return accepted;

  const present = attendees(wcif);
  return accepted.filter(
    (person) =>
      person.registration?.isCompeting && present.has(person.registrantId)
  );
};
