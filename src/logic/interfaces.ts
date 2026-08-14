import { Person } from "./wcif";

export interface CompetitionInfo {
  id: string;
  name: string;
  url: string;
  country_iso2: string;
  registration_open: string;
  start_date: string;
}

export interface SOR {
  person: Person;
  value: number;
}

export interface SORWithPosition extends SOR {
  position: number;
}
