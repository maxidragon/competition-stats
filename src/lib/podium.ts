import { stagesInOrder } from "./stages";
import type { Competition, RegistrantId } from "./wcif";

const PODIUM_PLACES = 3;

/**
 * People on the podium of at least one event: placed in the top three of its
 * final, Dual Round finals included, with a successful result. Ties share a
 * place, so a podium can hold more than three people, and a DNF in the top
 * three of a small final is not a podium. An event whose final has no results
 * yet has no podium.
 */
export const podiumFinishers = (wcif: Competition): Set<RegistrantId> => {
  const finishers = new Set<RegistrantId>();
  for (const event of wcif.events) {
    const final = stagesInOrder(event.rounds).at(-1) ?? [];
    for (const round of final) {
      for (const { personId, ranking, best } of round.results) {
        if (ranking !== null && ranking <= PODIUM_PLACES && best > 0) finishers.add(personId);
      }
    }
  }
  return finishers;
};
