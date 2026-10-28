# Competition Stats

Stats for a single WCA competition, computed in the browser from the competition's public
WCIF v2. Search for a competition, open it, and read the numbers.

Live: https://maxidragon.github.io/competition-stats/

## Views

### Solves

How many attempts each competitor made. An attempt counts as attempted when it is not empty,
and as completed when it is a successful result. Only competitors with an accepted registration
are listed.

### Sum of ranks (coming soon)

For every event, each competitor gets their place in the ranking of the last round they reached.
A competitor who did not compete in an event counts as one place behind the last competitor of
its first round, or ties with the competitors there who did not solve. Dual Rounds are ranked as
one stage. The sum over all events gives the overall ranking; lower is better.

### Kinch (coming soon)

For every event, a competitor scores 100 × the best result at the competition ÷ their own best.
Most events use the average; 3BLD, 4BLD, 5BLD and FMC use the better of single and mean.
Multi-blind uses points + (3600 − seconds) / 3600. A competitor with no valid result in an event
scores 0 there. The overall score is the mean over every event held; higher is better.

## Development

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check and build into dist/
npm run lint     # run ESLint
npm run preview  # serve the built dist/ locally
```

## Deploy

Every push to `main` builds the app and publishes `dist/` to the `gh-pages` branch, which
GitHub Pages serves (see `.github/workflows/deploy.yml`).
