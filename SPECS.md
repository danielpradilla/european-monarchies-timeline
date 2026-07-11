# Product specification

## Objective

Publish an interactive, source-backed timeline that lets a reader compare the major monarchies of Europe on one time axis and understand how crowns continued, split, merged, were conquered, were restored or disappeared.

## Editorial scope

- Timeframe: 27 BCE through 2026 CE
- Geography: European polities plus transcontinental monarchies central to European history
- Coverage: core continental monarchies, predecessor realms needed to explain them, and all surviving sovereign European monarchies
- Depth: selected canonical monarchs rather than an exhaustive succession list
- Periodization: disputed start and end dates must carry an explanatory note or related event
- Sources: linked general references for every polity and relationship; official institutional sources for current sovereigns

## Visualization

- Primary desktop form: horizontal, time-aligned polity lanes
- Mobile form: vertical focus view for one selected polity
- Phase bars: constant height; width encodes duration only
- House bands: dated dynasty or ruling-house association inside a polity phase
- Reign marks: selected monarch with a duration line and midpoint dot
- Relationships: typed connectors for continuity, conquest, dissolution, dynastic union, partition, personal union, restoration and state union
- Story dates: 843, 1066, 1519, 1707, 1815, 1918 and 2026
- Interaction: region, coverage, status and house filters; movable year snapshot; visible source-backed detail panel

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
- Full MIT license
