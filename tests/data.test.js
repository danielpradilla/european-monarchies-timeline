const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'timeline.json'), 'utf8'));

test('publication dataset meets declared coverage', () => {
  assert.equal(data.meta.start_year, -27);
  assert.equal(data.meta.end_year, 2026);
  assert.ok(data.polities.length >= 35);
  assert.ok(data.reigns.length >= 150);
  assert.ok(data.relationships.length >= 25);
});

test('all surviving sovereign European monarchies are present', () => {
  const current = new Set(data.polities.filter((polity) => polity.status === 'current').map((polity) => polity.id));
  const expected = [
    'andorra', 'belgium', 'denmark', 'liechtenstein', 'luxembourg', 'monaco',
    'netherlands', 'norway', 'papal-vatican', 'spain', 'sweden', 'united-kingdom'
  ];
  assert.deepEqual([...current].sort(), expected.sort());
  for (const polityId of current) {
    assert.ok(
      data.reigns.some((reign) => reign.polity_id === polityId && reign.start <= 2026 && reign.end >= 2026),
      `${polityId} has no current sovereign or co-prince reign`
    );
  }
});

test('one person can hold several crowns', () => {
  const reignsFor = (personId) => data.reigns.filter((reign) => reign.person_id === personId);
  assert.deepEqual(new Set(reignsFor('james-vi-i').map((reign) => reign.polity_id)), new Set(['england', 'scotland']));
  assert.deepEqual(new Set(reignsFor('charles-v').map((reign) => reign.polity_id)), new Set(['holy-roman-empire', 'spain']));
  assert.deepEqual(new Set(reignsFor('margaret-i').map((reign) => reign.polity_id)), new Set(['denmark', 'norway', 'sweden']));
});

test('interruptions remain explicit institutional gaps', () => {
  const phasesFor = (polityId) => data.phases.filter((phase) => phase.polity_id === polityId).sort((a, b) => a.start - b.start);
  const france = phasesFor('france');
  const spain = phasesFor('spain');
  const papacy = phasesFor('papal-vatican');
  assert.ok(france[1].start > france[0].end);
  assert.ok(spain[2].start > spain[1].end);
  assert.ok(papacy[1].start > papacy[0].end);
});

test('relationship vocabulary covers continuity and rupture', () => {
  const types = new Set(data.relationships.map((relationship) => relationship.type));
  for (const type of [
    'continuity', 'conquest', 'dissolution', 'dynastic_union',
    'partition', 'personal_union', 'restoration', 'state_union'
  ]) {
    assert.ok(types.has(type), `missing relationship type ${type}`);
  }
});

test('story presets cover the editorial dates', () => {
  assert.deepEqual(data.presets.map((preset) => preset.year), [843, 1066, 1519, 1707, 1815, 1918, 2026]);
});

test('the historical scale never stores a year zero', () => {
  for (const collection of [data.phases, data.rules, data.reigns]) {
    for (const item of collection) {
      assert.notEqual(item.start, 0, `${item.id} starts in year zero`);
      assert.notEqual(item.end, 0, `${item.id} ends in year zero`);
    }
  }
  for (const event of data.events) assert.notEqual(event.year, 0, `${event.id} occurs in year zero`);
});
