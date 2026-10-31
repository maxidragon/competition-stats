import { useOutletContext } from "react-router-dom";
import type { Competition, Person } from "../../lib/wcif";

/** What CompetitionLayout hands to the view rendered in its outlet. */
export interface CompetitionContext {
  wcif: Competition;
  /** Whether a view should list this person, under the layout's filters. */
  isVisible: (person: Person) => boolean;
}

/** The competition loaded by CompetitionLayout, for its child views. */
export const useCompetition = (): CompetitionContext =>
  useOutletContext<CompetitionContext>();
