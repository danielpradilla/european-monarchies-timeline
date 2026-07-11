# The Braided Crowns of Europe

A source-backed interactive timeline of major European monarchies from the Roman Principate to 2026.

The production site combines a horizontal desktop overview with a focused vertical mobile timeline. Political phases, ruling houses, selected reigns and typed relationships are stored separately so that personal unions, partitions, restorations and multi-crown monarchs can be represented without pretending they form a simple family tree or quantitative Sankey flow.

## Current coverage

- 45 polity lanes
- 57 institutional phases
- 83 ruling houses
- 134 house-rule segments
- 166 people and 187 curated reign records
- 36 typed relationships
- 28 contextual events
- All 12 surviving sovereign European monarchies

The canonical dataset is `data/timeline.json`. See `DATA_MODEL.md` and `www/methodology.html` for the schema and editorial rules.

## Run locally

```bash
npm install
npm run build
npm run serve
```

Open <http://localhost:8000>.

You can also open `www/index.html` directly in Safari or another browser. `npm run build` validates the canonical data and generates both the hosted JSON and the file-compatible data bundle in `www/data/`. The deployed site has no runtime dependencies.

## Test

```bash
npm test
```

The test suite checks dataset references and coverage, production assets, navigation, publication metadata and the synchronized web copy of the data.

## Project structure

```text
data/timeline.json       Canonical curated data
scripts/                 Validation and static-data build scripts
tests/                   Node test suite
www/index.html           Interactive timeline
www/assets/              Production JavaScript and CSS
www/methodology.html     Scope, sources and editorial decisions
www/blog.html            Accompanying long-form essay
www/data/                Generated static copy of the data
www/*prototype*          Earlier design experiments, kept for reference
```

## Publishing

The repository includes a GitHub Pages workflow that builds, validates and deploys `www/` after a push to `master`. Enable GitHub Pages with **GitHub Actions** as the source in the repository settings.

For the author's own web host, point the domain document root at the checked-out `www/` directory. Production updates remain pull-only: run `git pull --ff-only` in the repository after a tested change lands on `master`. No server-side build or reset script is required because `www/data/timeline.json` is committed.

## Sources and corrections

The first publication uses linked Wikipedia references for broad historical navigation and official royal-house pages for current sovereigns. Disputed periodization is recorded in notes rather than hidden behind a single unexplained date.

Corrections should name the affected record, propose exact wording or dates, and include a source. Open an issue at <https://github.com/danielpradilla/european-monarchies-timeline/issues>.

`npm run ingest:wikidata` can generate an ignored `data/wikidata_candidates.json` review file for six pilot realms. It never edits the canonical timeline; the query results are candidates, not automatically accepted history.

## License

MIT. Linked reference material remains subject to its publishers' terms.
