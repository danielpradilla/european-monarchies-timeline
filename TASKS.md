# Project todo

Implemented and reviewed 30 September 2026 against the current working tree, including the existing uncommitted changes. This checklist supersedes the earlier numbered review; old item numbers are retained for traceability. Checked items are complete, unchecked items have a concrete remaining action. Deferred ideas are not release requirements.

## Final verification

- Canonical data: 78 polities, 149 phases, 111 houses/offices, 285 rules, 215 people, 266 reigns, 73 relationships and 38 events.
- 700/700 dated claims have direct sources; 208/700 have non-reference support. All 13 ongoing reigns cite official sources directly.
- 324 cached extracts: 269 original entries preserved, 55 new mappings added. No bulk refresh or Wikidata ingestion was used.
- `npm run build`, `npm test` (57/57), strict validation (0 errors/review items) and the browser harness (81/81, no skips, including the 1 October interaction updates) pass. Chromium layouts were checked at 320, 760 and 1200+ px; all 25 new lanes also passed a mobile selection/render check without overflow or application errors. Historical additions were verified by two Astra ultra reviewers and checked by an independent Astra ultra audit; citation presence alone is not a historical guarantee.
- Pre-existing implementation changes were retained and reviewed. Production was not redeployed by this implementation task.

## Priority 1 — browsing and release checks

- [x] **Preserve an explicit URL year when restoring a selection**. `jumpToResult()` accepts a restoration-only year. The browser harness preserves 1918 with England, France, Windsor, Iberia and Charles V; normal search still jumps to the record date.
- [x] **Keep the open mobile menu above the search toolbar**. The positioned header now stacks above the toolbar. All six links pass hit-testing and keyboard-focus checks at 320 px.
- [x] **Repair the browser harness's slider simulation**. The harness dispatches input/change in the browser order, preserves the separate URL-commit check and guards the Louis I link action. It now completes instead of crashing.
- [x] **Cover the reproduced interaction regressions**. Added explicit-year reloads, inactive-polity selections, menu hit tests, Close/Escape focus return and outside-dismissal checks. Six checks failed before the fixes; the suite passes all 57.
- [x] **Restore focus after closing details**. Close and Escape restore the opening mark or toggle, with a visible-control fallback. Outside-pointer dismissal leaves the newly selected control focused.

## Priority 2 — data consistency and evidence

- [x] **Explain or model George V's house change**. Split the continuous reign at the 1917 house-name change. Both reign segments and house bands explain the change, cite the Royal Household, and remain linked through the same person.
- [x] **Add targeted house and duplicate-interval validation**. Validator checks house coverage, office scope and exact duplicate intervals. Joanna’s titular co-rule has a bounded exception with its explanation visible in the reign note. Negative regression checks preserve legitimate co-rule.
- [x] **Reject invalid snapshot dates and flag implausible ones**. Snapshot dates must round-trip as real calendar dates. A snapshot/end-year mismatch raises a review flag unless the metadata explicitly explains it.
- [x] **Review event dates and relationship self-endpoints**. Inactive event references require explicit contextual explanations; unintended self-links are rejected while documented restoration is retained. The exceptions and negative cases have regression checks.
- [x] **Tighten source/cache consistency checks**. Added source-use, duplicate-URL, house-use, cache-key and mapping checks with redirect handling. Missing-only acquisition validates article/revision provenance; the documentation states that structural checks cannot certify arbitrary prose.
- [x] **Remove citation-locator boilerplate**. Removed generic clipping/record-note boilerplate. Record notes and data-model conventions explain boundaries; retained locators identify checked passages.
- [x] **Explain the two unannotated house overlaps**. Hungarian Anjou/Luxembourg and imperial Luxembourg/Wittelsbach bands now explain co-rule or rival claims and attach checked supporting sources.
- [x] **Attach direct institutional citations to ongoing reigns**. All 13 ongoing reigns now carry direct official citations. The validator flags an ongoing reign without one for review.
- [x] **Decide Monaco's constitutional phase coverage**. Retained the coarse restored-principality phase with a sourced note covering the 1911 and 1962 constitutions and intervening suspension.

## Priority 3 — accessibility and layout

- [x] **Highlight selected connections (1 October)**. Clicking a symbol or line makes all its branches thicker and blue, paints them above other connections and dims the other lines. The symbol exposes its selected state. Highlighting survives closing details, and clears when another record is selected or the user clicks outside the connection and its details. Outside clicks also clear the shared selection and restore normal line visibility.
- [x] **Remove the details heading's focus border (1 October)**. Countries, monarchs and connections share the same heading. It still receives focus for accessible reading, but only interactive controls retain visible focus outlines.
- [x] **Jump from links in the information box (1 October)**. Monarch, event, country and connection links use the existing navigation path: update the year, expand the destination region, scroll to the target and keep its details open. Events navigate to the relevant country and date; connections navigate to their symbol. Closing details returns focus to the destination mark.
- [x] **Dismiss the jump outline on outside clicks (1 October)**. The extra ring used to locate a jump destination now clears when clicking elsewhere, including when another connection is selected. Clicking the destination or interacting with its details preserves it. Covered both monarch and connection jumps.
- [x] **Centre connection icons independently of browser fonts (1 October)**. Replaced text glyphs with SVG shapes shared by the legend and chart buttons. Verified every icon's centring and the responsive layout in Chromium; Safari rendering was not directly automated.
- [x] **Pan with the year slider (1 October)**. Slider input immediately centres the chosen year where the chart bounds allow; the sticky ruler follows. Preset jumps retain smooth scrolling, and the URL is still committed only on release. Verified input tracking, edge clamping and a native mouse drag.
- [x] **Review regional ordering and misplaced connection symbols**. See the layout review below. Reordered the nine groups, anchored symbols to actual endpoint rows, separated nearby symbols, named the connected countries in previews and accessible labels, and grouped the mobile selector. No historical data or regional memberships changed.
- [x] **Increase the details-toggle label contrast**. `.detail-toggle span` uses `--ink-soft` on the existing fill (about 7.55:1). The compact control retains the selected title in its accessible name.
- [x] **Make the skip link bypass the heading link**. The explorer skip link targets `#search`. A real Tab/Enter check focuses search; the next Tab reaches the year slider.
- [x] **Fix landmarks and heading levels**. The essay has a main landmark; article wordmarks are no longer h1s; each article has one h1; detail titles/sections use h2/h3. The generated page follows the same structure.
- [x] **Give quality metrics explicit value/label structure**. Generated metrics use a definition list. Browser accessibility-tree inspection confirms three term/definition pairs.
- [x] **Reduce the fixed details toggle's obstruction**. The details toggle stays compact on both desktop and mobile. The browser harness verifies its width and that the final mobile marks can scroll clear of it.
- [x] **Decide whether to narrow the mobile phase block**. Replaced the broad mobile phase box with a 24px strip, leaving space for reign labels. Phase names remain available through accessible names, tooltips and details.

## Layout review — 30 September 2026

The screenshot's Vouillé marker described a Visigothic–Frankish connection. Its position in Britain came from averaging endpoint row positions, not from a historical connection to Britain. Across the expanded dataset, 52 of 73 symbols were outside every country involved, including symbols between rows. Region reordering alone could not correct that.

The implemented order is **Mediterranean → Southeast Europe → Italian states → Iberia → Western Europe → Britain and Ireland → Central Europe → Central and Eastern Europe → Nordics**. This keeps Rome beside Byzantium, Italy near Byzantium and the western kingdoms, Iberia beside Francia, Britain near Hanover, the central/eastern crowns together and Finland near Russia. Within each group, lanes still follow their starting dates. Regional membership is unchanged.

Options assessed:

| Option | Result | Decision |
| --- | --- | --- |
| Keep the previous order; repair symbols only | Removes false placements but retains unnecessarily long cross-region links | Rejected in favour of a clearer order |
| Reorder intact regions and repair symbols | At equal row spacing, reduces summed endpoint spans from 43,078 to 27,494 px (36%). With space added for symbols, the final span is 34,194 px (21% below the original) | Implemented |
| Use the shortest calculated order | A review-only enumeration with Mediterranean first gives 24,986 px at the old spacing, but separates Iberia from Western Europe and places the Nordics between Western and Eastern Europe | Rejected: the modest extra shortening sacrifices geographic readability |

Each symbol now sits below the rulers of its first visible endpoint, at the actual event year. Nearby dates use separate vertical slots. When a region is folded, the symbol moves to another expanded endpoint; connections whose endpoints are all folded disappear. Curves still reach folded region headings when another endpoint is visible. The tooltip and accessible label name all connected countries. A brief guide above the chart explains the interaction; the mobile selector uses native region groups.

The tradeoff is a taller fully expanded chart: 6,342 px of lanes instead of 5,142 px (23%). Space is added only to rows that hold symbols. Long connections and tightly spaced short reigns still exist at this fixed time scale; search, details and region folding remain the navigation tools. Automatic reordering or zoom would be a separate feature, not required to fix this defect.

Verification: every symbol lies inside a connected country's row, below its ruler labels, with no symbol overlap; Vouillé is anchored to the Visigoths. Checked all regions together, all folded, and each of the nine regions expanded alone. The 62-check browser harness passes, including tooltip behaviour, keyboard focus, search, collapse and 320/760/1200 px overflow checks. Desktop regional views were inspected at 1440 px. Historical records and cached sources were not recollected or modified by this layout review.

## Priority 4 — maintenance

- [x] **Remove remaining unused/overridden CSS**. Removed the unused `.site-title`, redundant detail-heading rules and duplicate source-link margin while retaining the intended computed styles.
- [x] **Protect Wikidata candidate files on fetch failure**. Any failed realm request now prevents replacement of both candidate files and exits nonzero. Mocked total and partial failures confirm the prior files survive.
- [x] **Make Wikidata query limits explicit**. The query requires a monarchical office hierarchy and fetches a 501st sentinel row. Outputs and console messages flag truncation beyond 500; no automatic ingestion into canonical data.
- [x] **Clarify tooling labels**. The static-artifact test says working-tree; the manual harness server is now `npm run serve:tests`, with README and harness instructions updated.
- [x] **Add the missing quality-page theme colour**. The quality-page generator now emits the same theme colour as the other pages.

## Completed — historical coverage expansion

Requested 30 September 2026; all items below are implemented using the existing model. The original requested scope is retained here for traceability. The dated records carry sources and modelling notes. Read the implementation choices below alongside these requirements.

- [x] **Asturias and León:** add their own lanes and explain their connections to Castile and Portugal, including the lasting Castile–León union in 1230.
- [x] **Visigothic kingdom:** cover its Gaulish and Iberian phases and the end of its rule, without implying an unbroken succession into later Iberian kingdoms.
- [x] **Ostrogothic kingdom:** add post-Roman Italy and its conquest by the Eastern Roman Empire.
- [x] **Lombard kingdom:** add its Italian rule and Charlemagne's conquest, distinguishing a change of ruler from the disappearance of the crown.
- [x] **Medieval Kingdom of Italy:** represent the Italian crown and its relationship to the Frankish and Holy Roman imperial frameworks; document continuity with Lombard Italy and keep it distinct from the modern Kingdom of Italy.
- [x] **Córdoba:** add the Umayyad emirate and caliphate as distinct phases, with their dissolution explained.
- [x] **Granada:** add the Nasrid monarchy and its conquest by the Catholic Monarchs.
- [x] **Bavaria:** add its ducal, electoral and royal phases as supported by the sources; distinguish membership in the German Empire from the end of its monarchy in 1918.
- [x] **Kingdom of Burgundy / Arles as an event:** record its incorporation into the Holy Roman imperial framework (1032–1033) as a sourced event, not a lane.
- [x] **Burgundian ducal territories:** represent the later ducal composite polity and its inheritance connections to France and the Habsburgs, separately from the Kingdom of Burgundy / Arles event.
- [x] **Wallachia, Moldavia and the United Principalities:** add the predecessor principalities and their shared ruler in 1859, distinguish personal union from institutional unification, and connect the resulting principality to Romania's existing kingdom phase in 1881.
- [x] **Hanover:** add its electoral and royal phases and the shared rulers with Great Britain / the United Kingdom from 1714 to 1837; preserve interruptions and explain why the personal union ended while both monarchies continued.
- [x] **Saxony:** add its relevant ducal, electoral and royal phases and the electors' Polish kingship; model interrupted shared rule with Poland–Lithuania rather than a continuous state union.
- [x] **Duchy of Milan:** add Visconti and Sforza rule and the French/Habsburg transitions, preserving republican interruptions and connecting the relevant Italian Wars events.
- [x] **Kingdom of Bosnia:** add its development from the banate, royal phase and Ottoman conquest, with sourced connections to neighbouring monarchies.
- [x] **French First and Second Empires:** add Napoleonic phases (1804–1814, with the 1815 Hundred Days as a note) and the Second Empire (1852–1870) to the France lane under a Bonaparte house; connect them to the existing Napoleonic appointees in Spain and Naples.
- [x] **Principality of Serbia:** fill the 1815–1882 gap before the existing Kingdom of Serbia phase, with Obrenović and Karađorđević rule.
- [x] **Montenegro:** add the prince-bishopric context, the secular Principality (1852) and Kingdom (1910–1918), and its 1918 connection to Yugoslavia.
- [x] **Brandenburg:** add the Hohenzollern electorate from 1415 as the predecessor phase of Prussia, including the Brandenburg–Prussia personal union from 1618.
- [x] **Albania:** add the 1914 Principality and the 1928–1939 kingdom under Zog I, ending with the Italian invasion.
- [x] **Anglo-Saxon England / Wessex:** add a lane for Wessex (and, if sourced cleanly, the other main kingdoms) leading into the Kingdom of England in 927.
- [x] **Württemberg:** add its ducal, electoral and royal phases alongside Bavaria and Saxony, ending in 1918.
- [x] **Grand Duchy of Tuscany:** add Medici and Habsburg-Lorraine rule through annexation to Italy in 1860, alongside the Duchy of Milan.
- [x] **Duchy of Bohemia:** extend the Bohemia lane back to the Přemyslid duchy (c. 870) before the 1198 royal phase.
- [x] **Grand Duchy of Finland:** add 1809–1917 as a personal union with the Russian emperor.
- [x] **Kingdom of Iceland:** add 1918–1944 as a personal union with Denmark.
- [x] **Document and verify the expanded coverage:** clarify inclusion criteria in `SPECS.md` and `www/methodology.html`; update coverage counts and omissions in README and both essays (`POST.md`, `www/blog.html`). Refresh required Wikipedia extracts, rebuild static data, add historical regression checks for the new transitions, and run validation, tests and browser checks.

Implementation choices: Bavaria begins with the documented Wittelsbach duchy in 1180; Saxony uses Saxe-Wittenberg rather than pretending all earlier Saxon territories are one continuous state. Brandenburg is separate from ducal Prussia to show the 1618 shared ruler. Wessex supplies the selected Anglo-Saxon predecessor lane; other early kingdoms remain outside this pass. Tuscany's monarchy ends in 1859, with annexation to Sardinia in 1860 before the modern Italian kingdom. Disputed early dates and the late medieval Italian framework are qualified in notes.

## Completed or corrected during this review

These items were already present when implementation began.

- [x] Normalized entities, braided desktop timeline, vertical mobile focus, selected reigns, typed connections, cached Wikipedia context, linked details, methodology, essay and data-quality report are present.
- [x] Search navigates without filtering rows; region headings support collapse/expand. Current `SPECS.md` calls for a year slider. The old completed-feature claims about zoom, exact-year entry, reset and filtering are historical, not the current UI contract; do not re-add them as defects.
- [x] All 19 original circa/traditional/disputed dated records already have a qualifying non-reference citation and an explanatory note. The open citation-presence task in `IMPROVEMENTS.md` was stale. This does not certify the sources' interpretation.
- [x] Desktop chart starts higher (old 17): top of the plot scroller is about 302px at 1440×900, versus the earlier report's roughly 430px. Compact controls and the combined status are present.
- [x] The reported mobile `.snapshot-control` cascade conflict (part of old 14) is gone: the 760px single-column rule now follows the 960px two-column rule.
- [x] Unknown house references are already rejected. Only semantic assignments to existing houses remain unchecked.
- [x] Duplicate mobile/desktop toggle findings are merged; broad bibliography replacement is deferred in line with the accepted editorial scope.

## Deferred — select only with a concrete need

- Open Graph/Twitter metadata (old 16): absent, but optional sharing polish rather than a correctness blocker.
- More Tier 2 reigns and finer Kalmar/Polish–Lithuanian shared-reign intervals: selective coverage and interrupted frameworks are documented model limits.
- General-reference replacement: use better sources opportunistically; no wholesale sourcing campaign. Current-sovereign and disputed-date requirements remain distinct.
- Conflicting medieval chronologies: retain documented uncertainty; revisit when stronger evidence resolves it.
- Genealogy, synchronized historical maps and translations: separate feature proposals, requiring evidence/data or stable terminology.

## Implementation scope selected

All pending implementation and historical coverage tasks were selected. Source collection uses GPT-6 Luna; data verification and integration use GPT-6 Astra at ultra reasoning. Existing records are reused; only missing Wikipedia mappings are fetched. Deferred features remain separate.

## Release checklist

- [x] Reviewed and preserved the pre-existing uncommitted implementation changes, including region collapse and search reopening hidden lanes.
- [x] Build, 57 Node tests, strict validation and 57 browser checks passed; inspected the chosen fixes at 320, 760 and 1200+ px.
- [ ] When publishing is requested: commit the intended changes to `master` and deploy committed `www/`.
- [ ] Verify the deployed artifacts after release. The previous production-byte-match claim has not been rechecked here.

Production: `https://www.danielpradilla.info/projects/european-monarchies-timeline/`. No server-side deploy script, forced reset or unreviewed data ingestion.
