import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { MutedText } from "../../components/StatsTable";
import { tiesCompetition } from "../../lib/__fixtures__/scenarios";
import { calculateSor } from "../../lib/sor";
import { sorColumns } from "./sorColumns";

const sor = calculateSor(tiesCompetition);
const columns = sorColumns(sor.eventIds);
const column = (key: string) => columns.find((c) => c.key === key)!;
const byName = (name: string) => sor.results.find((row) => row.person.name === name)!;

describe("sorColumns", () => {
  it("puts position, name and sum before one column per event, in the given order", () => {
    expect(columns.map((c) => c.key)).toEqual(["position", "name", "sum", "event-333", "event-222"]);
  });

  it("does not let the position be re-sorted, so it always shows the sum's position", () => {
    expect(column("position").compare).toBeUndefined();
    expect(column("position").render(byName("Ben Beta"))).toBe(1);
  });

  it("sorts the sum and each event best first on the first click", () => {
    expect(column("sum").firstDir).toBe("asc");
    expect(column("event-222").firstDir).toBe("asc");

    const ordered = [...sor.results].sort(column("event-222").compare!);
    expect(ordered.map((row) => row.person.name)).toEqual([
      "Ben Beta",
      "Ann Alpha",
      "Cid Gamma",
      "Dee Delta",
    ]);
  });

  it("labels an event with its short name and gives the full name as a title", () => {
    const header = column("event-222").header;
    expect(isValidElement(header)).toBe(true);
    expect(header).toMatchObject({ props: { title: "2x2x2 Cube", children: "2x2" } });
  });

  it("dims a ranking that was not competed for and shows a competed one as is", () => {
    expect(column("event-222").render(byName("Ann Alpha"))).toBe(2);

    const absent = column("event-222").render(byName("Dee Delta"));
    expect(isValidElement(absent) && absent.type).toBe(MutedText);
    expect(absent).toMatchObject({ props: { children: 3 } });
  });
});
