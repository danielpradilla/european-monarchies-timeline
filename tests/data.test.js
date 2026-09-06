const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'timeline.json'), 'utf8'));

test('all surviving sovereign European monarchies are present', () => {
  const current = new Set(data.polities.filter((polity) => polity.status === 'current').map((polity) => polity.id));
  const expected = [
    'andorra', 'belgium', 'denmark', 'liechtenstein', 'luxembourg', 'monaco',
    'netherlands', 'norway', 'papal-vatican', 'spain', 'sweden', 'united-kingdom'
  ];
  assert.deepEqual([...current].sort(), expected.sort());
  for (const polityId of current) {
    assert.ok(
      data.reigns.some((reign) => reign.polity_id === polityId && reign.start <= data.meta.end_year && reign.end === null),
      `${polityId} has no current sovereign or co-prince reign`
    );
  }
});

test('one person can hold several crowns', () => {
  const reignsFor = (personId) => data.reigns.filter((reign) => reign.person_id === personId);
  assert.deepEqual(new Set(reignsFor('james-vi-i').map((reign) => reign.polity_id)), new Set(['england', 'scotland', 'ireland']));
  assert.deepEqual(new Set(reignsFor('charles-v').map((reign) => reign.polity_id)), new Set(['holy-roman-empire', 'spain']));
  assert.deepEqual(new Set(reignsFor('margaret-i').map((reign) => reign.polity_id)), new Set(['denmark', 'norway', 'sweden']));
});

test('eastern European predecessor lanes preserve qualified continuity', () => {
  const phaseFor = (polityId) => data.phases.find((phase) => phase.polity_id === polityId);
  assert.deepEqual(
    ['kyivan-rus', 'galicia-volhynia', 'muscovy'].map((id) => {
      const phase = phaseFor(id);
      return [id, phase.start, phase.end];
    }),
    [
      ['kyivan-rus', 882, 1240],
      ['galicia-volhynia', 1199, 1340],
      ['muscovy', 1263, 1547]
    ]
  );

  const muscovyTransition = data.relationships.find((relationship) => relationship.id === 'rel-muscovy-russia');
  assert.equal(muscovyTransition.type, 'continuity');
  assert.deepEqual(muscovyTransition.from, ['muscovy']);
  assert.deepEqual(muscovyTransition.to, ['russia']);
  assert.equal(muscovyTransition.start, 1547);

  const rusContinuity = data.relationships.find(
    (relationship) => relationship.id === 'rel-kyivan-rus-galicia-volhynia'
  );
  assert.match(rusContinuity.description, /not an exclusive succession/);
  assert.equal(data.polities.find((polity) => polity.id === 'galicia-volhynia').tier, 2);
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

test('publication fact-check corrections remain explicit', () => {
  const phasesFor = (polityId) => data.phases
    .filter((phase) => phase.polity_id === polityId)
    .sort((a, b) => a.start - b.start);

  const england = phasesFor('england');
  const monaco = phasesFor('monaco');
  assert.equal(england[0].end, 1649);
  assert.equal(england[1].start, 1660);
  assert.equal(monaco[0].end, 1793);
  assert.equal(monaco[1].start, 1814);

  const majorian = data.reigns.find((reign) => reign.id === 'reign-majorian');
  assert.equal(majorian.house_id, undefined);

  const hohenstaufen = data.rules.filter(
    (rule) => rule.polity_id === 'holy-roman-empire' && rule.house_id === 'hohenstaufen'
  );
  assert.deepEqual(hohenstaufen.map(({ start, end }) => [start, end]).sort((a,b)=>a[0]-b[0]), [[1138, 1197], [1198, 1208], [1212, 1254]]);

  const easternRoman = phasesFor('eastern-roman-empire');
  assert.deepEqual(easternRoman.map(({ start, end }) => [start, end]), [[395, 1204], [1204, 1261], [1261, 1453]]);

  const normanRule = data.rules.find((rule) => rule.id === 'rule-england-normandy');
  const bloisRule = data.rules.find((rule) => rule.id === 'rule-england-blois');
  assert.equal(normanRule.end, 1135);
  assert.deepEqual([bloisRule.start, bloisRule.end], [1135, 1154]);

  const imperialCollapse = data.events.find((event) => event.id === 'event-1918');
  assert.match(imperialCollapse.label, /Central European/);
  assert.match(imperialCollapse.description, /1917.*1922/);
});

test('relationship vocabulary covers continuity and rupture', () => {
  const types = new Set(data.relationships.map((relationship) => relationship.type));
  for (const type of [
    'composite_monarchy', 'continuity', 'conquest', 'dissolution', 'dynastic_union',
    'partition', 'personal_union', 'restoration', 'state_union'
  ]) {
    assert.ok(types.has(type), `missing relationship type ${type}`);
  }
});

test('story presets cover the editorial dates', () => {
  assert.deepEqual(data.presets.map((preset) => preset.year), [843, 1066, 1519, 1707, 1815, 1918, 2026]);
});
