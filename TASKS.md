# TASKS.md

Project interview decisions and task record (explicit)

Deployment strategy
- NO custom deployment scripts will be used on the server.
- Server updates will be performed by explicit git pulls (manual or via CI that performs only a pull).
- I removed the server-side deploy.sh. If you want automated pulls, we will implement a GitHub Action that SSHes to the server and runs a pull, or configure a webhook receiver on the server that triggers a safe `git fetch && git reset --hard origin/master`.

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
- Hosting: GitHub Pages + user host (DreamHost) — deploy by pull only
- License: MIT
- Workflow: main branch = master; feature branches & PRs recommended for major work
- Maintenance: document update scripts in scripts/ and schedule manual/CI runs as needed

(15-step items omitted for brevity — see earlier TASKS for full mapping)
