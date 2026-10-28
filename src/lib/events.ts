import { EventId } from "./wcif";

/**
 * Official WCA event order, with a full name and a short label for table
 * headers. Kept here rather than taken from the WCIF because the WCIF only
 * carries event ids.
 */
const EVENTS: { id: EventId; name: string; shortName: string }[] = [
  { id: "333", name: "3x3x3 Cube", shortName: "3x3" },
  { id: "222", name: "2x2x2 Cube", shortName: "2x2" },
  { id: "444", name: "4x4x4 Cube", shortName: "4x4" },
  { id: "555", name: "5x5x5 Cube", shortName: "5x5" },
  { id: "666", name: "6x6x6 Cube", shortName: "6x6" },
  { id: "777", name: "7x7x7 Cube", shortName: "7x7" },
  { id: "333bf", name: "3x3x3 Blindfolded", shortName: "3BLD" },
  { id: "333fm", name: "3x3x3 Fewest Moves", shortName: "FMC" },
  { id: "333oh", name: "3x3x3 One-Handed", shortName: "OH" },
  { id: "clock", name: "Clock", shortName: "Clock" },
  { id: "minx", name: "Megaminx", shortName: "Minx" },
  { id: "pyram", name: "Pyraminx", shortName: "Pyra" },
  { id: "skewb", name: "Skewb", shortName: "Skewb" },
  { id: "sq1", name: "Square-1", shortName: "Sq-1" },
  { id: "444bf", name: "4x4x4 Blindfolded", shortName: "4BLD" },
  { id: "555bf", name: "5x5x5 Blindfolded", shortName: "5BLD" },
  { id: "333mbf", name: "3x3x3 Multi-Blind", shortName: "MBLD" },
  { id: "fto", name: "Face-Turning Octahedron", shortName: "FTO" },
];

const EVENT_INDEX = new Map(EVENTS.map((event, index) => [event.id, index]));

export const eventName = (id: EventId): string =>
  EVENTS.find((event) => event.id === id)?.name ?? id;

export const eventShortName = (id: EventId): string =>
  EVENTS.find((event) => event.id === id)?.shortName ?? id;

/** Sorts in official WCA order, leaving unknown events at the end. */
export const sortEventIds = (ids: EventId[]): EventId[] =>
  [...ids].sort(
    (a, b) =>
      (EVENT_INDEX.get(a) ?? EVENTS.length) - (EVENT_INDEX.get(b) ?? EVENTS.length)
  );
