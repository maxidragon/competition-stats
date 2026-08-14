/**
 * WCIF v2 types.
 *
 * Based on the `latest` WCIF specification:
 * https://github.com/thewca/wcif/blob/latest/specification.md
 *
 * These are hand-written because `@wca/helpers` (1.1.7, the newest release) still
 * ships WCIF v1 types - it has `Round.advancementCondition`, `Attempt.result` and
 * `PersonalBest.best`, all of which were renamed or replaced in v2.0.0.
 */

export type CountryCode = string;
export type CurrencyCode = string;
/** `YYYY-MM-DD` */
export type Date_ = string;
/** ISO 8601 */
export type DateTime = string;
/** `{eventId}[-r{roundNumber}][-g{groupName}][-a{attemptNumber}]` or `other-{id}` */
export type ActivityCode = string;
export type EventId = string;
export type RegistrantId = number;

/**
 * An integer result, in centiseconds by default.
 * `-1` is a DNF, `-2` is a DNS. Renamed from `AttemptResult` in WCIF v2.
 */
export type ResultValue = number;

export interface Extension {
  id: string;
  specUrl: string;
  data: Record<string, unknown>;
}

export interface Competition {
  /** Required by the spec. `"2.x.y"` for WCIF v2. */
  formatVersion: string;
  /** Required by the spec. */
  id: string;
  name: string;
  shortName: string;
  series: Series | null;
  persons: Person[];
  events: Event[];
  schedule: Schedule;
  registrationInfo: RegistrationInfo;
  competitorLimit: number | null;
  extensions: Extension[];
}

export interface Series {
  id: string;
  name: string;
  shortName: string;
  competitionIds: string[];
}

export interface Person {
  registrantId: RegistrantId;
  name: string;
  wcaUserId: number;
  wcaId: string | null;
  countryIso2: CountryCode;
  gender?: "m" | "f" | "o";
  /** Not exposed by the public endpoint. */
  birthdate?: Date_;
  /** Not exposed by the public endpoint. */
  email?: string;
  avatar?: Avatar | null;
  roles?: Role[];
  /** `null` for people who never registered (delegates, organizers). */
  registration: Registration | null;
  assignments?: Assignment[];
  personalBests?: PersonalBest[];
  extensions: Extension[];
}

export type Role = "delegate" | "trainee-delegate" | "organizer" | (string & {});

export interface Avatar {
  url: string;
  thumbUrl: string;
}

export interface Registration {
  wcaRegistrationId: number;
  eventIds: EventId[];
  status: "accepted" | "pending" | "deleted";
  /** Not exposed by the public endpoint. */
  guests?: number;
  /** Not exposed by the public endpoint. */
  comments?: string;
  /** Not exposed by the public endpoint. */
  administrativeNotes?: string;
  /** `false` for people who registered as staff or a guest rather than a competitor. */
  isCompeting: boolean;
}

export interface RegistrationInfo {
  openTime: DateTime;
  closeTime: DateTime;
  baseEntryFee: number;
  currencyCode: CurrencyCode;
  onTheSpotRegistration: boolean;
  useWcaRegistration: boolean;
}

export type AssignmentCode =
  | "competitor"
  | "staff-judge"
  | "staff-scrambler"
  | "staff-runner"
  | "staff-dataentry"
  | "staff-announcer"
  | (string & {});

export interface Assignment {
  activityId: number;
  assignmentCode: AssignmentCode;
  stationNumber: number | null;
}

export interface PersonalBest {
  eventId: EventId;
  /** Renamed from `best` in WCIF v2. */
  value: ResultValue;
  type: "single" | "average";
  worldRanking: number;
  continentalRanking: number;
  nationalRanking: number;
}

export interface Event {
  id: EventId;
  rounds: Round[];
  competitorLimit: number | null;
  qualification: Qualification | null;
  extensions: Extension[];
}

/** `"h"` (head-to-head) and `"5"` (best of 5) were added in WCIF v2. */
export type RoundFormat = "1" | "2" | "3" | "5" | "a" | "m" | "h";

export interface Round {
  /** `{eventId}-r{roundNumber}` */
  id: ActivityCode;
  /** Added in WCIF v2 - rounds of a Dual Round, whose results are considered together. */
  linkedRounds: string[] | null;
  format: RoundFormat;
  timeLimit: TimeLimit | null;
  cutoff: Cutoff | null;
  /** Added in WCIF v2, replacing `advancementCondition`. */
  participationRuleset: ParticipationRuleset | null;
  results: Result[];
  scrambleSetCount: number;
  scrambleSets?: ScrambleSet[];
  extensions: Extension[];
}

export interface TimeLimit {
  centiseconds: number;
  cumulativeRoundIds: string[];
}

export interface Cutoff {
  numberOfAttempts: number;
  /** Renamed from `attemptResult` in WCIF v2. */
  resultValue: ResultValue;
}

/** Added in WCIF v2, replacing `AdvancementCondition`. */
export interface ParticipationRuleset {
  /** May only be `null` for competitions from 2021 and before. */
  participationSource: ParticipationSource | null;
  reservedPlaces: ReservedPlaces | null;
}

export type ParticipationSource =
  | { type: "registrations" }
  | { type: "round"; roundId: string; resultCondition: ResultCondition }
  | { type: "linkedRounds"; roundIds: string[]; resultCondition: ResultCondition };

export interface ReservedPlaces {
  nationalities: CountryCode[];
  count: number;
}

/** Added in WCIF v2, shared by `ParticipationRuleset` and `Qualification`. */
export type ResultCondition =
  | { type: "resultAchieved"; scope: "single" | "average"; value: ResultValue | null }
  | { type: "ranking"; scope: "single" | "average"; value: number }
  | { type: "percent"; scope: "single" | "average"; value: number };

export interface Qualification {
  /** Added in WCIF v2. */
  earliestResultDate: Date_ | null;
  /** Renamed from `whenDate` in WCIF v2. */
  latestResultDate: Date_;
  resultCondition: ResultCondition;
}

export interface Result {
  personId: RegistrantId;
  /** `null` while the result is still empty. */
  ranking: number | null;
  attempts: Attempt[];
  best: ResultValue;
  average: ResultValue;
}

export interface Attempt {
  /** Renamed from `result` in WCIF v2. */
  value: ResultValue;
  reconstruction: string | null;
}

export interface ScrambleSet {
  id: number;
  scrambles: string[];
  extraScrambles: string[];
}

export interface Schedule {
  startDate: Date_;
  numberOfDays: number;
  venues: Venue[];
}

export interface Venue {
  id: number;
  name: string;
  latitudeMicrodegrees: number;
  longitudeMicrodegrees: number;
  countryIso2: CountryCode;
  timezone: string;
  rooms: Room[];
  extensions: Extension[];
}

export interface Room {
  id: number;
  name: string;
  color: string;
  activities: Activity[];
  extensions: Extension[];
}

export interface Activity {
  id: number;
  name: string;
  activityCode: ActivityCode;
  startTime: DateTime;
  endTime: DateTime;
  childActivities: Activity[];
  scrambleSetId: number | null;
  extensions: Extension[];
}
