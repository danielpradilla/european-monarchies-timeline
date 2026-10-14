# The Braided Crowns of Europe

A source-backed interactive timeline of major European monarchies from the Roman Principate to 2026.

The production site combines a horizontal desktop overview with a transposed mobile timeline: time runs down the page and each monarchy is a column. Political phases, ruling houses, selected reigns and typed relationships are stored separately so that personal unions, partitions, restorations and multi-crown monarchs can be represented without pretending they form a simple family tree or quantitative Sankey flow.

“How to read this” in the top navigation (inside Menu on phones) opens an annotated example of Scotland, England and Great Britain from 1590 to 1735. It explains phase bars, house bands, reign marks, connection symbols and annual overlap. Close, Escape or a backdrop click dismisses the guide without changing the selected record or year; the diagram scrolls sideways on narrow screens. The surrounding timeline is not a focus target; keyboard focus indicators remain on its controls.

Click a coloured house band to highlight the monarchy rows (or phone columns) that house rules in the selected year. A new selection moves the year to that period's start if necessary, so its monarchy is highlighted. Other monarchies stay visible and usable. Moving the year updates the highlighted set; clicking the same house again, clicking empty chart space or pressing Escape clears it. Selecting a ruler from another house also clears the highlight; a ruler from the selected house keeps it. On phones, tapping a house band leaves the chart visible and closes any open sheet; use Details to inspect the selected house. Matching uses the dataset's exact house IDs and calendar-year overlap with active institutional phases. House focus is temporary and has no separate URL parameter; house and rule links activate it.

On the horizontal chart, the sticky ruler's blue year handle remains accessible after the top slider scrolls away. An off-center handle follows the pointer until it reaches the middle, then locks there while the chart pans beneath it. Free dragging moves one chart pixel per pointer pixel; centered dragging moves three. At either scroll limit, the handle moves toward the edge; drag it back to the middle to lock again. Sideways scrolling over the chart or ruler also changes the year; Shift+wheel works with a mouse. Wheeling and year keys center the playhead where the scroll limits allow. The horizontal scrollbar selects the year at the viewport center. Arrow keys step one historical year, Page Up/Down ten; Home and End select the dataset's limits. The handle skips year zero. Keyboard focus reveals an off-screen year and underlines its date; high-contrast mode retains an outline. In widescreen mode, ordinary vertical scrolling does not change the year.

In narrow/mobile mode, scrolling up or down through the chart changes the year and updates the selected house's kingdoms. The horizontal year line stays halfway between the sticky country headers and the bottom of the screen, except at the date-range boundaries. Sideways swipes only browse countries. Search, presets, shared links and keyboard focus retain their explicitly selected year during programmatic navigation. Switching between layouts preserves the year; height-only resizing retains pending scroll selections.

Essay and Blog use the WordPress post permalink, `/blog/the-braided-crowns-of-europe/`. That address is unavailable while the post remains a draft.

## Current coverage

- 78 polity lanes
- 149 institutional phases
- 111 ruling houses and offices
- 285 house-rule segments
- 215 people and 266 curated reign records
- 73 typed relationships
- 38 contextual events
- All 12 surviving sovereign European monarchies

The canonical dataset is `data/timeline.json`. See `DATA_MODEL.md` for the schema, `TASKS.md` for the action checklist, and `www/methodology.html` for the public editorial rules.

## Run locally

```bash
npm run build
npm run serve
```

Open <http://localhost:8000>.

You can also open `www/index.html` directly in Safari or another browser. `npm run build` validates the canonical data and generates the file-compatible data bundle in `www/data/`. The deployed site has no runtime dependencies.

Only the active layout is built at startup. The other is prepared when the viewport crosses the 760-pixel breakpoint. Closed snapshot details are rendered when opened.

Generated files are replaced individually through same-directory temporary files and atomic renames. A failed write preserves that file's previous version; the three-file build is not a transaction.

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

The browser harness checks the real explorer, linked details, search navigation without filtering, URL restoration, cached extracts and layouts at 320, 760 and 1200 pixels. It is a manual browser check; CI runs the Node suite. It also covers explicit-year links, mobile menu access, detail focus return, region collapse, house highlighting across year boundaries and clearing actions, ruler keyboard controls and BCE/CE boundaries, center-lock and return from both endpoints, off-screen year focus, and reading-guide dismissal without losing the current selection. Keyboard focus requires a foreground browser window and is explicitly skipped in inactive/background windows.

Resize regressions cover breakpoint changes and pending mobile scroll commits after height changes. Detail regressions cover record swaps, opening the latest snapshot, mobile house-band actions and connection selection.

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
initial-experiments/     Recovered prototypes and new chart experiments for the post
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

## Design experiments

[Dendrogram](initial-experiments/dendrogram.html) groups seven selected 1519 reigns by house and crown, exposing duplicated people and crowns. [Sankey](initial-experiments/sankey.html) keeps those seven associations while switching between explicitly invented ribbon weights. These two pages were created for the post, not recovered from the early commits. They run without external libraries; their groupings and widths do not measure descent, chronology or political power.

## License

Original code, data and writing: MIT. Cached Wikipedia excerpts in `data/wikipedia-extracts.json` and the generated bundle are adapted from Wikipedia contributors under CC BY-SA 4.0; each carries its article URL and revision. Other linked references remain subject to their publishers’ terms.
