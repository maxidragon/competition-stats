import type {
  Competition,
  Cutoff,
  Event,
  EventId,
  Person,
  RegistrantId,
  Registration,
  Result,
  ResultValue,
  Round,
  RoundFormat,
} from "../wcif";

/**
 * Small builders for WCIF v2 objects in tests. They fill in every field the
 * types require with neutral defaults, so a fixture only spells out what the
 * scenario is about. All names, ids and competitions built with them are
 * invented.
 */

export interface PersonOptions {
  registrantId: RegistrantId;
  name: string;
  wcaId?: string | null;
  countryIso2?: string;
  eventIds?: EventId[];
  status?: Registration["status"];
  isCompeting?: boolean;
  /** Pass `null` for someone with no registration at all, like a delegate. */
  registration?: null;
  roles?: string[];
}

export const person = ({
  registrantId,
  name,
  wcaId = null,
  countryIso2 = "XX",
  eventIds = [],
  status = "accepted",
  isCompeting = true,
  registration,
  roles = [],
}: PersonOptions): Person => ({
  registrantId,
  name,
  wcaUserId: 100000 + registrantId,
  wcaId,
  countryIso2,
  registration:
    registration === null
      ? null
      : { wcaRegistrationId: 500000 + registrantId, eventIds, status, isCompeting },
  roles,
  extensions: [],
});

/** The best of the attempts: the smallest success, else DNF if any were made. */
const bestOf = (values: ResultValue[]): ResultValue => {
  const successes = values.filter((value) => value > 0);
  if (successes.length > 0) return Math.min(...successes);
  return values.some((value) => value !== 0) ? -1 : 0;
};

export interface ResultOptions {
  ranking: number | null;
  /** Defaults to the best attempt. */
  best?: ResultValue;
  /** Defaults to 0, i.e. no average. */
  average?: ResultValue;
}

export const result = (
  personId: RegistrantId,
  values: ResultValue[],
  { ranking, best = bestOf(values), average = 0 }: ResultOptions
): Result => ({
  personId,
  ranking,
  attempts: values.map((value) => ({ value, reconstruction: null })),
  best,
  average,
});

export interface RoundOptions {
  format?: RoundFormat;
  linkedRounds?: string[] | null;
  cutoff?: Cutoff | null;
}

export const round = (
  id: string,
  results: Result[],
  { format = "a", linkedRounds = null, cutoff = null }: RoundOptions = {}
): Round => ({
  id,
  linkedRounds,
  format,
  timeLimit: null,
  cutoff,
  participationRuleset: null,
  results,
  scrambleSetCount: 1,
  extensions: [],
});

export const event = (id: EventId, rounds: Round[]): Event => ({
  id,
  rounds,
  competitorLimit: null,
  qualification: null,
  extensions: [],
});

export interface CompetitionOptions {
  id?: string;
  name?: string;
  persons: Person[];
  events: Event[];
}

export const competition = ({
  id = "FixtureOpen2026",
  name = "Fixture Open 2026",
  persons,
  events,
}: CompetitionOptions): Competition => ({
  formatVersion: "2.2",
  id,
  name,
  shortName: name,
  series: null,
  persons,
  events,
  schedule: { startDate: "2026-01-01", numberOfDays: 1, venues: [] },
  registrationInfo: {
    openTime: "2025-12-01T00:00:00Z",
    closeTime: "2025-12-20T00:00:00Z",
    baseEntryFee: 0,
    currencyCode: "XXX",
    onTheSpotRegistration: false,
    useWcaRegistration: true,
  },
  competitorLimit: null,
  extensions: [],
});
