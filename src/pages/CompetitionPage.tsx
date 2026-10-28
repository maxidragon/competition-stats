import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchWcif } from "../lib/wca-api";
import type { Competition } from "../lib/wcif";

type SortKey = "name" | "events" | "completed" | "attempted";
type SortDir = "asc" | "desc";

function SortIcon({ columnKey, sortKey, sortDir }: { columnKey: SortKey; sortKey: SortKey; sortDir: SortDir }) {
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

export default function CompetitionPage() {
    const { competitionId } = useParams<{ competitionId: string }>();
    const [wcif, setWcif] = useState<Competition | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("completed");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    useEffect(() => {
        if (!competitionId) return;
        setIsLoading(true);
        setError(null);

        fetchWcif(competitionId)
            .then((data) => setWcif(data))
            .catch((err) => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [competitionId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-muted text-lg">Loading competition data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="bg-surface-alt border border-accent-red/30 rounded-xl p-8 max-w-md text-center">
                    <p className="text-accent-red font-semibold text-lg mb-2">
                        Failed to load competition
                    </p>
                    <p className="text-text-dim text-sm mb-6">{error}</p>
                    <Link
                        to="/"
                        className="inline-block px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
                    >
                        ← Back to Search
                    </Link>
                </div>
            </div>
        );
    }

    if (!wcif) return null;

    // Compute solve counts per registrantId
    const solveCounts = new Map<number, { attempted: number; completed: number }>();
    for (const event of wcif.events) {
        for (const round of event.rounds) {
            for (const result of round.results) {
                const existing = solveCounts.get(result.personId) ?? { attempted: 0, completed: 0 };
                for (const attempt of result.attempts) {
                    if (attempt.value !== 0) {
                        existing.attempted++;
                    }
                    if (attempt.value > 0) {
                        existing.completed++;
                    }
                }
                solveCounts.set(result.personId, existing);
            }
        }
    }

    const competitors = wcif.persons.filter(
        (p) => p.registration && p.registration.status === "accepted"
    );

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const sortedCompetitors = [...competitors].sort((a, b) => {
        const ca = solveCounts.get(a.registrantId ?? -1) ?? { attempted: 0, completed: 0 };
        const cb = solveCounts.get(b.registrantId ?? -1) ?? { attempted: 0, completed: 0 };
        let cmp = 0;
        switch (sortKey) {
            case "name":
                cmp = a.name.localeCompare(b.name);
                break;
            case "events":
                cmp = (a.registration?.eventIds.length ?? 0) - (b.registration?.eventIds.length ?? 0);
                break;
            case "completed":
                cmp = ca.completed - cb.completed;
                break;
            case "attempted":
                cmp = ca.attempted - cb.attempted;
                break;
        }
        return sortDir === "asc" ? cmp : -cmp;
    });

    let currentRank = 1;
    const competitorsWithRank = sortedCompetitors.map((person, index) => {
        if (index > 0) {
            const prev = sortedCompetitors[index - 1];
            const prevCounts = solveCounts.get(prev.registrantId ?? -1) ?? { attempted: 0, completed: 0 };
            const currCounts = solveCounts.get(person.registrantId ?? -1) ?? { attempted: 0, completed: 0 };
            
            let isTie = false;
            switch (sortKey) {
                case "name":
                    isTie = person.name === prev.name;
                    break;
                case "events":
                    isTie = (person.registration?.eventIds.length ?? 0) === (prev.registration?.eventIds.length ?? 0);
                    break;
                case "completed":
                    isTie = currCounts.completed === prevCounts.completed;
                    break;
                case "attempted":
                    isTie = currCounts.attempted === prevCounts.attempted;
                    break;
            }
            if (!isTie) {
                currentRank = index + 1;
            }
        }
        return { person, rank: currentRank };
    });

    return (
        <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to="/"
                    className="text-text-dim hover:text-text transition-colors text-sm mb-4 inline-flex items-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Search
                </Link>
                <h1 className="text-3xl font-bold text-text mt-2">{wcif.name}</h1>
                <p className="text-text-muted mt-1">
                    {competitors.length} competitors
                </p>
            </div>

            {/* Table */}
            <div className="bg-surface-alt border border-border rounded-xl overflow-hidden shadow-lg shadow-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface">
                                <th className="px-5 py-3.5 text-text-dim font-semibold text-xs uppercase tracking-wider">
                                    #
                                </th>
                                <th
                                    className="px-5 py-3.5 text-text-dim font-semibold text-xs uppercase tracking-wider cursor-pointer select-none group"
                                    onClick={() => toggleSort("name")}
                                >
                                    <span className="inline-flex items-center gap-1.5">Name <SortIcon columnKey="name" sortKey={sortKey} sortDir={sortDir} /></span>
                                </th>
                                <th className="px-5 py-3.5 text-text-dim font-semibold text-xs uppercase tracking-wider">
                                    WCA ID
                                </th>
                                <th
                                    className="px-5 py-3.5 text-text-dim font-semibold text-xs uppercase tracking-wider text-center cursor-pointer select-none group"
                                    onClick={() => toggleSort("events")}
                                >
                                    <span className="inline-flex items-center justify-center gap-1.5">Events <SortIcon columnKey="events" sortKey={sortKey} sortDir={sortDir} /></span>
                                </th>
                                <th
                                    className="px-5 py-3.5 text-text-dim font-semibold text-xs uppercase tracking-wider text-center cursor-pointer select-none group"
                                    onClick={() => toggleSort("completed")}
                                >
                                    <span className="inline-flex items-center justify-center gap-1.5">Completed <SortIcon columnKey="completed" sortKey={sortKey} sortDir={sortDir} /></span>
                                </th>
                                <th
                                    className="px-5 py-3.5 text-text-dim font-semibold text-xs uppercase tracking-wider text-center cursor-pointer select-none group"
                                    onClick={() => toggleSort("attempted")}
                                >
                                    <span className="inline-flex items-center justify-center gap-1.5">Attempted <SortIcon columnKey="attempted" sortKey={sortKey} sortDir={sortDir} /></span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {competitorsWithRank.map(({ person, rank }) => {
                                const counts = solveCounts.get(person.registrantId ?? -1);
                                return (
                                    <tr
                                        key={person.wcaUserId}
                                        className="border-b border-border/40 hover:bg-surface-hover/50 transition-colors duration-100"
                                    >
                                        <td className="px-5 py-3 text-text-dim text-sm font-mono">
                                            {rank}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-text font-medium">{person.name}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {person.wcaId ? (
                                                <a
                                                    href={`https://www.worldcubeassociation.org/persons/${person.wcaId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary-hover transition-colors text-sm font-mono"
                                                >
                                                    {person.wcaId}
                                                </a>
                                            ) : (
                                                <span className="text-text-dim text-sm italic">
                                                    Newcomer
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center text-text-muted text-sm">
                                            {person.registration?.eventIds.length ?? 0}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="text-accent-green font-semibold">
                                                {counts?.completed ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="text-accent-amber font-semibold">
                                                {counts?.attempted ?? 0}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
