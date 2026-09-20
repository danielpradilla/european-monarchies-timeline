# Wikipedia reliance and editorial improvement tracker

Assessed 19 September 2026 against the current `data/timeline.json`. This file is the live todo list and the historical record of what was found and fixed. Original findings (18 July 2026) are marked done where the current data/tests confirm the fix; still-open items stay as todos.

## Wikipedia dependency, current numbers

- 390 source records total; 316 (81%) are `en.wikipedia.org` links (`type: reference`). 35 scholarly, 33 official, 3 specialist, 3 primary.
- 520/520 dated claims (phases, rules, reigns) carry a direct source — but only 61/520 (12%) also carry a specialist, scholarly, official or primary source. The other 459 (88%) are backed only by a general reference, almost always Wikipedia.
- All 44 relationships and 29 events have specialist or institutional support (upgraded from the July baseline of mostly-Wikipedia).
- 269 Wikipedia extracts are cached with article, fixed revision ID, retrieval date and CC BY-SA 4.0 attribution — this is sound navigational use, not the concern.

**Verdict: structurally honest, and the Wikipedia dependency is an accepted scope decision, not a defect.** This is a hobby/public-navigation timeline, not a scholarly prosopography, and `www/quality.html` already discloses the 61/520 specialist figure honestly rather than hiding behind "fact-check complete." Wikipedia is a decent source for this use case. The remaining work is disputed/traditional dates specifically (where a wrong popular claim is more likely) and the one structural gap below — not a general Wikipedia-to-scholarly upgrade campaign.

## Todo: sourcing, scoped down

- [ ] For the 19 records flagged `date_precision: circa|traditional|disputed`, confirm each has at least one specialist source, not just Wikipedia — this is where a general reference is more likely to be wrong, unlike the routine biographical claims.
- [ ] Otherwise, no active push to replace general references with scholarly ones — Wikipedia is acceptable for uncontroversial records per the editorial standard below. Upgrade opportunistically if a better source is already on hand, don't go hunting for one.
- ~~Commission independent regional specialist review~~ — out of scope; not a claim this project makes or needs to make.

## Todo: remaining structural/editorial gaps

- [ ] Monaco has no separate phase for the 1911/1962 constitutional settlements — only the 1793 French-annexation gap and 1814 restoration are split out. Liechtenstein (1806/1862/1921) and Andorra (1993) already got this treatment; Monaco didn't.
- [ ] Kalmar (`rel-kalmar`, `union_framework`) and the Polish–Lithuanian connection intentionally represent interrupted frameworks rather than year-by-year shared reigns; add finer intervals only if a concrete exploration question needs them (documented scope limit, not a bug).
- [ ] Conflicting chronologies remain explicit but unresolved for Danylo, Volodymyr, Yurii II, early Scottish and Norwegian kingship, and medieval Bulgaria — fine as documented uncertainty, revisit if a specialist source settles any of them.

## Done: July 2026 publication blockers (verified against current data/tests)

- [x] Yugoslavia connector no longer implies medieval Croatia → Yugoslavia; `rel-serbia-yugoslavia` is `continuity` from Serbia only, with dynastic continuity distinguished from full state formation.
- [x] United Kingdom union now includes Ireland: `rel-united-kingdom` (`state_union`) has `from: ["great-britain", "ireland"]`.
- [x] Croatia lane corrected: Trpimirović band no longer runs past its actual end, and the Croatian crown continues through 1918 instead of stopping at 1102.
- [x] Italian unification reclassified: `rel-sardinia-italy` is `continuity`, with conquest kept separate rather than a neutral bilateral `state_union`.
- [x] "Same moment" language removed from the public site; current copy says a mark is "active during the year." (`grep` for "at the same moment" / "pivotal year" / "It would also lie" in `www/*.html` returns nothing.)
- [x] Failing test claim fixed: `npm test` passes 37/37, `npm run validate:data` reports 0 structural errors, 0 open review items.
- [x] "Fact-check complete" replaced with an honest public data-quality report (`www/quality.html`) distinguishing structural validation from historical verification.

## Done: July 2026 high-priority factual/structural items

- [x] Joanna I added as joint Queen of Castile/Aragon alongside Charles.
- [x] Poland split into crowned and ducal/fragmented periods instead of one continuous 1025–1795 phase.
- [x] Savoy/Sicily/Naples split: Victor Amadeus II's 1713–1720 Sicilian kingship added; Sicily and Naples separated 1282–1816, including the 1806–1815 Bourbon-Sicily/Napoleonic-Naples split.
- [x] Francia partition no longer points straight to the Holy Roman Empire: `rel-frankish-partition` (`partition`) goes to France, Middle Francia and East Francia.
- [x] Kalmar Union reworked as `union_framework` rather than one continuous personal union.
- [x] Nueva Planta sequence reclassified as `constitutional_reorganization` rather than `state_union`.
- [x] Portuguese restoration modeled as ending a union (`restoration`, Portugal → Portugal), not flowing out of Spain.
- [x] Andorra split at 1993; Liechtenstein split at 1806/1862/1921 (more granular than the original ask).
- [x] Houses vs. elective offices separated: papacy and Andorran co-principate carry `kind: "office"` and are excluded from the dynasty selector.

## Done: data model and validation

- [x] `citations` (source + optional locator), `sources`, `date_precision` (`circa`/`traditional`/`disputed`), and `review_note` added to phases, rules and reigns (`DATA_MODEL.md`). Simpler than the original proposal (no separate `phase_kind`/`sovereignty_status`/`certainty` fields) but covers the same need.
- [x] Validation now checks: state-union inputs ≥ 2, relationship endpoints active in the transition year, rules/reigns can't cross institutional gaps, uncertain dates require a note, citations reference real sources. Regression tests pin the historically consequential corrections.
- [x] `npm run validate:strict` fails the build on unresolved editorial review items, not just structural errors.

## Not re-verified this pass

- Whether every one of the 459 general-reference-only claims is individually still correct — citation coverage confirms traceability, not certified accuracy. Not treated as a blocker; see scope note above.

## Editorial standard

- Separate crowns, dynasties, composite monarchies and states; sharing a ruler is not a state merger.
- Treat conventional foundation years as periodization choices where the evidence does not support a clean date.
- Distinguish asserted titles, effective rule and recognition by other powers.
- Preserve interruptions, rival reigns and republics where the annual model can show them; explain sub-year cases in notes.
- Prefer institutional or specialist sources for constitutional acts, current sovereigns and disputed chronology; use Wikipedia for broad navigation and routine claims.

## Historical correction record

- Reframed 395 as a lasting division between Roman imperial courts; split the eastern Roman lane at 1204 and 1261.
- Corrected Majorian's house assignment, elective imperial dynasty bands and the non-Carolingian rulers of West Francia.
- Added the English Interregnum and Scotland's Cromwellian interruption; corrected Stephen of Blois, Macbeth and Lulach dynasty bands.
- Marked traditional Scottish and Norwegian foundation dates as uncertain and corrected early Aragonese and Navarrese dynasties.
- Expanded the 1707–1716 Nueva Planta sequence, the Bonaparte monarchy, the First Spanish Republic and Louis I's 1724 reign.
- Corrected Polish and Hungarian dynasty periods; split Sicily and Naples after 1282; added Monaco's annexation gap and the Papal States' revolutionary interruptions.
- Qualified Croatian succession and the 1102 settlement; reclassified Denmark–Norway as a composite monarchy.
- Corrected royal title changes and replaced a single 1918 collapse claim with the 1917–1922 sequence.
- Verified the 2024 Danish, 2025 Luxembourg, Andorran and Vatican, and 2026 Norwegian transitions against official sources.

## September 2026 implementation review

- Replaced live Wikipedia lookup with 269 fixed-revision cached excerpts and explicit article mappings.
- Added linked detail records, accent-insensitive search, exact-year input, zoom, reset, empty states and shareable URLs.
- Moved date, search and snapshot logic into shared pure functions and built lookup indexes once.
- Added institutional-gap, relationship-endpoint, union-input, bounded-event and citation validation.
- Fixed relationship geometry so every visible endpoint is represented and terminal relationships remain selectable.
- Standardized navigation, typography, focus styles and the native detail dialog across pages.
- Generated a public data-quality report that distinguishes structural validity, citation coverage and historical certainty.

## Model limits

The timeline is selective, not a complete ruler list. Annual resolution cannot order events within one year, such as the Hundred Days, the Spanish transitions of 1873–1874 or the Roman Republic of 1849. Medieval territorial boundaries are not encoded. Selected dynasty bands and reigns remain selective, especially in Croatia and fragmented medieval polities.

Use `npm run validate:strict` to prevent new evidence gaps and `npm run report:data` to inspect the generated report. Keep the static model and add finer intervals only when a concrete exploration question and evidence require them.
