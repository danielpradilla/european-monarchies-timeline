# SPECS.md

Project decision record and data schema

Decisions (recorded)
- Timeframe: start 27 BC (Roman Principate) — end 2026
- Geography: Europe proper; include neighboring polities when historically tied (Byzantium, Balkan states). See territory rules below.
- Depth: medium (10–15 notable monarchs for major monarchies; minimal entries for minor polities)
- Visualization stack: Vega-Lite for timeline + D3 overlay for relationship lines
- Hosting: user will provide hosting later (own site and/or GitHub Pages)
- License: MIT

Data model (core)
- monarchy:
  - id: string (slug)
  - name: string
  - start_year: integer or ISO year
  - end_year: integer or ISO year (use 2026 for continuing)
  - founding_event: string
  - end_event: string
  - dynasties: [string]
  - region: [string]
  - in_scope: boolean

- person:
  - id: string
  - name: string
  - birth_year: integer|null
  - death_year: integer|null
  - reign_start: integer|null
  - reign_end: integer|null
  - dynasty: string|null
  - notes: string
  - source: url

- event:
  - id: string
  - type: enum (founding, coronation, union, partition, abdication, revolution, treaty, conquest)
  - year: integer
  - description: string
  - related_monarchies: [monarchy_id]

Provenance
- Primary sources: Wikidata, Wikipedia; manual curation required for verification.

Update policy
- Documented in README and docs/updates.md. Scripts in scripts/ for re-running data pulls.
