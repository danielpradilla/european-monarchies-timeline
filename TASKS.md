# TASKS.md

Project interview decisions and task record (explicit)

Decisions recorded
- Project name: european-monarchies-timeline
- Local path: ~/dev/european-monarchies-timeline
- Timeframe: 27 BC (Roman Principate) → 2026
- Geography: Europe proper; include neighbouring polities when historically tied
- Depth: Medium (10–15 notable monarchs per major monarchy)
- Famous monarchs: include canonical figures (e.g., Augustus, Charlemagne, William I, Henry VIII, Louis XIV, Catherine the Great, Peter the Great) — curated list to be compiled
- Events: founding, coronation, union, partition, abdication, revolution, treaty, conquest
- Visualization stack: Vega-Lite for timeline + D3 overlay for relationships
- Data sources: Mix of Wikidata SPARQL + manual curation
- Hosting: GitHub Pages + user host (DreamHost) — deploy scripts to support both
- License: MIT
- Workflow: main branch = master; feature branches & PRs recommended for major work
- Maintenance: document update scripts in scripts/ and schedule manual/CI runs as needed

15-step interview items (status and tasks)

1) Project basics
- Status: Done
- Task: repo scaffold (done)

2) Timeframe & scope
- Status: Done (2026 endpoint)
- Task: SPECS.md updated (done)

3) Geographic scope
- Status: Done
- Task: SPECS.md updated (done)

4) Monarchy model & data schema
- Status: Done
- Task: SPECS.md added (done)

5) Depth per monarchy
- Status: Partial
- Task: Add demo data for 3 pilots (done). Expand to medium depth for pilots (todo).
- Next action: curate 10–15 monarchs for each pilot monarchy (task: data/expand-pilots)

6) Famous monarchs selection
- Status: Partial
- Task: Create data/famous_monarchs.md and populate (todo)

7) Events and granularity
- Status: Pending
- Task: Add event examples to data/events.json and map event types to markers in SPECS (todo)

8) Visualization stack & features
- Status: Partial
- Task: Prototype Vega-Lite page (docs/index.html) added. D3 overlay for relationships (todo)

9) Data pipeline & sources
- Status: Pending
- Task: Create scripts/ingest-wikidata.js (todo)

10) UX / UI / accessibility
- Status: Pending
- Task: Add accessibility checklist and implement in docs (todo)

11) Hosting & deployment
- Status: Partial
- Task: GitHub repo created and pushed. DreamHost deploy script created but SSH auth failed; user prefers deploy script approach (todo: finalize deploy once SSH available)

12) Project workflow & branches
- Status: Pending
- Task: Add CONTRIBUTING.md and branch policy (todo)

13) License & metadata
- Status: Partial
- Task: LICENSE placeholder added; finalize full MIT text (todo)

14) Milestones & deliverables
- Status: Partial
- Task: M1 done; M2 in progress; M3/M4 planned (see SPECS/TASKS)"

15) Maintenance & future features
- Status: Pending
- Task: Add scripts/ and docs/updates.md; add GitHub Actions for scheduled pulls (todo)

Next immediate tasks (explicit)
- data/expand-pilots: curate 10–15 monarchs per pilot (priority)
- scripts/ingest-wikidata.js: initial SPARQL fetch + normaliser
- viz/d3-overlay.js: implement relationship lines over Vega-Lite base
- docs/accessibility.md: accessibility checklist and fixes
- deploy/dreamhost-setup.md: final deploy steps and how-to for host (since SSH failed)

Estimates & owners
- I will take the initial authoring/implementation tasks unless you reassign.
- Expand pilots: 2–4 hours
- Ingest script prototype: 2–3 hours
- D3 overlay prototype: 4–8 hours



