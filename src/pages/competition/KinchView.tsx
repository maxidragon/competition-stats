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

/** Kinch ranks against the best results at this competition. */
export default function KinchView() {
    const { wcif } = useCompetition();
    const { eventIds, results } = useMemo(() => calculateKinch(wcif), [wcif]);
    const columns = useMemo(() => columnsFor(eventIds), [eventIds]);

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
                In each event you score 100 × the best result at this competition ÷ yours: on the
                average for most events, on the better of single and mean for blindfolded events and
                Fewest Moves, and on points and time for Multi-Blind. No result scores 0. Your Kinch
                is the mean over all {eventIds.length} events held.
            </p>
            <StatsTable
                rows={results}
                columns={columns}
                rowKey={({ person }) => person.wcaUserId}
                initialSort={{ key: "kinch", dir: "desc" }}
                label="Kinch per competitor"
            />
        </div>
    );
}
