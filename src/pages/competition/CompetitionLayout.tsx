import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { competitors } from "../../lib/competitors";
import { fetchWcif } from "../../lib/wca-api";
import type { Competition } from "../../lib/wcif";
import type { CompetitionContext } from "./useCompetition";

/**
 * The views of a competition, in tab order. `path` is relative to the
 * competition's route; "" is the index view. Each tab needs a matching child
 * route in App.
 */
const TABS: { path: string; label: string }[] = [
    { path: "", label: "Solves" },
];

/** The outcome of loading one competition, kept with the id it belongs to. */
type Loaded =
    | { competitionId: string; wcif: Competition; error: null }
    | { competitionId: string; wcif: null; error: string };

export default function CompetitionLayout() {
    const { competitionId } = useParams<{ competitionId: string }>();
    const [loaded, setLoaded] = useState<Loaded | null>(null);

    useEffect(() => {
        if (!competitionId) return;
        let current = true;
        fetchWcif(competitionId).then(
            (wcif) => {
                if (current) setLoaded({ competitionId, wcif, error: null });
            },
            (err: unknown) => {
                if (current) {
                    const error = err instanceof Error ? err.message : String(err);
                    setLoaded({ competitionId, wcif: null, error });
                }
            }
        );
        return () => {
            current = false;
        };
    }, [competitionId]);

    // A result for another competition (from before navigating) means the
    // current one is still loading.
    const competition = loaded?.competitionId === competitionId ? loaded : null;
    const wcif = competition?.wcif ?? null;
    const competitorCount = useMemo(
        () => (wcif ? competitors(wcif, { attendedOnly: false }).length : 0),
        [wcif]
    );
    const context = useMemo<CompetitionContext | null>(() => (wcif ? { wcif } : null), [wcif]);

    if (!competition) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-muted text-lg">Loading competition data...</p>
                </div>
            </div>
        );
    }

    if (!context) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="bg-surface-alt border border-accent-red/30 rounded-xl p-8 max-w-md text-center">
                    <p className="text-accent-red font-semibold text-lg mb-2">
                        Failed to load competition
                    </p>
                    <p className="text-text-dim text-sm mb-6">{competition.error}</p>
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

    return (
        <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
            <div className="mb-6">
                <Link
                    to="/"
                    className="text-text-dim hover:text-text transition-colors text-sm mb-4 inline-flex items-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Search
                </Link>
                <h1 className="text-3xl font-bold text-text mt-2">{context.wcif.name}</h1>
                <p className="text-text-muted mt-1">
                    {competitorCount} competitors
                </p>
            </div>

            <nav aria-label="Competition views" className="mb-6 flex gap-1 border-b border-border overflow-x-auto">
                {TABS.map(({ path, label }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end
                        className={({ isActive }) =>
                            `-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                    ? "border-primary text-text"
                                    : "border-transparent text-text-dim hover:text-text hover:border-border"
                            }`
                        }
                    >
                        {label}
                    </NavLink>
                ))}
            </nav>

            <Outlet context={context} />
        </div>
    );
}
