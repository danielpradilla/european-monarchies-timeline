# Historical and editorial assessment

This is the initial findings log. For implemented corrections, current evidence coverage and remaining limits after the follow-up research, see [REVIEW.md](REVIEW.md).

Assessment date: 18 July 2026

September update: this historical assessment is retained as a review record. Several blockers have since been corrected; `HISTORICAL_AUDIT.md` describes the changes, and `www/quality.html` is the current per-record review queue. The earlier test failure described below is no longer current. Remaining structural/editorial limits are attached to affected records.

Reviewed: the canonical dataset, public explorer, methodology, essay, data model, historical audit, validator and tests.

## Overall verdict

The project has a strong foundation. Separating people, reigns, houses, crowns, phases and relationships is the right approach, and the notes on disputed dates are unusually responsible for a public timeline. The treatment of 395, 962, the English Interregnum, the 1917–1922 sequence of imperial collapse, current sovereigns and several disputed medieval starting dates is substantially better than the usual national-dynasty chart.

It is not yet safe to call the edition "fact-check complete" or "publishable in its current form." The principal weakness is no longer a handful of wrong dates. It is the historical meaning created by the graphic model. Several connectors make claims that the accompanying prose immediately qualifies or denies. A reader sees the line before reading the note, so the line must itself be defensible.

The urgent work is to correct those relationships, add claim-level sourcing and stop describing an annual overlap as a view of who ruled "at the same moment." The prose needs a lighter edit after the historical model is repaired.

## What already works

- The project distinguishes a person from the offices and crowns held by that person.
- Interruptions are represented for England, France, Spain, Greece, Monaco, the papal territories and others.
- Several traditional dates are labelled as conventions rather than facts.
- The current sovereigns and the 2024–2025 transitions are linked to official institutions.
- The essay explains why duration can be encoded while political power cannot.
- The public notes generally acknowledge composite monarchy, rival rule, changing titles and contested legitimacy.
- The validator catches broken references and malformed chronology.

These are worth preserving. The next revision should tighten the history without replacing the architecture wholesale.

## Publication blockers

### 1. The Yugoslavia connector is historically wrong as encoded

Record: `rel-serbia-yugoslavia`

The connector runs from the medieval `croatia` lane, which ends in 1102, to Yugoslavia in 1918. The description then says that this is not a claim that medieval Croatia passed directly into Yugoslavia. Visually, however, that is exactly the claim the connector makes. It also mentions the State of Slovenes, Croats and Serbs and Montenegro without representing either as an input.

Fix:

- Remove medieval Croatia from this edge.
- Add a short-lived State of Slovenes, Croats and Serbs entity or a non-lane transition node for October–December 1918.
- Add the Kingdom of Montenegro as an input, or state explicitly that the visualization is showing only the Serbian dynastic contribution rather than the formation of the state.
- If a Croatia line is retained, extend and remodel the Croatian institutional history through the Croatian-Hungarian and Habsburg periods instead of jumping from 1102 to 1918.

The [Croatian Encyclopedia](https://www.enciklopedija.hr/clanak/hrvatska-drzava) describes Croatia entering the State of Slovenes, Croats and Serbs in 1918 before the new state joined Serbia. That intermediate entity cannot be replaced by a line from a medieval kingdom.

### 2. The United Kingdom is created without Ireland

Record: `rel-united-kingdom`

The edge is typed as a `state_union`, but its only input is Great Britain. The Kingdom of Ireland is absent even though the label and description say "Union with Ireland." This is a factual omission in the graph, not merely a scope choice.

Fix:

- Add a Kingdom of Ireland phase or a compact transition-only entity.
- Encode Great Britain plus Ireland as the inputs to the United Kingdom in 1801.
- Distinguish the 1801 United Kingdom of Great Britain and Ireland from the post-1922 settlement and the official 1927 name.

The [UK Parliamentary record](https://www.parliament.uk/about/living-heritage/evolutionofparliament/legislativescrutiny/parliamentandireland/overview/repeal/) states that the union between Great Britain and Ireland took effect on 1 January 1801.

### 3. The Croatia lane ends the crown in 1102 and extends the wrong dynasty to that date

Records: `croatia-medieval`, `rule-croatia-trpimirovic`, `rel-croatia-hungary`

There are two separate problems:

- The Trpimirović band runs to 1102. The [Croatian Encyclopedia's Stephen II entry](https://enciklopedija.hr/clanak/stjepan-ii-kralj) identifies him as the last member of the dynasty and dates his reign to 1089–1090. The 1090s succession struggle cannot be coloured as uninterrupted Trpimirović rule.
- The lane ends in 1102 even though its own relationship note says Croatia retained distinct institutions under a shared crown. The [Croatian Encyclopedia](https://www.enciklopedija.hr/clanak/hrvatsko-ugarsko-kraljevstvo) treats the Croatian-Hungarian political community as lasting from the traditional date of 1102 to 1918 and says Croatia retained a separate kingdom in the royal titulature and its own political institutions.

Fix:

- End the Trpimirović band in 1090.
- Represent 1090–1102 as a disputed succession and conquest/settlement period.
- Continue the Croatian crown after 1102 in one or more qualified phases, including the 1848 break and the 1868 Croatian-Hungarian Settlement.
- Do not force the entire 1102–1918 relationship into the simple category `personal_union`; its constitutional character changed.

### 4. Italian unification is misclassified as a neutral state union

Record: `rel-sardinia-italy`

The Kingdom of the Two Sicilies did not join Piedmont-Sardinia through a bilateral constitutional state union comparable to the Acts of Union. Garibaldi's forces overthrew the Bourbon monarchy; Piedmontese forces intervened; plebiscites were held under those conditions; and the territory was annexed to the Kingdom of Sardinia before the proclamation of Italy.

Fix:

- Replace `state_union` with a more accurate sequence: conquest/revolution, plebiscitary annexation and constitutional continuation or transformation of the Sardinian state.
- Add Tuscany, the central duchies and the papal territories as event inputs if the graphic claims to explain the formation of Italy.
- Treat Venetia in 1866 and Rome in 1870 as later additions rather than implying that 1861 completed territorial unification.

[Treccani](https://www.treccani.it/enciclopedia/regno-delle-due-sicilie/) describes the overthrow and annexation of the Two Sicilies; its [Risorgimento overview](https://www.treccani.it/enciclopedia/risorgimento_%28Dizionario-di-Storia%29/) also records the separate annexations and later additions.

### 5. A year snapshot is not "the same moment"

Files: `www/index.html`, `www/assets/app.js`, `DATA_MODEL.md`

The public promise says a reader can stop at a year and see who ruled "at the same moment." The implementation treats both starts and ends as inclusive. It therefore counts every phase or reign that existed at any point during the calendar year.

At 1707, England, Scotland and Great Britain can all be active in the snapshot. At 1801, Great Britain and the United Kingdom can both be active. At 1724, Philip V and Louis I can both be active. These records overlap within a year, but not at one moment.

Choose one of two fixes:

- Preferred: add optional ISO dates and use exact dates when they are known. Keep years as the visual scale, but calculate snapshots from dates.
- Minimum: change all public language to "active during this year," label transition years, and stop using "same moment."

The schema should also record date precision: `exact`, `year`, `circa`, `traditional` or `disputed`. Uncertainty should not exist only inside prose notes.

### 6. "Source-backed" currently promises more than the data can show

The dataset has 80 source records:

- 52 general references, all of them Wikipedia links
- 12 scholarly or national-reference works
- 15 official sources
- 1 primary source

At the top level, 25 of 48 polities, 33 of 40 relationships and 22 of 28 events are supported only by Wikipedia links. Of 174 person links, 160 go to Wikipedia.

More importantly, phases, house-rule bands and reigns have no `sources` field. A reign detail inherits the polity bibliography and adds a person link; a specific note does not identify the work that supports it. A reader cannot tell which source supports Majorian's house assignment, a disputed accession date or a constitutional interpretation.

Fix:

- Add `sources` to phases, rules and reigns.
- Add a claim-level citation object with an optional page, section or quoted document title.
- Separate "read more" links from evidence used for the claim.
- Give every disputed note at least one specialist source and, where national historiographies disagree, more than one.
- Retain Wikipedia as navigation, but do not count it as the completed scholarly apparatus.

Until this is done, replace "fact-check complete" with "editorially reviewed; specialist sourcing in progress."

### 7. The published test claim is currently false

On 18 July 2026, `npm run validate:data` passed, but `npm test` reported 20 passing tests and one failure. `tests/site.test.js` expects unversioned script tags while `www/index.html` now uses cache-busting query strings.

This is not a historical error, but it contradicts the claim that the edition is ready to publish. Repair the assertion or centralize the asset-version convention, then require a clean test run before release.

## High-priority factual and structural corrections

### Joanna I is missing from the project's central example

The essay correctly says Charles ruled jointly with his mother Joanna, and the Charles reign note repeats it. Joanna has no person or reign record, so the 1519 snapshot erases the legal co-ruler whose position the prose asks the reader to understand.

Add Joanna I as Queen of Castile from 1504 to 1555, with the appropriate Aragonese succession and joint-title qualification from 1516. Distinguish legal possession of the crowns from the exercise of government. A useful starting reference is the [Encyclopedia of Early Modern Europe entry](https://www.encyclopedia.com/history/encyclopedias-almanacs-transcripts-and-maps/joanna-i-mad-spain-1479-1555).

### The Poland phase claims a continuity that its own source rejects

Record: `poland-monarchy`

The phase runs continuously from 1025 to 1795 even though its note admits long periods of ducal rule and fragmentation. The house bands are split, but the phase bar still tells the reader that a Polish monarchy or royal crown remained continuously active.

The project's own [Polish educational source](https://zpe.gov.pl/a/reunited-kingdom-of-poland/D43snAR7y) describes more than two centuries between coronations, a fragmented former monarchy and a restored kingdom in 1295 and again in 1320.

Split the phase into crowned kingdoms and periods of ducal fragmentation, or rename and restyle the lane so it does not read as an uninterrupted royal institution.

### The Savoy and Sicilian lanes cannot support their current labels

Records: `savoy-duchy`, `rule-sicily-bourbon-a`, `rule-sicily-bourbon-b`

- The Savoy phase remains "Duchy of Savoy" until 1720, omitting Victor Amadeus II's kingship of Sicily from 1713 to 1720. [Treccani](https://www.treccani.it/enciclopedia/vittorio-amedeo-ii-di-savoia_%28Dizionario-Biografico%29/) dates his assumption of the Sicilian royal title to 1713 and the exchange for Sardinia to 1720.
- The Bourbon band disappears from the combined Sicily/Naples lane between 1806 and 1815 even though Ferdinand retained Sicily. The note admits this. The [U.S. Office of the Historian](https://history.state.gov/countries/two-sicilies) distinguishes Bourbon Sicily from Napoleonic Naples during these years.

The clean solution is to split island Sicily and mainland Naples into separate lanes from 1282 to 1816. Notes cannot rescue a single dynasty band that means one crown in some years and both crowns in others.

### Francia should not point directly to the Holy Roman Empire in 843

Record: `rel-frankish-partition`

The Treaty of Verdun produced West Francia, Middle Francia and East Francia. The direct line from Francia to a Holy Roman Empire lane beginning in 962 suppresses East Francia and makes later imperial development look inevitable.

Add East Francia as an intermediate phase or transition node, and represent Middle Francia rather than silently discarding it. The [German Historical Museum](https://www.dhm.de/mediathek/en/web/ida0/timeline/strasbourg1/?backlinkAnchor=content-394) gives the three-part division and describes the later development of East Francia.

### The Kalmar Union should not be one uninterrupted personal-union duration

Record: `rel-kalmar`

The note says Sweden repeatedly rejected or displaced union kings, but the 1397–1523 duration is drawn continuously. Split the Swedish relationship into actual periods of shared monarchy or use a union framework with explicit breaks. Aarhus University's [history of late-medieval Denmark](https://danmarkshistorien.dk/fileadmin/filer/E-boeger_-_pdf/3-Senmiddelalderen.pdf) notes that Hans ruled Sweden only in 1497–1501 and Christian II in 1520–1521.

### The Nueva Planta sequence is not well represented by `state_union`

Record: `rel-spain-centralization`

The description is careful, but the type and single 1716 date are not. The decrees were a sequence imposed after conquest in the War of the Spanish Succession. They did not merge two coequal states on one date, and Navarre and the Basque territories remained outside the same institutional settlement.

Add a `constitutional_reorganization` or `incorporation` type and allow a dated sequence. Keep the 1707–1716 range visible.

### Portuguese restoration should end a union, not flow out of Spain

Record: `rel-portugal-restoration`

Portugal remained a distinct crown during the Iberian Union. A line from Spain to Portugal suggests that Portugal was recreated from Spanish statehood. Model 1640 as the termination of a personal/composite union and a contested dynastic succession, with international recognition in 1668.

### Andorra needs a 1993 constitutional phase

Record: `andorra-coprincipality`

The paréages of 1278 are the origin of the co-princely institution, but the present sovereign parliamentary co-principality dates from the 1993 Constitution. The single 1278–present phase flattens feudal co-lordship and a modern state into one constitutional form.

Split the phase at 1993. The [Andorran General Council](https://www.consellgeneral.ad/ca/el-consell-dandorra/el-consell-general-en-la-historia/constitucio-i-sobirania-plena) says the Constitution made Andorra a fully sovereign and independent state with sovereignty vested in the Andorran people.

Apply the same principle to Liechtenstein in 1806 and Monaco in 1861: the principality, sovereignty and present constitutional order are not always coextensive.

### "House" is being used for things that are not houses

`Elective papacy` and `Co-princes of Andorra` appear in the `houses` collection and in a UI labelled "Highlight a house." Neither is a dynasty.

Replace `houses` with a broader `ruling_associations` model carrying a subtype such as `dynasty`, `cadet_branch`, `elective_office` or `institution`, or keep houses strict and render papal and Andorran office-holders separately.

## Scope and selection

The phrase "major European monarchies" is not yet operationally defined. The current selection can look arbitrary: Serbia is Tier 1 while Croatia is Tier 2; Ireland and Montenegro are absent even when needed to explain states already shown; East Francia is omitted while a direct line to the Holy Roman Empire is retained.

Add an inclusion rationale to every polity:

- required to explain a constitutional transition;
- required to explain a multi-crown monarch;
- regionally consequential within a stated period;
- surviving sovereign monarchy;
- included as a comparative case.

Add a second class of compact "transition entities" for states or crowns that are necessary to make a relationship true but do not warrant a full lane. Ireland in 1801, East Francia after 843 and the State of Slovenes, Croats and Serbs in 1918 are immediate candidates.

Do not use "core continental story" as if there were one agreed European master narrative. Call it the project's comparative selection and publish the criteria.

## Prose assessment

The writing is not uniformly AI-like. The essay has a clear authorial idea and is much better than generic generated heritage prose. Its weaker passages feel over-produced because they stack rhetorical contrasts, defensive negations and polished applause lines.

The methodology contains 13 uses of "not"; the essay contains 12. Repetition of "not a claim," "does not mean," "not a final answer" and "does not pretend" creates a defensive pattern. Some negation is necessary, but the caveat should usually be encoded in the data or stated once in direct positive language.

Phrases to revise:

| Current wording | Problem | Better direction |
|---|---|---|
| "the kingdoms, empires, dynasties and personal unions that shaped Europe" | Inflated causal claim and a polished list | "selected European crowns, ruling houses and unions" |
| "see who ruled at the same moment" | Factually unsupported at annual resolution | "see which recorded reigns overlapped that year" |
| "Jump to a pivotal year" | Automatic drama | "Jump to a featured year" |
| "It would also lie." | Overdramatic and anthropomorphic | "A Sankey would imply a quantity that the dataset does not contain." |
| "Europe does not give you a tree. It gives you a graph with a habit of tying itself in knots." | Stacked metaphor and familiar AI cadence | "Dynastic succession forms a network rather than a hierarchy." |
| "Charles V breaks the one-person, one-country model" | Trailer-style heading | "Charles V and rule across several crowns" |
| "a small database decision with a large visual payoff" | Product-marketing cadence | State what the separation lets the reader compare |
| "A national timeline shows one collapse. The shared axis shows a political system coming apart across the continent." | Treats different monarchies and revolutions as one system | Name the separate 1917, 1918 and 1922 abolitions and avoid a single-cause implication |
| "There is no honest way to draw this using today's countries" | Moralizes a modelling choice | "Modern-state rows would collapse distinct historical polities." |
| "Good. The mess is part of the subject." | Scripted applause line | "The overlap is historically informative and should remain visible." |
| "It gives the disagreement somewhere to live." | Vague personification | "Alternative dates are stored in the note and source record." |

Two sample rewrites:

> A Sankey diagram is unsuitable because line thickness would require a comparable quantity across all periods. This dataset contains dates and relationships, not a consistent measure of territory, population, revenue or military capacity.

> Russia's monarchy ended in 1917, the German and Austro-Hungarian monarchies in 1918, and the Ottoman sultanate in 1922. Their causes and constitutional outcomes differed; the shared scale is useful because it makes the chronology comparable without treating them as one event.

Other editorial changes:

- Reduce "broad," "major," "central," "principal," "consequential" and "pivotal" unless the sentence gives a criterion.
- Prefer named historians, institutions or documents to "modern scholarship."
- Avoid turning every caveat into a negative parallelism. Say what a mark does represent first.
- Preserve the first-person origin of the essay, but remove the staged short sentences and repeated metaphorical conclusions.
- Change the essay only after the historical connectors are fixed; otherwise polished prose will continue to defend misleading geometry.

## Data-model improvements

Add these fields before expanding coverage:

- `start_date`, `end_date`: optional ISO dates
- `date_precision`: `exact`, `year`, `circa`, `traditional`, `disputed`
- `phase_kind`: crown, sovereign state, composite monarchy, title, protectorate, regency, government in exile or transition
- `sovereignty_status`: sovereign, autonomous, subordinate, contested or titular
- `relationship_type`: add annexation, incorporation, constitutional reorganization, protectorate and succession dispute
- `certainty`: secure, conventional, disputed
- `sources`: on phases, rules and reigns
- `citation_locator`: page, section, document or archival reference
- `navigation_url`: optional general reading link, separate from evidence

Add validation rules that test meaning rather than only shape:

- A `state_union` must have at least two historically valid inputs.
- A relationship cannot connect from a phase that ended centuries before the transition without an explicit intermediary.
- House-rule bands cannot outlive the dynasty or claim to cover two crowns when only one was held.
- A current constitutional phase must not silently begin at the date of a medieval predecessor institution.
- Every disputed or traditional date must carry both a precision flag and a specialist citation.
- Every source-backed public note must identify at least one claim-level source.

## Recommended next steps

### Before the next public release

1. Remove or soften "fact-check complete" and "the site can be published in its current form."
2. Fix the Yugoslavia, United Kingdom, Croatia and Italy relationships.
3. Correct the Trpimirović endpoint.
4. Change "same moment" to "during that year" unless exact-date snapshots are implemented.
5. Repair the failing site test and require `npm test` plus `npm run validate:data` to pass.
6. Add an errata note naming the relationship records changed in this revision.

### Next data revision

1. Add transition entities for Ireland, East Francia, Middle Francia, Montenegro and the State of Slovenes, Croats and Serbs.
2. Split Sicily and Naples from 1282 to 1816.
3. Add Joanna I and other legally important co-rulers or regents when their absence changes the interpretation.
4. Split Poland's early royal and fragmented periods.
5. Split Andorra at 1993, Liechtenstein at 1806 and Monaco at 1861.
6. Replace false `state_union` edges with more precise relationship types.
7. Separate dynasties from elective offices.

### Source and editorial revision

1. Add claim-level citations to every phase, rule, reign and disputed note.
2. Give every relationship at least one specialist, official or primary source, starting with the 33 currently supported only by Wikipedia; the relationships are the project's original historical argument and deserve priority.
3. Obtain regional review from at least one specialist for each of these groups: Roman/Byzantine, British and Iberian, Nordic, Central/Eastern European, and Italian/Balkan.
4. Ask reviewers to inspect the visual result, not only the JSON. The main errors in this edition are created by lines, gaps and merged lanes.
5. Rewrite the essay and methodology in a plainer voice after the data is stable.

## Definition of done

The project can again call itself fact-checked when:

- every connector is historically defensible without relying on a note that retracts its visual meaning;
- transition entities are present whenever a union or new state requires them;
- exact, approximate and traditional dates are machine-readable;
- "year snapshot" language matches the actual temporal precision;
- disputed claims have identifiable specialist sources;
- the dynasty filter contains dynasties rather than constitutional offices;
- the public prose states selection criteria without claiming a single continental master story;
- regional reviewers have checked the rendered chart;
- the full automated test suite passes.

The project is close to being a valuable public-history tool. Its next improvement should be depth and semantic precision, not more lanes or more decorative explanation.
