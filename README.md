# The Braided Crowns of Europe

A source-backed interactive timeline of major European monarchies from the Roman Principate to 2026.

The production site combines a horizontal desktop overview with a transposed mobile timeline: time runs down the page and each monarchy is a column. Political phases, ruling houses, selected reigns and typed relationships are stored separately so that personal unions, partitions, restorations and multi-crown monarchs can be represented without pretending they form a simple family tree or quantitative Sankey flow.

## Current coverage

- 78 polity lanes
- 149 institutional phases
- 111 ruling houses and offices
- 285 house-rule segments
- 215 people and 266 curated reign records
- 73 typed relationships
- 38 contextual events
- All 12 surviving sovereign European monarchies

The canonical dataset is `data/timeline.json`. See `DATA_MODEL.md` for the schema, `TASKS.md` for the action checklist, `IMPROVEMENTS.md` for editorial scope and review history, and `www/methodology.html` for the public editorial rules.

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
npm run serve:tests      # Then open http://127.0.0.1:8001/tests/browser.html
```

The browser harness checks the real explorer, linked details, search navigation without filtering, URL restoration, cached extracts and layouts at 320, 760 and 1200 pixels. It is a manual browser check; CI runs the Node suite. It also covers explicit-year links, mobile menu access, detail focus return and region collapse. Keyboard focus requires a foreground browser window and is explicitly skipped in inactive/background windows.

**Passing tests establish structural consistency, not historical accuracy.** The [data-quality page](www/quality.html) lists missing direct citations and known modelling limitations. All 700 dated claims have direct citations; regional specialist review remains an ongoing editorial responsibility.

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

The production site is <https://www.danielpradilla.info/projects/european-monarchies-timeline/>. Deploy the committed contents of `www/` directly to `~/danielpradilla.info/projects/european-monarchies-timeline/` after tests pass; do not create a remote `www/` subdirectory. No server-side build is required because `www/data/timeline-data.js` is committed.

After verifying the new destination, upload `scripts/legacy_redirect.htaccess` as `~/danielpradilla.info/european-monarchies-timeline/.htaccess`. It permanently redirects the old project directory and its optional `www/` prefix to the canonical URL, preserving relative paths and query strings; browsers retain URL fragments. Leave the old files in place.

## Sources and corrections

The publication retains linked Wikipedia pages for broad navigation, while the July 2026 fact-check added official archives, royal institutions, national scholarly encyclopedias and institutional histories for current, disputed and structurally important claims. Traditional or disputed periodization is recorded in notes and precision fields. The September revision adds direct citations, an explicit review queue and checks that prevent impossible transition endpoints and records crossing institutional gaps.

Corrections should name the affected record, propose exact wording or dates, and include a source. Open an issue at <https://github.com/danielpradilla/european-monarchies-timeline/issues>.

`npm run ingest:wikidata` can generate an ignored `data/wikidata_candidates.json` review file for six pilot realms. It restricts candidates to monarchical offices, reports truncation beyond 500 rows per realm, and preserves both prior output files if any request fails. It never edits the canonical timeline; candidates still need source verification.

## Wikipedia cache additions

```bash
npm run refresh:wikipedia
npm run build
npm test
```

Each person or house points to an explicit Wikipedia title (or an existing article URL). This command fetches only missing mapped articles and keeps existing reviewed extracts unchanged. It resolves redirects, rejects disambiguation/missing pages, records revision IDs and retrieval dates, and only replaces the cache after every request succeeds. To correct an existing extract, remove only its cache entry after reviewing the mapping, then rerun the command. Review the diff before committing. Normal builds and exploration never call Wikipedia. The cache is contextual reading, separate from the curated historical claims.

## Extending the timeline

Add records and citations to `data/timeline.json`, reuse stable IDs, and run the build and checks. Ordinary lanes also represent short-lived predecessors, keeping one graph model. The explorer builds ID, polity and search indexes once; there is no backend, framework or runtime dependency. Sicily, Naples and the Two Sicilies have separate lanes. The expanded coverage includes Iberian predecessor kingdoms and Islamic monarchies, Gothic and Lombard Italy, the medieval Italian crown, selected German and Italian territorial monarchies, Balkan principalities, Finland and Iceland. France and Bohemia reuse their existing lanes; Brandenburg and ducal Prussia stay separate so their shared ruler does not imply a state merger. Add finer dates or more selected reigns only when the sources support them; record known limits in notes.

## License

Original code, data and writing: MIT. Cached Wikipedia excerpts in `data/wikipedia-extracts.json` and the generated bundle are adapted from Wikipedia contributors under CC BY-SA 4.0; each carries its article URL and revision. Other linked references remain subject to their publishers’ terms.
