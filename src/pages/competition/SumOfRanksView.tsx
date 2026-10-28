import { useMemo } from "react";
import StatsTable from "../../components/StatsTable";
import { calculateSor } from "../../lib/sor";
import { sorColumns } from "./sorColumns";
import { useCompetition } from "./useCompetition";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Sum of ranks: every competitor's rankings added up over all events. */
export default function SumOfRanksView() {
    const { wcif } = useCompetition();
    const { eventIds, results } = useMemo(() => calculateSor(wcif), [wcif]);
    const columns = useMemo(() => sorColumns(eventIds), [eventIds]);

    if (eventIds.length === 0) {
        return (
            <div className="bg-surface-alt border border-border rounded-xl p-8 text-center">
                <p className="text-text font-semibold text-lg mb-2">No results available yet</p>
                <p className="text-text-dim text-sm max-w-lg mx-auto">
                    The WCA only serves round results in the WCIF while a competition is recent, so
                    the sum of ranks can't be calculated for this one.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-text-muted text-sm">
                {plural(results.length, "competitor")}, {plural(eventIds.length, "event")}. The
                columns after the sum are the ranking counted in each event. A dimmed one was not
                competed in and counts as one place behind the last competitor of the first round,
                or ties with them when they did not solve either. Each competitor's ranking is from
                the last round they reached.
            </p>
            <StatsTable
                rows={results}
                columns={columns}
                rowKey={({ person }) => person.registrantId}
                initialSort={{ key: "sum", dir: "asc" }}
                label="Sum of ranks per competitor"
            />
        </div>
    );
}
