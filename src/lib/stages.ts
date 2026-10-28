import type { RegistrantId, Round } from "./wcif";

const roundNumber = (round: Round): number =>
  Number(round.id.match(/-r(\d+)$/)?.[1]);

/**
 * Rounds whose results are ranked together. Usually a single round, but the
 * rounds of a Dual Round (WCIF `linkedRounds`, Regulation 9v) form one stage.
 */
export type Stage = Round[];

/**
 * Groups rounds into stages in competition order, even if the WCIF array is
 * not sorted.
 */
export const stagesInOrder = (rounds: Round[]): Stage[] => {
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

/**
 * Each competitor's ranking in a stage: the best (lowest) ranking they have in
 * any of its rounds. A result with no ranking yet is treated as if it were not
 * there. In a Dual Round a competitor is ranked by the better of their results
 * from either round (Regulation 9v4), and the WCA writes that combined ranking
 * into each linked round, so the best one is the combined one.
 */
export const stageRankings = (stage: Stage): Map<RegistrantId, number> => {
  const rankings = new Map<RegistrantId, number>();
  for (const round of stage) {
    for (const { personId, ranking } of round.results) {
      if (ranking === null) continue;
      rankings.set(personId, Math.min(ranking, rankings.get(personId) ?? Infinity));
    }
  }
  return rankings;
};
