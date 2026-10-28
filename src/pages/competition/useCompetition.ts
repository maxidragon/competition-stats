import { useOutletContext } from "react-router-dom";
import type { Competition } from "../../lib/wcif";

/** What CompetitionLayout hands to the view rendered in its outlet. */
export interface CompetitionContext {
  wcif: Competition;
}

/** The competition loaded by CompetitionLayout, for its child views. */
export const useCompetition = (): CompetitionContext =>
  useOutletContext<CompetitionContext>();
