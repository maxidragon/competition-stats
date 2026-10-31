import { useMemo } from "react";
import StatsTable, { PersonCell, WcaIdCell, type Column } from "../../components/StatsTable";
import { solvesRows, type SolvesRow } from "../../lib/solves";
import { useCompetition } from "./useCompetition";

const COLUMNS: Column<SolvesRow>[] = [
    {
        key: "name",
        header: "Name",
        compare: (a, b) => a.person.name.localeCompare(b.person.name),
        render: ({ person }) => <PersonCell person={person} />,
    },
    {
        key: "wcaId",
        header: "WCA ID",
        render: ({ person }) => <WcaIdCell person={person} />,
    },
    {
        key: "events",
        header: "Events",
        align: "center",
        compare: (a, b) => a.events - b.events,
        render: ({ events }) => events,
        cellClassName: "text-text-muted text-sm",
    },
    {
        key: "completed",
        header: "Completed",
        align: "center",
        compare: (a, b) => a.completed - b.completed,
        render: ({ completed }) => <span className="text-accent-green font-semibold">{completed}</span>,
    },
    {
        key: "attempted",
        header: "Attempted",
        align: "center",
        compare: (a, b) => a.attempted - b.attempted,
        render: ({ attempted }) => <span className="text-accent-amber font-semibold">{attempted}</span>,
    },
];

/** Attempted and completed solves of every accepted competitor. */
export default function SolvesView() {
    const { wcif, isVisible } = useCompetition();
    const rows = useMemo(
        () => solvesRows(wcif).filter(({ person }) => isVisible(person)),
        [wcif, isVisible]
    );

    return (
        <StatsTable
            rows={rows}
            columns={COLUMNS}
            rowKey={({ person }) => person.wcaUserId}
            initialSort={{ key: "completed", dir: "desc" }}
            showPosition
            label="Solves per competitor"
        />
    );
}
