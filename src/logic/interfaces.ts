import { EventId, Person } from "./wcif";

export interface CompetitionInfo {
  id: string;
  name: string;
  url: string;
  country_iso2: string;
  registration_open: string;
  start_date: string;
}

export interface EventRanking {
  /** The ranking that was added to the sum for this event. */
  ranking: number;
  /**
   * False when the competitor did not take part in the event, in which case
   * `ranking` is the imputed one place behind the last competitor.
   */
  competed: boolean;
}

export interface SOR {
  person: Person;
  value: number;
  /** The ranking counted in every event, keyed by event id. */
  rankings: Record<EventId, EventRanking>;
}

export interface SORWithPosition extends SOR {
  position: number;
}

export interface SORResult {
  /** Events that counted towards the sum, in official WCA order. */
  eventIds: EventId[];
  results: SORWithPosition[];
}
