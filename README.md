# Competition Stats

Stats for a single WCA competition, computed in the browser from the competition's public
WCIF v2. Search for a competition, open it, and read the numbers.

Live: https://maxidragon.github.io/competition-stats/

## Views

### Solves

How many attempts each competitor made. An attempt counts as attempted when it is not empty,
and as completed when it is a successful result. Only competitors with an accepted registration
are listed.

### Sum of ranks

For every event, each competitor gets their place in the ranking of the last round they reached.
A competitor who did not compete in an event counts as one place behind the last competitor of
its first round, or ties with the competitors there who did not solve. Dual Rounds are ranked as
one stage. The sum over all events gives the overall ranking; lower is better. Only competitors
who registered to compete and have a result in at least one round are ranked.

This view used to be a separate app, [sor](https://github.com/maxidragon/sor), whose history
lives on in this repository.

### Kinch

Each round is scored against that round's best: 100 × the best result in the round ÷ yours.
Most events use the average; 3BLD, 4BLD, 5BLD, FMC and Multi-blind use the single, with
Multi-blind compared on points + (3600 − seconds) / 3600. A round where nobody has an average is
scored on the single, and no valid result scores 0. Dual Rounds count as one round. Only the
last round a competitor reached counts, and reaching a round guarantees at least what the last
person to advance into it scored in the round before: a score `k` in a round with that floor
`p` becomes `k × (1 − p) + p`. The overall score is the mean over every event held, counting
events not entered as 0; higher is better.

Sum of ranks and Kinch need round results, which the WCA only serves in the WCIF while a
competition is recent.

## Development

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check and build into dist/
npm run lint     # run ESLint
npm test         # run the unit tests (Vitest)
npm run preview  # serve the built dist/ locally
```

## Deploy

Every push to `main` builds the app and publishes `dist/` to the `gh-pages` branch, which
GitHub Pages serves (see `.github/workflows/deploy.yml`).
