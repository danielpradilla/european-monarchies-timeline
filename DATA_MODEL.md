# Data model

`data/timeline.json` is the canonical hand-curated dataset. All years are integers. BCE years are negative; the interface displays BCE/CE labels and does not print a year zero. Continuing records end at the project snapshot year in `meta.end_year`.

## Entities

### `sources`

Reusable references.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable source identifier |
| `title` | string | Human-readable link text |
| `url` | HTTPS URL | Direct reference URL |
| `type` | string | Source category; currently `reference` |

### `houses`

Named ruling houses. A house is not assumed to be a unified political actor.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable house identifier |
| `name` | string | Display name |

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
| `start`, `end` | integer | Inclusive year bounds |
| `note` | string, optional | Periodization or constitutional caveat |

### `rules`

A house's dated association with one crown or polity lane.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable segment identifier |
| `polity_id` | string | Crown or polity lane |
| `house_id` | string | Ruling house |
| `start`, `end` | integer | Inclusive year bounds |

The overview may simplify cadet branches, interregna and elective accessions. Such cases should be explained in polity or phase notes when they affect interpretation.

### `persons`

One record per human, independent of title.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable person identifier |
| `name` | string | Display name |
| `url` | HTTPS URL | Person reference |

### `reigns`

One person's dated tenure in one polity. A person can have several reigns.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable reign identifier |
| `person_id` | string | Person |
| `polity_id` | string | Crown or polity lane |
| `house_id` | string, optional | House used for the visual segment |
| `title` | string | Title in this specific reign |
| `start`, `end` | integer | Inclusive year bounds |
| `importance` | `1`, `2` or `3` | Editorial display priority |
| `label` | boolean | Whether the reign may receive a permanent overview label |

### `relationships`

Typed connections between polity lanes.

Allowed types:

- `continuity`
- `conquest`
- `dissolution`
- `dynastic_union`
- `partition`
- `personal_union`
- `restoration`
- `state_union`

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

## Validation rules

`npm run validate:data` enforces:

- unique IDs within every entity type;
- valid HTTPS source and person URLs;
- valid references among polities, houses, people and sources;
- integer dates within the project range;
- rules and reigns that intersect a phase of their polity;
- allowed relationship types;
- an open phase for every current monarchy;
- explicit inclusion of all twelve surviving European monarchies;
- minimum publication coverage for polities, reigns and relationships.

Run `npm run build` after every canonical data change. This validates and copies the file to `www/data/timeline.json` for static hosting.
