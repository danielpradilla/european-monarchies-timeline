# Project status

## Implemented foundation

- Replaced the six-item sample architecture with normalized shared data
- Added 45 polity lanes, all surviving European monarchies and broad historical coverage
- Separated people from reigns so one person can hold several crowns
- Added typed personal unions, state unions, partitions, conquests, restorations and dissolutions
- Built the horizontal braided timeline and vertical mobile focus view
- Added story dates, a year crosshair, filters, house highlighting and source-backed details
- Added keyboard-accessible marks and reduced-motion support
- Wrote the methodology and accompanying essay
- Added data validation, tests, build scripts and GitHub Pages deployment
- Reconciled package and repository licensing under MIT
- Performed an initial editorial review, followed by the September sourcing pass below

## September 2026 revision

- Added name search, precise year entry, zoom, reset, empty states and shareable URLs
- Linked phases, houses, reigns, events and connections inside the detail panel
- Cached explicit Wikipedia articles with revision and license attribution; removed runtime search
- Added shared pure exploration logic and negative validator tests
- Added a runnable browser harness and a generated per-record review queue
- Corrected union inputs, anachronistic endpoints and Spanish transition-year boundaries; added Joanna, Louis I and Amadeo I

- Added direct citations to all 520 dated claims and specialist or institutional sources to every event and relationship
- Split Sicily, Naples and the Two Sicilies; distinguished Poland’s royal and ducal periods; extended Croatia to 1918
- Added Liechtenstein’s sovereignty and constitutional phases, Savoyard Sicily, and Norway’s August 2026 succession
- Refreshed 269 Wikipedia extracts and preserved source disagreements in date notes

## Editorial backlog

The public data-quality report tracks remaining work. A passing structural check is not a completed historical review:

- Continue replacing broad navigational references with specialist bibliography as new regional editions are developed
- Expand selected reigns in underrepresented Tier 2 polities
- Keep citations current as records change; review disputed early chronologies and remaining selected dynasty gaps
- Add individual shared-reign intervals if the Kalmar and Polish–Lithuanian union frameworks need finer exploration
- Add an optional focused genealogy only after evidence coverage improves
- Add a synchronized historical map only after reliable boundary data is selected
- Add translations after the English terminology is stable

## Deployment policy

- `master` is the production branch
- GitHub Pages deploys through `.github/workflows/pages.yml`
- The author's web host updates by `git pull --ff-only`
- No server-side deploy script, forced reset or unreviewed data ingestion
