# Data model

`data/timeline.json` is the canonical hand-curated dataset. BCE years are negative; the interface displays BCE/CE labels and does not print a year zero. Starts and completed ends are integer years. Continuing phases, house periods and reigns use `end: null`; the chart resolves them to the project snapshot year in `meta.end_year` and labels them as ongoing at that dated snapshot. Annual bounds are inclusive: a record is active if it overlaps any part of that year. Adjacent phases can therefore both appear in a transition year. The continuous coordinate maps 1 BCE directly to 1 CE with no extra year zero.

## Entities

### `sources`

Reusable references.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable source identifier |
| `title` | string | Human-readable link text |
| `url` | HTTPS URL | Direct reference URL |
| `type` | string | Source category, such as `reference`, `scholarly_reference`, `official` or `primary_source` |

### `houses`

Named ruling houses. A house is not assumed to be a unified political actor.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable house identifier |
| `name` | string | Display name |

Houses may additionally have `kind: "office"` for the papacy and Andorran co-principate. These records retain stable IDs and bands but are excluded from the dynasty selector. `kind` defaults to `dynasty`. `wikipedia_title` is an explicit English article title; optional `summary` is editorial context.

### `polities`

The conceptual lanes in the overview.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable polity identifier |
| `name` | string | Full display name |
| `short_name` | string | Compact lane label |
| `region` | string | Editorial display group |
| `tier` | `1` or `2` | Core or extended scope |
| `status` | `current` or `former` | Status in the project snapshot year |
| `summary` | string | Short editorial explanation |
| `sources` | string[] | Source IDs |

### `phases`

Dated institutional periods. Multiple phases may belong to one polity and may contain gaps.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable phase identifier |
| `polity_id` | string | Parent polity |
| `name` | string | Phase label |
| `start`, `end` | integer; integer or `null` | Inclusive year bounds; `null` means the phase is ongoing |
| `note` | string, optional | Periodization or constitutional caveat |

### `rules`

A house's dated association with one crown or polity lane.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable segment identifier |
| `polity_id` | string | Crown or polity lane |
| `house_id` | string | Ruling house |
| `start`, `end` | integer; integer or `null` | Inclusive year bounds; `null` means the house period is ongoing |
| `note` | string, optional | Caveat about contested, interrupted or lane-specific rule |

The overview may simplify cadet branches, interregna and elective accessions. A governing-dynasty boundary need not end every legal co-ruler’s tenure: Joanna’s title, for example, continued after Charles assumed joint rule in 1516. Such cases require a rule note and separate reign records. Such cases should be explained in polity or phase notes when they affect interpretation.

### `persons`

One record per human, independent of title.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable person identifier |
| `name` | string | Display name |
| `url` | HTTPS URL | Person reference |

People may additionally carry `wikipedia_title` when their main `url` points to an official or specialist source. Otherwise an English Wikipedia article URL supplies the title. Never infer identity from a search result.

### `reigns`

One person's dated tenure in one polity. A person can have several reigns.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable reign identifier |
| `person_id` | string | Person |
| `polity_id` | string | Crown or polity lane |
| `house_id` | string, optional | House used for the visual segment |
| `title` | string | Title in this specific reign |
| `start`, `end` | integer; integer or `null` | Inclusive year bounds; `null` means the reign is ongoing |
| `importance` | `1`, `2` or `3` | Editorial display priority |
| `label` | boolean | Whether the reign may receive a permanent overview label |
| `note` | string, optional | Qualification displayed in the reign detail panel |

### `relationships`

Typed connections between polity lanes.

Allowed types:

- `composite_monarchy`
- `continuity`
- `constitutional_reorganization`
- `conquest`
- `dissolution`
- `dynastic_union`
- `partition`
- `personal_union`
- `restoration`
- `state_union`
- `union_framework` (an institutional/dynastic framework with interruptions, not continuous shared rule)

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable relationship identifier |
| `type` | enum | Visual and semantic relationship type |
| `label` | string | Short event name |
| `start` | integer | Start or transition year |
| `end` | integer, optional | End year for a duration such as a personal union |
| `from`, `to` | string[] | Connected polity IDs; either side may be empty for an origin or terminal dissolution |
| `description` | string | Editorial explanation |
| `sources` | string[] | Source IDs |

### `events`

Contextual dated annotations. Events may involve several polities.

### `presets`

The seven story-date buttons used by the interface and article links.

## Claim-level evidence and uncertainty

Phases, rules and reigns may carry:

- `citations`: `[{ "source_id": "src-example", "locator": "section or page" }]`. The locator is optional; the source reference is validated.
- `sources`: a non-empty list of direct source IDs, using the existing relationship/source convention.
- `date_precision`: `year` (default), `circa`, `traditional` or `disputed`. Non-year values require a note; missing specialist support raises a review item.
- `review_note`: a specific unresolved editorial or modelling issue, displayed in the explorer and review queue.

These fields are also accepted on other records. A polity bibliography is background for its phases and reigns; it is never silently copied into their claim citations. Missing citations are measured editorial debt, not evidence of a completed review.

Source classifications are validated: `reference` for general reference works, `specialist_reference` for edited subject-specific references, `scholarly_reference` for academic or scholarly reference works, `official` for institutional publications, and `primary_source` for original documents or archival presentations. Classification describes the source, not a guarantee of truth. Newly reviewed Wikipedia claim citations link to a fixed `oldid` revision; refreshed background excerpts do not silently change that evidence.

## Cached Wikipedia context

`data/wikipedia-extracts.json` maps each explicit requested article title to `title`, `page_id`, `revision_id`, `revision_at`, `retrieved_at`, `url` and a short plain-text `text` excerpt. Redirect targets are retained separately from the requested mapping. Excerpts are shortened and pronunciation-only parentheses are omitted; article, revision and CC BY-SA 4.0 links are displayed alongside them.

`npm run refresh:wikipedia` replaces the cache only after every mapped article resolves to an unambiguous, non-empty page. It never edits the canonical history. `npm run build` is offline and produces the bundle plus data-quality page and JSON report. The imported extracts are separate from original MIT-licensed data.

## Validation rules

`npm run validate:data` enforces:

- unique IDs within every entity type;
- valid HTTPS source and person URLs;
- valid references among polities, houses, people and sources;
- integer dates within the project range;
- `null` ends only for records continuing through an open current-polity phase;
- rules and reigns fully covered by the union of the polity’s phases, without crossing institutional gaps;
- allowed relationship types, valid date ranges, at least one endpoint and endpoint phases active in the transition year (a predecessor may end in the immediately preceding year, accommodating 1 January unions);
- at least two distinct input polities for state unions;
- an open phase for every current monarchy;
- non-empty display text, event/preset dates, citation references and cached-extract provenance.

The regression suite additionally checks all twelve surviving European monarchies and important historical corrections. Publication coverage counts are reported rather than used as a proxy for correctness.

Run `npm run build` after every canonical data or extract change. It writes `www/data/timeline-data.js`, `www/data/quality-report.json` and `www/quality.html`. Tests compare those artifacts with a deterministic build. `npm run report:data` emits the full per-record report; `npm run validate:strict` also fails on unresolved review items.
