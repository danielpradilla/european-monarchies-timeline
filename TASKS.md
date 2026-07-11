# Project status

## Completed for the first publishable edition

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

## Editorial backlog

The site can be published in its current form. Later editions can deepen it without changing the architecture:

- Add scholarly sources for disputed medieval periodization
- Expand selected reigns in underrepresented Tier 2 polities
- Add an optional focused genealogy for individual houses
- Add a synchronized historical map only after reliable boundary data is selected
- Add translations after the English terminology is stable

## Deployment policy

- `master` is the production branch
- GitHub Pages deploys through `.github/workflows/pages.yml`
- The author's web host updates by `git pull --ff-only`
- No server-side deploy script, forced reset or unreviewed data ingestion
