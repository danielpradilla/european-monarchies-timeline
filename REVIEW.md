# Spec and implementation review · 5 September 2026

The static architecture remains appropriate. The useful improvements were in the historical graph, record navigation and evidence handling, rather than a framework or backend migration.

## Findings and changes

| Finding | Implemented change |
|---|---|
| Live Wikipedia searches could attach a different subject and overwrite editorial notes. | Explicit article mappings; 269 cached excerpts with article, revision, retrieval date and license. Notes and excerpts have separate sections. Refresh fails without replacing the cache if any request or article validation fails. |
| A reader could reach a detail but could not follow its related records. | Linked phases, house periods, reigns, events and connected polities. All selected reigns are accessible in detail lists, including those omitted from overview labels. |
| Finding a ruler depended on knowing their lane and century. | Accent-insensitive name search, exact-year input, three desktop scales, filter reset and an explanatory empty state. URLs retain exploration state. |
| Repeated array scans were mixed with UI rendering and brittle source-code tests. | Shared pure date/search/snapshot functions and indexes built once; behavior and negative-data tests use the same logic as the explorer. |
| Range validation accepted records crossing institutional gaps; graph inputs could be centuries apart. | Full phase coverage, transition-year endpoint checks, state-union input checks, bounded events/presets and citation/extract validation. |
| Connector geometry averaged multiple inputs into an imaginary starting lane and omitted terminal events. | Branches reach every visible endpoint. Origins, dissolutions and filtered connections remain selectable. |
| Annual overlap was described as simultaneous rule. | Public language now says “active during the year.” Spanish phase boundaries retain 1873 and 1874. BCE/CE positions omit year zero. |
| Some connections contradicted their own notes. | Ireland joins the 1801 union; Verdun has three actual successors; Serbian dynastic continuity is distinguished from full Yugoslav state formation; Italian conquest is separate from Sardinian continuity. |
| Selected reigns omitted rulers needed to understand existing examples. | Joanna’s legal joint reigns, Louis I’s 1724 reign and Amadeo I’s elected kingship are represented. |
| Constitutional offices appeared in a dynasty selector. | The papacy and Andorran co-principate retain office bands but are excluded from dynasty highlighting. Andorra has a distinct 1993 constitutional phase. |
| Typography, detail sections and asset references differed between pages. | Shared typography and surface rules, clearer focus styles, consistent navigation/versioned CSS, and a native nonmodal dialog for details. |
| “Fact-check complete” concealed missing claim-level evidence. | Generated public data-quality report, direct citation fields and a strict editorial gate. Documentation distinguishes structural validity from historical verification. |

## Verification

- `npm test`: 38 checks passed, covering exploration logic, historical regressions, malformed records, Wikipedia refresh behavior, assets and deterministic generated artifacts.
- `npm run build`: offline validation and static generation.
- `npm run test:browser`, then `http://127.0.0.1:8001/tests/browser.html`: 21 checks passed for search, empty/reset states, annual snapshots, related details, cached attribution, keyboard dismissal, zoom, URL restoration and layouts at 320/760/1200 pixels; one foreground focus check was skipped.
- Keyboard focus is checked only in a foreground browser window. The background automation session cannot exercise that check, so the harness reports it as skipped; focus handling uses the native dialog mechanism.
- The direct-file bundle is tested with Node’s JavaScript VM. A direct `file:` browser smoke test was unavailable because the browser tool blocks local-file navigation. HTTP browser tests ran against the local server.
- No deployment, commit or push was performed. Pre-existing uncommitted changes were preserved.

## Citation and coverage pass

The follow-up research replaced the earlier **16/466** citation coverage with **520/520** directly sourced dated claims. All 44 relationships and 29 events now have specialist or institutional references. The validator reports **zero structural errors and zero outstanding automated review flags**. Source categories are validated so an arbitrary label cannot bypass the specialist-source check.

- Separated Sicily, Naples and the Two Sicilies. Bourbon rule continues on the island during the French and Murat governments in Naples; the crowns unite in 1816. Added Victor Amadeus II’s Sicilian reign.
- Distinguished Poland’s royal, ducal and fragmented periods, extended Croatia through 1918, and added Liechtenstein’s 1806 sovereignty and 1862/1921 constitutional boundaries.
- Corrected Ireland’s start to 1541 and ended Great Britain and Ireland in 1800 before their 1 January 1801 union. The validator accepts adjacent predecessor years without falsely keeping them active after dissolution.
- Corrected or split dynasty and reign periods in England, Scotland, France, Bohemia, Denmark, Norway, Hungary and the Holy Roman Empire. Added Norway’s August 2026 succession from the royal court’s announcement.
- Read explicit Wikipedia articles and regnal lists; new claim citations pin the reviewed revision and identify the relevant infobox, dynasty table or section. Refreshed all 269 cached extracts independently of those fixed claim references.
- Added archival, museum and scholarly sources for transitions, including the British unions, Portuguese restoration, Lublin, Italian unification, Byzantine chronology and twentieth-century monarchical endings.

Representative evidence: [UK Parliament on Ireland](https://www.parliament.uk/about/living-heritage/evolutionofparliament/legislativescrutiny/parliamentandireland/overview/poynings-law/), [Turin’s founding law of Italy](https://archiviodistatotorino.cultura.gov.it/iorestoacasa-nascita-regno-italia/), [Liechtenstein Historical Lexicon](https://historisches-lexikon.li/Liechtenstein_%28Land%29), [Torre do Tombo’s 1668 treaty](https://antt.dglab.gov.pt/exposicoes-virtuais-2/tratado-de-paz-de-1668-entre-portugal-e-espanha/), and the record-level citations in `data/timeline.json`.

## Limits retained in the data

Citation coverage measures traceability, not certified historical accuracy. Of the 520 dated claims, 61 also have specialist or institutional references; the other 459 use general references, primarily reviewed Wikipedia biographies or regnal lists. A complete independent regional specialist audit has not been performed. Conflicting chronologies remain explicit for Danylo, Volodymyr, Yurii II, early Scottish and Norwegian kingship, and medieval Bulgaria. Ottoman 1299 is a traditional founding marker within a longer process.

Kalmar and the early Polish–Lithuanian connection intentionally represent interrupted political frameworks; their full spans are not continuous shared reigns. Annual resolution cannot order successive events within 1815 or express the short 1849 Roman Republic as a full-year gap. Selected dynasty bands and reigns remain selective, especially in Croatia and fragmented medieval polities. These are documented scope limits, not missing-source flags.

Use `npm run validate:strict` to prevent new evidence gaps and `npm run report:data` to inspect the generated report. Keep the static model and add finer intervals only when a concrete exploration question and evidence require them.
