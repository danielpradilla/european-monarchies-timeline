# Product specification

## Objective

Publish an interactive, source-backed timeline that lets a reader compare the major monarchies of Europe on one time axis and understand how crowns continued, split, merged, were conquered, were restored or disappeared.

## Editorial scope

- Timeframe: 27 BCE through 2026 CE
- Geography: European polities plus transcontinental monarchies central to European history
- Coverage: core continental monarchies, predecessor realms needed to explain them, and all surviving sovereign European monarchies
- Depth: selected canonical monarchs rather than an exhaustive succession list
- Periodization: disputed start and end dates must carry an explanatory note or related event
- Sources: record-level citations for historical claims; clearly labelled background references and cached Wikipedia reading; official institutional sources for current sovereigns. Missing direct citations remain visible in the data-quality report.

## Visualization

- Primary desktop form: horizontal, time-aligned polity lanes
- Mobile form: vertical focus view for one selected polity
- Phase bars: constant height; width encodes duration only
- House bands: dated dynasty or ruling-house association inside a polity phase
- Reign marks: selected monarch with a duration line and midpoint dot
- Relationships: typed connectors for continuity, conquest, dissolution, dynastic union, personal union, composite monarchy, partition, restoration and state union
- Story dates: 843, 1066, 1519, 1707, 1815, 1918 and the dated 2026 snapshot (never a rolling “today”)
- Interaction: one keyboard-accessible search for monarchs, dynasties, countries and regions; results identify the country and dates; selection scrolls to and highlights the relevant mark or heading without removing rows; range and exact-year inputs; overview/2×/4× desktop scale
- Related records: clickable phases, reigns, crown connections and contextual events from the detail panel
- Shareable state: year, scale and selected record survive URL reload; old filter URLs never hide rows
- Annual semantics: include records active at any point during the year; a transition-year overlap is not simultaneous rule
- Connections: branch to every endpoint and retain origin/terminal markers; hover and keyboard focus explain each connection
- Wikipedia: exact article mappings and offline extracts with revision, retrieval and license attribution; no runtime search or network requirement

The chart must not use stream width as an unsupported proxy for political power.

## Accessibility

- Native form controls
- Keyboard-focusable marks with descriptive accessible names
- Visible details equivalent to pointer interaction
- Labels and line styles paired with colour
- Reduced-motion support
- Responsive layout down to 320 CSS pixels

## Data architecture

The canonical dataset separates sources, houses, polities, phases, house-rule segments, people, reigns, relationships, events and story presets. See `DATA_MODEL.md`.

## Publication

- Static files live in `www/`
- `npm run build` validates and synchronizes the web data
- GitHub Pages deploys `www/` through GitHub Actions
- The author's own host serves the committed `www/` directory and updates by fast-forward git pull
- No server-side deployment or reset script

## Required editorial artifacts

- Interactive explorer: `www/index.html`
- Methodology and source policy: `www/methodology.html`
- Accompanying essay: `www/blog.html`
- Repository data documentation: `DATA_MODEL.md`
- Generated editorial review queue: `www/quality.html` and `www/data/quality-report.json`
- Full MIT license

## Acceptance and review

- `npm test` and `npm run build` pass with zero structural errors.
- The browser harness passes for navigation, URL restoration and 320/760/1200-pixel layouts.
- Malformed references, impossible graph endpoints, institutional gaps, unsafe URLs and invalid years fail validation.
- Missing direct citations, specialist review and known modelling limits appear as per-record review items. `npm run validate:strict` requires those items to be resolved; regular builds must not silently call the dataset fully verified.
- New scope uses the existing entity model unless a documented case cannot be expressed by it. Exact-day chronology and a separate transition-node system are deferred.
