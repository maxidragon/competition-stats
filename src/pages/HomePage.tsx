import CompetitionSearch from "../components/CompetitionSearch";

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent mb-3">
                    Competition Stats
                </h1>
                <p className="text-text-muted text-lg max-w-md mx-auto">
                    Solve counts, sum of ranks and Kinch for any WCA competition
                </p>
            </div>
            <CompetitionSearch />
        </div>
    );
}
