import { useMemo, useState, type Key, type ReactNode } from "react";
import { rankWithTies } from "../lib/rank";
import type { Person } from "../lib/wcif";
import Flag from "./Flag";

export type SortDir = "asc" | "desc";

export interface Sort {
  key: string;
  dir: SortDir;
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  /**
   * Orders two rows ascending. A column with a compare function is sortable,
   * and rows it compares as equal share a position.
   */
  compare?: (a: T, b: T) => number;
  render: (row: T) => ReactNode;
  /** Extra classes for the column's body cells. */
  cellClassName?: string;
}

interface StatsTableProps<T> {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => Key;
  initialSort: Sort;
  /** Leading "#" column with positions under the current sort, ties shared. */
  showPosition?: boolean;
  /** Accessible name of the scrollable table region. */
  label: string;
}

const ALIGN_CLASS = { left: "", center: "text-center", right: "text-right" } as const;
const ALIGN_FLEX_CLASS = { left: "", center: "justify-center", right: "justify-end" } as const;

const HEADER_CLASS =
  "sticky top-0 z-10 bg-surface border-b border-border px-5 py-3.5 text-text-dim font-semibold text-xs uppercase tracking-wider";
const CELL_CLASS = "border-b border-border/40 px-5 py-3";

function SortIcon({ columnKey, sortKey, sortDir }: { columnKey: string; sortKey: string; sortDir: SortDir }) {
    if (sortKey !== columnKey) {
        return (
            <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
        );
    }
    return sortDir === "asc" ? (
        <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
    ) : (
        <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}

/**
 * A sortable table of per-competitor stats. Clicking a sortable header sorts
 * by it, descending first; clicking it again flips the direction. Rows that
 * compare as equal keep their input order. The header stays visible while
 * the table scrolls, and wide tables scroll sideways.
 */
export default function StatsTable<T>({
    rows,
    columns,
    rowKey,
    initialSort,
    showPosition = false,
    label,
}: StatsTableProps<T>) {
    const [sort, setSort] = useState<Sort>(initialSort);

    const ranked = useMemo(() => {
        const compare = columns.find((column) => column.key === sort.key)?.compare;
        if (!compare) return rows.map((row, index) => ({ row, position: index + 1 }));
        const sign = sort.dir === "asc" ? 1 : -1;
        const sorted = [...rows].sort((a, b) => sign * compare(a, b));
        return rankWithTies(sorted, (previous, current) => compare(previous, current) === 0);
    }, [rows, columns, sort]);

    const toggleSort = (key: string) =>
        setSort((current) =>
            current.key === key
                ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "desc" }
        );

    return (
        <div className="bg-surface-alt border border-border rounded-xl overflow-hidden shadow-lg shadow-black/20">
            <div
                className="overflow-auto max-h-[80vh] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50"
                role="region"
                aria-label={label}
                tabIndex={0}
            >
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr>
                            {showPosition && <th scope="col" className={HEADER_CLASS}>#</th>}
                            {columns.map((column) => {
                                const align = column.align ?? "left";
                                const className = `${HEADER_CLASS} ${ALIGN_CLASS[align]}`;
                                if (!column.compare) {
                                    return (
                                        <th key={column.key} scope="col" className={className}>
                                            {column.header}
                                        </th>
                                    );
                                }
                                const active = sort.key === column.key;
                                return (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        className={`${className} select-none group`}
                                        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(column.key)}
                                            className={`inline-flex items-center gap-1.5 uppercase tracking-wider cursor-pointer ${ALIGN_FLEX_CLASS[align]}`}
                                        >
                                            {column.header} <SortIcon columnKey={column.key} sortKey={sort.key} sortDir={sort.dir} />
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {ranked.map(({ row, position }) => (
                            <tr key={rowKey(row)} className="hover:bg-surface-hover/50 transition-colors duration-100">
                                {showPosition && (
                                    <td className={`${CELL_CLASS} text-text-dim text-sm font-mono`}>{position}</td>
                                )}
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`${CELL_CLASS} ${ALIGN_CLASS[column.align ?? "left"]} ${column.cellClassName ?? ""}`}
                                    >
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** Muted, italic cell content, for values that are absent rather than zero. */
export function MutedText({ children }: { children: ReactNode }) {
    return <span className="text-text-dim text-sm italic">{children}</span>;
}

const wcaProfileUrl = (wcaId: string) => `https://www.worldcubeassociation.org/persons/${wcaId}`;

/** Flag and name, linked to the WCA profile when the person has a WCA ID. */
export function PersonCell({ person }: { person: Person }) {
    return (
        <span className="inline-flex items-center gap-2.5">
            <Flag countryIso2={person.countryIso2} />
            {person.wcaId ? (
                <a
                    href={wcaProfileUrl(person.wcaId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text font-medium hover:text-primary-hover transition-colors"
                >
                    {person.name}
                </a>
            ) : (
                <span className="text-text font-medium">{person.name}</span>
            )}
        </span>
    );
}

/** The WCA ID linked to the profile, or "Newcomer" for people without one. */
export function WcaIdCell({ person }: { person: Person }) {
    return person.wcaId ? (
        <a
            href={wcaProfileUrl(person.wcaId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-hover transition-colors text-sm font-mono"
        >
            {person.wcaId}
        </a>
    ) : (
        <MutedText>Newcomer</MutedText>
    );
}
