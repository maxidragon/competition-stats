import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSearchCompetition, type ApiCompetition } from "../lib/wca-api";

export default function CompetitionSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ApiCompetition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    const search = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await fetchSearchCompetition(q);
            setResults(data);
            setIsOpen(data.length > 0);
        } catch (err) {
            console.error("Search failed:", err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(query), 350);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, search]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (comp: ApiCompetition) => {
        setIsOpen(false);
        setQuery("");
        navigate(`/competition/${comp.id}`);
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
            <div className="relative">
                <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <input
                    id="competition-search"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder="Search for a WCA competition..."
                    className="w-full pl-12 pr-12 py-4 rounded-xl bg-surface-alt border border-border
                     text-text placeholder:text-text-dim text-lg
                     focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/30
                     transition-all duration-200"
                />
                {isLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div
                    className="absolute z-50 w-full mt-2 rounded-xl bg-surface-alt border border-border
                        shadow-2xl shadow-black/40 max-h-96 overflow-y-auto
                        animate-in fade-in slide-in-from-top-2"
                >
                    {results.map((comp) => (
                        <button
                            key={comp.id}
                            onClick={() => handleSelect(comp)}
                            className="w-full px-5 py-4 text-left hover:bg-surface-hover
                         transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl
                         border-b border-border/50 last:border-b-0 cursor-pointer"
                        >
                            <p className="text-text font-medium text-base">{comp.name}</p>
                            <p className="text-text-dim text-sm mt-0.5">
                                {comp.city}, {comp.country_iso2} &middot; {comp.start_date}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
