const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'timeline.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const errors = [];

function fail(message) {
  errors.push(message);
}

function uniqueIds(name, items) {
  const ids = new Set();
  for (const item of items) {
    if (!item.id) fail(`${name}: item without id`);
    if (ids.has(item.id)) fail(`${name}: duplicate id ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function validRange(name, item) {
  if (!Number.isInteger(item.start) || !Number.isInteger(item.end)) {
    fail(`${name} ${item.id}: start and end must be integer years`);
    return;
  }
  if (item.start > item.end) fail(`${name} ${item.id}: start is after end`);
  if (item.start === 0 || item.end === 0) fail(`${name} ${item.id}: year zero is not allowed`);
  if (item.start < data.meta.start_year || item.end > data.meta.end_year) {
    fail(`${name} ${item.id}: date range falls outside project bounds`);
  }
}

const sourceIds = uniqueIds('sources', data.sources);
const houseIds = uniqueIds('houses', data.houses);
const polityIds = uniqueIds('polities', data.polities);
const phaseIds = uniqueIds('phases', data.phases);
const ruleIds = uniqueIds('rules', data.rules);
const personIds = uniqueIds('persons', data.persons);
const reignIds = uniqueIds('reigns', data.reigns);
const relationshipIds = uniqueIds('relationships', data.relationships);
const eventIds = uniqueIds('events', data.events);
const presetIds = uniqueIds('presets', data.presets);

void phaseIds;
void ruleIds;
void reignIds;
void relationshipIds;
void eventIds;
void presetIds;

for (const source of data.sources) {
  try {
    const url = new URL(source.url);
    if (url.protocol !== 'https:') fail(`source ${source.id}: URL must use HTTPS`);
  } catch {
    fail(`source ${source.id}: invalid URL`);
  }
}

for (const polity of data.polities) {
  if (!['current', 'former'].includes(polity.status)) {
    fail(`polity ${polity.id}: invalid status ${polity.status}`);
  }
  if (![1, 2].includes(polity.tier)) fail(`polity ${polity.id}: invalid tier`);
  if (!polity.region) fail(`polity ${polity.id}: missing region`);
  if (!polity.sources?.length) fail(`polity ${polity.id}: missing sources`);
  for (const sourceId of polity.sources || []) {
    if (!sourceIds.has(sourceId)) fail(`polity ${polity.id}: unknown source ${sourceId}`);
  }
  if (!data.phases.some((phase) => phase.polity_id === polity.id)) {
    fail(`polity ${polity.id}: missing institutional phase`);
  }
  if (polity.status === 'current' && !data.phases.some(
    (phase) => phase.polity_id === polity.id && phase.end === data.meta.end_year
  )) {
    fail(`polity ${polity.id}: current polity lacks an open phase`);
  }
}

for (const phase of data.phases) {
  validRange('phase', phase);
  if (!polityIds.has(phase.polity_id)) fail(`phase ${phase.id}: unknown polity`);
}

function intersectsPhase(item) {
  return data.phases.some((phase) =>
    phase.polity_id === item.polity_id && item.start <= phase.end && item.end >= phase.start
  );
}

for (const rule of data.rules) {
  validRange('rule', rule);
  if (!polityIds.has(rule.polity_id)) fail(`rule ${rule.id}: unknown polity`);
  if (!houseIds.has(rule.house_id)) fail(`rule ${rule.id}: unknown house`);
  if (!intersectsPhase(rule)) fail(`rule ${rule.id}: does not intersect a polity phase`);
}

for (const person of data.persons) {
  if (!person.name) fail(`person ${person.id}: missing name`);
  try {
    const url = new URL(person.url);
    if (url.protocol !== 'https:') fail(`person ${person.id}: URL must use HTTPS`);
  } catch {
    fail(`person ${person.id}: invalid URL`);
  }
}

for (const reign of data.reigns) {
  validRange('reign', reign);
  if (!personIds.has(reign.person_id)) fail(`reign ${reign.id}: unknown person`);
  if (!polityIds.has(reign.polity_id)) fail(`reign ${reign.id}: unknown polity`);
  if (reign.house_id && !houseIds.has(reign.house_id)) fail(`reign ${reign.id}: unknown house`);
  if (!intersectsPhase(reign)) fail(`reign ${reign.id}: does not intersect a polity phase`);
  if (![1, 2, 3].includes(reign.importance)) fail(`reign ${reign.id}: invalid importance`);
}

const relationshipTypes = new Set([
  'continuity', 'conquest', 'dissolution', 'dynastic_union',
  'partition', 'personal_union', 'restoration', 'state_union'
]);
for (const relationship of data.relationships) {
  if (!relationshipTypes.has(relationship.type)) {
    fail(`relationship ${relationship.id}: invalid type ${relationship.type}`);
  }
  if (!Number.isInteger(relationship.start)) {
    fail(`relationship ${relationship.id}: invalid start year`);
  }
  if (relationship.start === 0 || relationship.end === 0) {
    fail(`relationship ${relationship.id}: year zero is not allowed`);
  }
  if (relationship.end !== undefined && relationship.end < relationship.start) {
    fail(`relationship ${relationship.id}: end is before start`);
  }
  for (const polityId of [...relationship.from, ...relationship.to]) {
    if (!polityIds.has(polityId)) fail(`relationship ${relationship.id}: unknown polity ${polityId}`);
  }
  for (const sourceId of relationship.sources || []) {
    if (!sourceIds.has(sourceId)) fail(`relationship ${relationship.id}: unknown source ${sourceId}`);
  }
}

for (const event of data.events) {
  if (!Number.isInteger(event.year)) fail(`event ${event.id}: invalid year`);
  if (event.year === 0) fail(`event ${event.id}: year zero is not allowed`);
  for (const polityId of event.polity_ids) {
    if (!polityIds.has(polityId)) fail(`event ${event.id}: unknown polity ${polityId}`);
  }
  for (const sourceId of event.sources || []) {
    if (!sourceIds.has(sourceId)) fail(`event ${event.id}: unknown source ${sourceId}`);
  }
}

const requiredCurrentMonarchies = new Set([
  'andorra', 'belgium', 'denmark', 'liechtenstein', 'luxembourg', 'monaco',
  'netherlands', 'norway', 'papal-vatican', 'spain', 'sweden', 'united-kingdom'
]);
for (const polityId of requiredCurrentMonarchies) {
  const polity = data.polities.find((item) => item.id === polityId);
  if (!polity || polity.status !== 'current') {
    fail(`scope: missing current European monarchy ${polityId}`);
  }
}

const referencedPeople = new Set(data.reigns.map((reign) => reign.person_id));
for (const person of data.persons) {
  if (!referencedPeople.has(person.id)) fail(`person ${person.id}: has no reign`);
}

if (data.polities.length < 35) fail('scope: expected at least 35 polity lanes');
if (data.reigns.length < 150) fail('scope: expected at least 150 curated reigns');
if (data.relationships.length < 25) fail('scope: expected at least 25 typed relationships');

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${data.polities.length} polities, ${data.phases.length} phases, ` +
  `${data.rules.length} house-rule segments, ${data.reigns.length} reigns, ` +
  `${data.relationships.length} relationships and ${data.events.length} events.`
);
