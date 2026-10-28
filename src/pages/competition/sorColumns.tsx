import { MutedText, PersonCell, type Column } from "../../components/StatsTable";
import { eventName, eventShortName } from "../../lib/events";
import type { SORWithPosition } from "../../lib/sor";
import type { EventId } from "../../lib/wcif";

/**
 * Columns of the sum of ranks table: the position from the result, the name,
 * the sum, then the ranking counted in each event, in the order given. The
 * position always comes from the sum, so it stays put when another column is
 * sorted. The sum and the events sort best first on the first click.
 */
export const sorColumns = (eventIds: readonly EventId[]): Column<SORWithPosition>[] => [
    {
        key: "position",
        header: "#",
        render: ({ position }) => position,
        cellClassName: "text-text-dim text-sm font-mono",
    },
    {
        key: "name",
        header: "Name",
        compare: (a, b) => a.person.name.localeCompare(b.person.name),
        render: ({ person }) => <PersonCell person={person} />,
        cellClassName: "whitespace-nowrap",
    },
    {
        key: "sum",
        header: "Sum",
        align: "center",
        compare: (a, b) => a.value - b.value,
        firstDir: "asc",
        render: ({ value }) => <span className="text-text font-bold">{value}</span>,
    },
    ...eventIds.map(
        (eventId): Column<SORWithPosition> => ({
            key: `event-${eventId}`,
            header: <span title={eventName(eventId)}>{eventShortName(eventId)}</span>,
            align: "center",
            compare: (a, b) => a.rankings[eventId].ranking - b.rankings[eventId].ranking,
            firstDir: "asc",
            render: ({ rankings }) => {
                const { ranking, competed } = rankings[eventId];
                return competed ? ranking : <MutedText>{ranking}</MutedText>;
            },
            cellClassName: "text-text-muted text-sm",
        })
    ),
];
