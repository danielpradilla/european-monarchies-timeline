# The Braided Crowns of Europe

A source-backed interactive timeline of major European monarchies from the Roman Principate to 2026.

The production site combines a horizontal desktop overview with a focused vertical mobile timeline. Political phases, ruling houses, selected reigns and typed relationships are stored separately so that personal unions, partitions, restorations and multi-crown monarchs can be represented without pretending they form a simple family tree or quantitative Sankey flow.

## Current coverage

- 53 polity lanes
- 96 institutional phases
- 92 ruling houses
- 215 house-rule segments
- 178 people and 209 curated reign records
- 44 typed relationships
- 29 contextual events
- All 12 surviving sovereign European monarchies

The canonical dataset is `data/timeline.json`. See `DATA_MODEL.md` for the schema, `HISTORICAL_AUDIT.md` for review history and the September 2026 corrections, and `www/methodology.html` for the public editorial rules.

## Run locally

```bash
npm run build
npm run serve
```

Open <http://localhost:8000>.

You can also open `www/index.html` directly in Safari or another browser. `npm run build` validates the canonical data and generates the file-compatible data bundle in `www/data/`. The deployed site has no runtime dependencies.

## Test

```bash
npm test
```

The suite exercises search, year snapshots, BCE/CE arithmetic, negative validation cases, Wikipedia redirects and failed refreshes, historical regressions, and reproducible static builds. No third-party dependencies are required.

```bash
npm run --silent report:data  # Full per-record JSON review queue
npm run validate:strict   # Fails on unresolved editorial items as well as errors
npm run test:browser      # Then open http://127.0.0.1:8001/tests/browser.html
```

The browser harness checks the real explorer, linked details, search navigation without filtering, URL restoration, cached extracts and layouts at 320, 760 and 1200 pixels. It is a manual browser check; CI runs the Node suite. Keyboard focus requires a foreground browser window and is explicitly skipped in inactive/background windows.

**Passing tests establish structural consistency, not historical accuracy.** The [data-quality page](www/quality.html) lists missing direct citations and known modelling limitations. All 520 dated claims have direct citations; regional specialist review remains an ongoing editorial responsibility.

## Project structure

```text
data/timeline.json       Canonical curated data
data/wikipedia-extracts.json  Cached, revision-attributed Wikipedia context
scripts/                 Validation, explicit Wikipedia refresh and static build
tests/                   Node test suite
www/index.html           Interactive timeline
www/assets/              Production JavaScript and CSS
www/methodology.html     Scope, sources and editorial decisions
www/quality.html         Generated per-record editorial review queue
www/blog.html            Accompanying long-form essay
www/data/                Generated static data bundle
```

## Publishing

The repository includes a GitHub Pages workflow that builds, validates and deploys `www/` after a push to `master`. Enable GitHub Pages with **GitHub Actions** as the source in the repository settings.

For the author's own web host, point the domain document root at the checked-out `www/` directory. Production updates remain pull-only: run `git pull --ff-only` in the repository after a tested change lands on `master`. No server-side build or reset script is required because `www/data/timeline-data.js` is committed.

## Sources and corrections

The publication retains linked Wikipedia pages for broad navigation, while the July 2026 fact-check added official archives, royal institutions, national scholarly encyclopedias and institutional histories for current, disputed and structurally important claims. Traditional or disputed periodization is recorded in notes and precision fields. The September revision adds direct citations, an explicit review queue and checks that prevent impossible transition endpoints and records crossing institutional gaps.

Corrections should name the affected record, propose exact wording or dates, and include a source. Open an issue at <https://github.com/danielpradilla/european-monarchies-timeline/issues>.

`npm run ingest:wikidata` can generate an ignored `data/wikidata_candidates.json` review file for six pilot realms. It never edits the canonical timeline; the query results are candidates, not automatically accepted history.

## Wikipedia refresh

```bash
npm run refresh:wikipedia
npm run build
npm test
```

Each person or house points to an explicit Wikipedia title (or an existing article URL). The refresh resolves redirects, rejects disambiguation/missing pages, records revision IDs and retrieval dates, and only replaces the cache after every request succeeds. Review the diff before committing. Normal builds and exploration never call Wikipedia. The cache is contextual reading, separate from the curated historical claims.

## Extending the timeline

Add records and citations to `data/timeline.json`, reuse stable IDs, and run the build and checks. Ordinary lanes also represent short-lived predecessors, keeping one graph model. The explorer builds ID, polity and search indexes once; there is no backend, framework or runtime dependency. Sicily, Naples and the Two Sicilies have separate lanes. Add finer dates or more selected reigns only when the sources support them; record known limits in notes.

## License

Original code, data and writing: MIT. Cached Wikipedia excerpts in `data/wikipedia-extracts.json` and the generated bundle are adapted from Wikipedia contributors under CC BY-SA 4.0; each carries its article URL and revision. Other linked references remain subject to their publishers’ terms.
