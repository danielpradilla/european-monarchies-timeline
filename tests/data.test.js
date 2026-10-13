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

test('German crown connections retain constituent kingdoms and interrupted shared rule',()=>{
  const phases=id=>data.phases.filter(p=>p.polity_id===id).map(({start,end})=>[start,end]).sort((a,b)=>a[0]-b[0]);
  assert.deepEqual(phases('bavaria'),[[1180,1623],[1623,1806],[1806,1918]]);
  assert.deepEqual(phases('wurttemberg'),[[1495,1803],[1803,1806],[1806,1918]]);
  assert.deepEqual(phases('saxony'),[[1296,1356],[1356,1806],[1806,1918]]);
  assert.deepEqual(phases('hanover'),[[1692,1806],[1813,1814],[1814,1866]]);
  const shared=data.relationships.filter(r=>r.from.includes('saxony')&&r.to.includes('polish-lithuanian-commonwealth'));
  assert.deepEqual(shared.map(r=>[r.type,r.start,r.end]),[['personal_union',1697,1706],['personal_union',1709,1733],['personal_union',1733,1763]]);
  const hanover=data.relationships.find(r=>r.id==='rel-hanover-uk-b');
  assert.equal(hanover.end,1837);assert.match(hanover.description,/Victoria.*Ernest Augustus/);
  const brandenburg=data.relationships.find(r=>r.id==='rel-brandenburg-prussia');
  assert.equal(brandenburg.type,'personal_union');assert.equal(brandenburg.start,1618);
  assert.ok(phases('prussia').some(([a,b])=>a===1525&&b===1701));
});

test('Romanian shared prince, common institutions and royal title remain separate transitions',()=>{
  const get=id=>data.relationships.find(r=>r.id===id);
  assert.deepEqual(['rel-danubian-personal-union','rel-danubian-state-union','rel-romania-royal-elevation'].map(id=>{const r=get(id);return[r.start,r.type]}),[[1859,'personal_union'],[1862,'state_union'],[1881,'constitutional_reorganization']]);
  assert.deepEqual(get('rel-danubian-state-union').from,['moldavia','wallachia']);
  assert.deepEqual(get('rel-romania-royal-elevation').to,['romania']);
  assert.deepEqual(new Set(data.reigns.filter(r=>r.person_id==='alexandru-ioan-cuza').map(r=>r.polity_id)),new Set(['wallachia','moldavia','united-principalities']));
  assert.ok(data.reigns.some(r=>r.person_id==='carol-i-romania'&&r.polity_id==='united-principalities'&&r.end===1881));
});

test('new Balkan coverage distinguishes conquest, royal elevation and contested union',()=>{
  const phase=id=>data.phases.find(p=>p.id===id),rel=id=>data.relationships.find(r=>r.id===id);
  assert.deepEqual([phase('bosnia-kingdom').start,phase('bosnia-kingdom').end],[1377,1463]);
  assert.equal(rel('rel-bosnia-ottoman-conquest').type,'conquest');
  assert.deepEqual([phase('serbia-principality').start,phase('serbia-principality').end],[1815,1882]);
  assert.equal(phase('montenegro-principality').start,1852);assert.equal(phase('montenegro-kingdom').start,1910);
  assert.match(rel('rel-montenegro-serbia').description,/November.*December.*disputed/);
  assert.equal(rel('rel-albania-italian-invasion').type,'conquest');
  assert.ok(!data.phases.some(p=>p.polity_id==='albania'&&p.start<=1926&&p.end>=1926));
});

test('French empires, earlier Bohemia and Nordic shared crowns reuse existing lanes and people',()=>{
  assert.deepEqual(data.reigns.filter(r=>r.person_id==='napoleon-i'&&r.polity_id==='france').map(r=>[r.start,r.end]),[[1804,1814],[1815,1815]]);
  assert.ok(data.reigns.some(r=>r.person_id==='napoleon-iii'&&r.start===1852&&r.end===1870));
  const ducal=data.phases.find(p=>p.id==='bohemia-duchy');assert.equal(ducal.start,870);assert.equal(ducal.date_precision,'circa');
  assert.ok(data.reigns.some(r=>r.person_id==='alexander-i-russia'&&r.polity_id==='finland'&&r.start===1809));
  assert.deepEqual(data.reigns.filter(r=>r.polity_id==='iceland').map(r=>[r.person_id,r.start,r.end]),[['christian-x',1918,1944]]);
  assert.ok(data.reigns.some(r=>r.person_id==='christian-x'&&r.polity_id==='denmark'&&r.end===1947));
});

test('Iberian additions preserve distinct origins, house interruptions and the Castilian crown',()=>{
  const relation=id=>data.relationships.find(r=>r.id===id);
  assert.equal(relation('rel-asturias-leon').start,910);
  assert.equal(relation('rel-leon-castile-1230').type,'composite_monarchy');
  assert.ok(data.phases.some(p=>p.polity_id==='castile'&&p.start===1065&&p.end===1230));
  assert.equal(data.reigns.filter(r=>r.id==='reign-ferdinand-iii-castile').length,1);
  assert.equal(data.reigns.find(r=>r.id==='reign-ferdinand-iii-castile').start,1217);
  assert.deepEqual(data.phases.filter(p=>p.polity_id==='cordoba').map(p=>[p.start,p.end]),[[756,929],[929,1031]]);
  assert.ok(data.rules.some(r=>r.polity_id==='cordoba'&&r.house_id==='hammudid'&&r.start===1016));
  assert.equal(relation('rel-cordoba-dissolution').start,1031);
  assert.deepEqual(relation('rel-granada-conquest').to,['castile']);
  assert.ok(!data.relationships.some(r=>r.from.includes('visigothic-kingdom')&&r.to.some(id=>['asturias','cordoba'].includes(id))));
});

test('Italian additions preserve republican gaps and distinguish early and modern crowns',()=>{
  const active=(id,year)=>data.phases.some(p=>p.polity_id===id&&p.start<=year&&p.end>=year);
  assert.ok(!active('lombard-kingdom',580));assert.ok(active('lombard-kingdom',590));
  assert.ok(!active('duchy-of-milan',1448));assert.ok(active('duchy-of-milan',1451));
  assert.ok(!active('grand-duchy-tuscany',1810));assert.ok(active('grand-duchy-tuscany',1815));
  assert.deepEqual(data.relationships.find(r=>r.id==='rel-lombard-italian-crown').to,['medieval-italy']);
  assert.ok(data.reigns.some(r=>r.person_id==='charlemagne'&&r.polity_id==='medieval-italy'&&r.start===774));
  assert.ok(data.reigns.some(r=>r.person_id==='otto-i'&&r.polity_id==='medieval-italy'&&r.start===951));
  const tuscany=data.relationships.find(r=>r.id==='rel-tuscany-sardinia');assert.equal(tuscany.start,1860);assert.deepEqual(tuscany.to,['sardinia']);
  assert.ok(data.polities.some(p=>p.id==='italy'));
});

test('Arles, Valois Burgundy and Wessex have distinct documented transitions',()=>{
  const arles=data.events.find(e=>e.id==='event-burgundy-arles-imperial-incorporation');
  assert.equal(arles.year,1033);assert.match(arles.description,/1032.*1033/);
  assert.ok(data.phases.some(p=>p.polity_id==='burgundian-ducal-territories'&&p.start===1363&&p.end===1477));
  assert.match(data.events.find(e=>e.id==='event-burgundian-habsburg-marriage').description,/did not make all/);
  const wessex=data.phases.find(p=>p.polity_id==='wessex');assert.equal(wessex.date_precision,'traditional');
  assert.deepEqual(data.relationships.find(r=>r.id==='rel-wessex-england').to,['england']);
  assert.deepEqual(data.reigns.filter(r=>r.person_id==='aethelstan').map(r=>r.polity_id).sort(),['england','wessex']);
});
