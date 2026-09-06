const assert = require('node:assert/strict');
const test = require('node:test');
const Core = require('../www/assets/timeline-core');
const { validateData } = require('../scripts/validate_data');
const { refresh, excerpt } = require('../scripts/refresh_wikipedia');
const data = require('../data/timeline.json');
const extracts = require('../data/wikipedia-extracts.json');
const index = Core.indexData(data);

test('year positions cross BCE/CE without inventing a year zero', () => {
  assert.equal(Core.yearPosition(1)-Core.yearPosition(-1),1);
  assert.equal(Core.yearPosition(14)-Core.yearPosition(-27),40);
  for (const [input,expected] of [[0,1],['',1519],['no',1519],[1519.5,1519],[-999,-27],[9999,2026]]) assert.equal(Core.normalizeYear(input,data.meta),expected);
  assert.equal(Core.formatRange(-1,1),'1 BCE–1 CE');
  assert.match(Core.formatRange(1975,null),/snapshot/);
});
test('navigation search ranks exact names and distinguishes countries, regions, dynasties and reigns', () => {
  const search = query => Core.searchEntries(index, query);
  assert.deepEqual(search('Charles V').filter(r=>r.label==='Charles V').map(r=>index.ids.reigns.get(r.id).polity_id).sort(),['holy-roman-empire','spain']);
  assert.equal(search('juan carlos')[0].label,'Juan Carlos I');
  assert.ok(search('Premyslid bohemia').some(r=>r.type==='rule'&&index.ids.rules.get(r.id).polity_id==='bohemia'));
  assert.equal(search('  FRANCE  ')[0].type,'polity');
  assert.equal(search('Iberia')[0].type,'region');
  assert.ok(search('tudor england').every(r=>r.type==='rule'&&r.context.includes('England')));
  assert.equal(search('not-a-record').length,0);
  assert.equal(search('   ').length,0);
  assert.equal(new Set(index.navigation.map(r=>`${r.type}:${r.id}`)).size,index.navigation.length);
  assert.equal(index.navigation.filter(r=>r.type==='reign').length,data.reigns.length);
  assert.equal(index.navigation.filter(r=>r.type==='rule').length,data.rules.length);
});
test('snapshots include boundary-year transitions, co-rulers and institutional gaps', () => {
  const at = year=>Core.snapshot(data,index,data.polities,year);
  assert.ok(at(1707).activeIds.has('england') && at(1707).activeIds.has('great-britain'));
  assert.ok(!at(1655).activeIds.has('england'));
  assert.ok(!at(1871).activeIds.has('papal-vatican'));
  assert.equal(at(2026).activeIds.size,12);
  assert.ok(at(1519).activeReigns.some(r=>r.person_id==='joanna-i'));
  assert.ok(at(1724).activeReigns.some(r=>r.person_id==='louis-i-spain'));
  assert.ok(at(1873).activeIds.has('spain') && at(1874).activeIds.has('spain'));
});
test('records and direct citations validate without claiming complete historical verification', () => {
  const report=validateData(data,extracts);
  assert.equal(report.errors,0,JSON.stringify(report.issues.filter(i=>i.severity==='error')));
  assert.equal(report.claims_with_sources,report.claims);
  assert.equal(report.review_items,0);
  assert.ok(report.claims_with_specialist_sources > 0 && report.claims_with_specialist_sources < report.claims);
  const uncited=structuredClone(data);
  delete uncited.reigns[0].citations;
  delete uncited.reigns[0].sources;
  assert.ok(validateData(uncited,extracts).issues.some(i=>i.id===uncited.reigns[0].id && i.code==='claim-source'));
});
test('January unions accept an adjacent predecessor without keeping it active for another year',()=>{
  const at=year=>Core.snapshot(data,index,data.polities,year);
  assert.ok(at(1800).activeIds.has('great-britain') && at(1800).activeIds.has('ireland'));
  assert.ok(!at(1801).activeIds.has('great-britain') && !at(1801).activeIds.has('ireland'));
  assert.ok(at(1801).activeIds.has('united-kingdom'));
  const changed=structuredClone(data);
  changed.relationships.find(r=>r.id==='rel-united-kingdom').start=1802;
  assert.ok(validateData(changed,extracts).issues.some(i=>i.code==='endpoint-date'));
});
test('researched coverage keeps distinct crowns, interrupted rule and current succession',()=>{
  const active=(records,year)=>records.filter(r=>Core.activeDuring(r,year,data.meta));
  const rules=(polity,year)=>active(data.rules.filter(r=>r.polity_id===polity),year).map(r=>r.house_id);
  assert.ok(rules('sicily',1810).includes('bourbon'));
  assert.ok(rules('naples',1810).includes('murat'));
  assert.equal(active(data.phases.filter(r=>r.polity_id==='sicily-two-sicilies'),1810).length,0);
  assert.ok(active(data.phases,1900).some(r=>r.polity_id==='croatia'));
  assert.match(active(data.phases.filter(r=>r.polity_id==='poland'),1040)[0].name,/ducal/i);
  assert.ok(active(data.reigns.filter(r=>r.person_id==='victor-amadeus-ii'),1715).some(r=>r.polity_id==='sicily'));
  assert.deepEqual(data.reigns.filter(r=>r.polity_id==='norway'&&r.end===null).map(r=>r.person_id),['haakon-viii']);
  assert.equal(data.reigns.find(r=>r.person_id==='harald-v').end,2026);
  assert.deepEqual(data.reigns.filter(r=>r.person_id==='louis-xviii').map(r=>[r.start,r.end]).sort((a,b)=>a[0]-b[0]),[[1814,1815],[1815,1824]]);
});
const mutations = [
  ['duplicate ID','id',d=>d.persons.push({...d.persons[0]})],
  ['unknown person','reference',d=>d.reigns[0].person_id='missing'],
  ['unsafe URL','url',d=>d.sources[0].url='javascript:alert(1)'],
  ['unknown source classification','source-type',d=>d.sources[0].type='verified-by-magic'],
  ['missing relationship sources','sources',d=>d.relationships[0].sources=[]],
  ['claim crosses institutional gap','phase-coverage',d=>d.rules.find(r=>r.id==='rule-england-stuart-a').end=1655],
  ['single-input state union','union-inputs',d=>d.relationships.find(r=>r.id==='rel-united-kingdom').from=['great-britain']],
  ['anachronistic endpoint','endpoint-date',d=>d.relationships.find(r=>r.id==='rel-frankish-partition').to=['holy-roman-empire']],
  ['out-of-range event','year',d=>d.events[0].year=9999],
  ['year-zero preset','year',d=>d.presets[0].year=0],
  ['fractional relationship end','range',d=>d.relationships[0].end=400.5],
  ['unknown citation','reference',d=>d.phases[0].citations=[{source_id:'missing'}]],
  ['unexplained uncertain date','precision-note',d=>{d.phases[0].date_precision='disputed';delete d.phases[0].note;}],
  ['malformed collection','schema',d=>d.rules=null],
  ['missing display text','required',d=>d.polities[0].summary='']
];
for(const [name,code,mutate] of mutations) test(`validator rejects ${name}`,()=>{
  const changed=structuredClone(data);mutate(changed);
  assert.ok(validateData(changed,extracts).issues.some(i=>i.severity==='error'&&i.code===code));
});
test('Wikipedia references are exact article URLs, not search results',()=>{
  assert.equal(Core.wikipediaTitle('https://en.wikipedia.org/wiki/House_of_Habsburg'),'House of Habsburg');
  for(const url of ['https://evil.test/wiki/House_of_Habsburg','https://en.wikipedia.org.evil.test/wiki/Habsburg','javascript:alert(1)','https://en.wikipedia.org/w/index.php?search=Habsburg']) assert.equal(Core.wikipediaTitle(url),'');
  assert.ok(data.houses.every(h=>h.wikipedia_title));
});
test('extracts preserve dates while cleaning pronunciation and limiting prose',()=>{
  const text='A king (1500–1558) ruled (pronounced [ˈkɪŋ]). He held two crowns. He died in 1558. Fourth sentence.';
  assert.equal(excerpt(text),'A king (1500–1558) ruled. He held two crowns. He died in 1558.');
});
test('Wikipedia refresh follows explicit redirects and rejects disambiguation and transport failure',async()=>{
  const sample={houses:[{id:'h',wikipedia_title:'Old title'}],persons:[]};
  const page={title:'Resolved title',pageid:12,ns:0,fullurl:'https://en.wikipedia.org/wiki/Resolved_title',extract:'This is a sufficiently long introductory sentence about a dynasty.',revisions:[{revid:34,timestamp:'2026-01-01T00:00:00Z'}]};
  let requested;
  const fetcher=async url=>{requested=new URL(url);return{ok:true,json:async()=>({query:{redirects:[{from:'Old title',to:page.title}],pages:[page]}})}};
  const cache=await refresh(sample,{},fetcher);
  assert.equal(cache['Old title'].revision_id,34);
  assert.equal(requested.searchParams.get('titles'),'Old title');
  assert.equal(requested.searchParams.has('generator'),false);
  page.pageprops={disambiguation:''};
  await assert.rejects(refresh(sample,{},fetcher),/unambiguous/);
  await assert.rejects(refresh(sample,{},async()=>({ok:false,status:503})),/cache unchanged/i);
});
