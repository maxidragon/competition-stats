import { useMemo } from "react";
import StatsTable, { MutedText, PersonCell, type Column } from "../../components/StatsTable";
import { eventName, eventShortName } from "../../lib/events";
import { calculateKinch, type KinchRow } from "../../lib/kinch";
import type { EventId } from "../../lib/wcif";
import { useCompetition } from "./useCompetition";

const formatScore = (score: number) => score.toFixed(2);

const columnsFor = (eventIds: EventId[]): Column<KinchRow>[] => [
    {
        key: "position",
        header: "#",
        // The overall Kinch position, kept when the table is sorted by an event.
        render: ({ position }) => position,
        cellClassName: "text-text-dim text-sm font-mono",
    },
    {
        key: "name",
        header: "Name",
        compare: (a, b) => a.person.name.localeCompare(b.person.name),
        render: ({ person }) => <PersonCell person={person} />,
    },
    {
        key: "kinch",
        header: "Kinch",
        align: "center",
        compare: (a, b) => a.value - b.value,
        render: ({ value }) => <span className="text-text font-bold">{formatScore(value)}</span>,
    },
    ...eventIds.map(
        (eventId): Column<KinchRow> => ({
            key: `event-${eventId}`,
            header: <span title={eventName(eventId)}>{eventShortName(eventId)}</span>,
            align: "center",
            compare: (a, b) => a.scores[eventId].score - b.scores[eventId].score,
            render: ({ scores }) => {
                const { score, competed } = scores[eventId];
                return competed ? (
                    <span className="text-text-muted text-sm">{formatScore(score)}</span>
                ) : (
                    <MutedText>{formatScore(score)}</MutedText>
                );
            },
        })
    ),
];

/** Kinch per competitor, scoring each round against its own best. */
export default function KinchView() {
    const { wcif, isVisible } = useCompetition();
    const { eventIds, results } = useMemo(() => calculateKinch(wcif), [wcif]);
    const columns = useMemo(() => columnsFor(eventIds), [eventIds]);
    // Filtered after scoring, so hiding someone changes no position or score.
    const rows = useMemo(
        () => results.filter(({ person }) => isVisible(person)),
        [results, isVisible]
    );

    if (results.length === 0) {
        return (
            <p className="text-text-dim text-sm">
                No results yet. The WCA only serves round results in the WCIF while a competition
                is recent.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-text-dim text-sm">
                Each round is scored against that round&apos;s best: 100 × the best result ÷ yours.
                Most events use the average; blindfolded events and Fewest Moves use the single,
                and Multi-Blind uses points and time. No result scores 0. Only the last round you
                reached counts, and reaching a round guarantees you at least what the last person
                to advance into it scored in the round before. Your Kinch is the mean over all{" "}
                {eventIds.length} events held.
            </p>
            <StatsTable
                rows={rows}
                columns={columns}
                rowKey={({ person }) => person.wcaUserId}
                initialSort={{ key: "kinch", dir: "desc" }}
                label="Kinch per competitor"
            />
        </div>
    );
}
