import { CompetitionInfo } from "./interfaces";
import {
  wcaApiRequest,
  WCIF_LIFECYCLE,
  WCIF_MAJOR_VERSION,
} from "./request";
import { Competition } from "./wcif";

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

export const searchCompetitions = async (
  name?: string
): Promise<CompetitionInfo[]> => {
  const search = name ?? "";
  try {
    // Without a search term we only list upcoming competitions.
    const start = search.length < 1 ? toIsoDate(new Date()) : "";
    const data = await wcaApiRequest(
      `competitions?q=${encodeURIComponent(
        search
      )}&start=${start}&per_page=50&sort=start_date`
    );
    if (!Array.isArray(data)) return [];
    return data.filter(
      (competition: CompetitionInfo) =>
        new Date(competition.start_date).getFullYear() >= 2023
    );
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getWcif = async (id: string): Promise<Competition> => {
  const wcif = (await wcaApiRequest(
    `competitions/${encodeURIComponent(id)}/wcif/${WCIF_LIFECYCLE}`
  )) as Competition;

  const major = Number.parseInt(wcif?.formatVersion ?? "", 10);
  if (major !== WCIF_MAJOR_VERSION) {
    throw new Error(
      `Unsupported WCIF version ${wcif?.formatVersion}, expected v${WCIF_MAJOR_VERSION}.x`
    );
  }
  return wcif;
};
