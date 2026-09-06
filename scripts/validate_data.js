const fs = require('node:fs');
const path = require('node:path');
const Core = require('../www/assets/timeline-core');
const collections = ['sources', 'houses', 'polities', 'phases', 'rules', 'persons', 'reigns', 'relationships', 'events', 'presets'];

function validateData(data, extracts = {}) {
  const issues = [];
  const issue = (severity, collection, id, code, message) => issues.push({ severity, collection, id, code, message });
  const error = (c, id, code, message) => issue('error', c, id, code, message);
  const warn = (c, id, code, message) => issue('review', c, id, code, message);
  const result = () => ({ snapshot: data?.meta?.updated, counts: Object.fromEntries(collections.map(k => [k, Array.isArray(data?.[k]) ? data[k].length : 0])),
    errors: issues.filter(i => i.severity === 'error').length, review_items: issues.filter(i => i.severity === 'review').length, issues });
  if (!data || typeof data !== 'object' || !data.meta) {
    error('meta', '', 'schema', 'Dataset and metadata are required'); return result();
  }
  for (const key of collections) if (!Array.isArray(data[key]) || data[key].some(r => !r || typeof r !== 'object' || Array.isArray(r))) {
    error(key, '', 'schema', 'Expected an array of records');
  }
  if (issues.length) return result();
  const ids = Object.fromEntries(collections.map(k => [k, new Map()]));
  const text = (value) => typeof value === 'string' && value.trim().length > 0;
  const safeUrl = (value) => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
  const specialist = id => ['scholarly_reference','specialist_reference','official','primary_source'].includes(ids.sources.get(id)?.type);
  const year = n => Number.isInteger(n) && n !== 0 && n >= data.meta.start_year && n <= data.meta.end_year;
  const end = r => Core.endYear(r, data.meta);
  if (!Number.isInteger(data.meta.start_year) || !Number.isInteger(data.meta.end_year) || data.meta.start_year === 0 || data.meta.end_year === 0 || data.meta.start_year >= data.meta.end_year) error('meta', '', 'bounds', 'Invalid project year bounds');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.meta.updated || '') || !Number.isFinite(Date.parse(data.meta.updated))) error('meta', '', 'updated', 'Expected a valid snapshot date');
  for (const key of collections) for (const r of data[key]) {
    if (!text(r.id) || ids[key].has(r.id)) error(key, r.id, 'id', 'ID must be present and unique within its collection');
    ids[key].set(r.id, r);
  }
  const ref = (key, r, target, value) => { if (!ids[target].has(value)) error(key, r.id, 'reference', `Unknown ${target} reference: ${value}`); };
  const required = { sources:['title','url','type'], houses:['name'], polities:['name','short_name','region','summary'], phases:['name'], persons:['name','url'], reigns:['title'], relationships:['label','description'], events:['label','description'], presets:['label','title','description'] };
  for (const key of collections) for (const r of data[key]) {
    for (const field of required[key] || []) if (!text(r[field])) error(key, r.id, 'required', `Missing text: ${field}`);
    if (r.url !== undefined && !safeUrl(r.url)) error(key, r.id, 'url', 'URL must be HTTPS without credentials');
    if (key === 'sources' && r.type !== 'reference' && !specialist(r.id)) error(key, r.id, 'source-type', 'Unknown source classification');
    if (r.sources !== undefined || ['polities','relationships','events'].includes(key)) {
      if (!Array.isArray(r.sources) || !r.sources.length) error(key, r.id, 'sources', 'At least one source is required');
      else for (const id of r.sources) ref(key, r, 'sources', id);
    }
    if (r.citations !== undefined) {
      if (!Array.isArray(r.citations) || !r.citations.length) error(key, r.id, 'citations', 'Citations must be a non-empty array');
      else for (const c of r.citations) {
        ref(key, r, 'sources', c?.source_id);
        if (c?.locator !== undefined && !text(c.locator)) error(key, r.id, 'locator', 'Citation locator must be non-empty text');
      }
    }
    if (['phases','rules','reigns'].includes(key)) {
      if (!year(r.start) || (r.end !== null && !year(r.end)) || r.start > end(r)) error(key, r.id, 'range', 'Invalid or out-of-bounds date range');
      ref(key, r, 'polities', r.polity_id);
      if (r.end === null && ids.polities.get(r.polity_id)?.status !== 'current') error(key, r.id, 'ongoing', 'Only current polities can have ongoing records');
      if (!r.citations?.length && !r.sources?.length) warn(key, r.id, 'claim-source', 'No source attached directly to this dated claim; polity bibliography is background only.');
      if (r.date_precision !== undefined && !['year','circa','traditional','disputed'].includes(r.date_precision)) error(key, r.id, 'precision', 'Unknown date precision');
      if (r.date_precision && r.date_precision !== 'year') {
        if (!text(r.note)) error(key, r.id, 'precision-note', 'Uncertain dates require an explanatory note');
        const direct = [...(Array.isArray(r.sources) ? r.sources : []), ...(Array.isArray(r.citations) ? r.citations : []).map(c => c?.source_id)];
        if (!direct.some(specialist)) warn(key, r.id, 'uncertainty-source', 'Uncertain date needs a direct specialist or institutional citation.');
      }
    }
    if (['relationships','events'].includes(key) && Array.isArray(r.sources) && r.sources.length && ![...r.sources,...(Array.isArray(r.citations) ? r.citations.map(c=>c?.source_id) : [])].some(specialist)) {
      warn(key, r.id, 'specialist-source', 'Only general references are attached; specialist or institutional review is still needed.');
    }
    if (r.review_note) warn(key, r.id, 'editorial', r.review_note);
  }
  const phasesFor = new Map(data.polities.map(p => [p.id, data.phases.filter(r => r.polity_id === p.id).sort((a,b)=>a.start-b.start)]));
  for (const p of data.polities) {
    const phases = phasesFor.get(p.id);
    if (!['current','former'].includes(p.status) || ![1,2].includes(p.tier)) error('polities', p.id, 'classification', 'Invalid status or coverage tier');
    if (!phases.length) error('polities', p.id, 'phases', 'Polity has no phase');
    if (p.status === 'current' && !phases.some(r=>r.end===null)) error('polities', p.id, 'ongoing', 'Current polity needs an ongoing phase');
    if (p.status === 'current' && !data.reigns.some(r=>r.polity_id===p.id && r.end===null)) error('polities', p.id, 'sovereign', 'Current polity needs an ongoing sovereign or co-prince reign');
    for (let i=1;i<phases.length;i++) if (phases[i].start < end(phases[i-1])) error('phases', phases[i].id, 'overlap', 'Institutional phases overlap beyond a shared boundary year');
  }
  function covered(r) {
    let cursor = Core.yearPosition(r.start);
    for (const p of phasesFor.get(r.polity_id) || []) {
      if (Core.yearPosition(p.start) <= cursor && Core.yearPosition(end(p)) >= cursor) cursor = Core.yearPosition(end(p)) + 1;
    }
    return cursor > Core.yearPosition(end(r));
  }
  for (const key of ['rules','reigns']) for (const r of data[key]) {
    if (!covered(r)) error(key, r.id, 'phase-coverage', 'Record extends outside the polity’s phases or crosses an institutional gap');
    if (key==='rules' || r.house_id) ref(key, r, 'houses', r.house_id);
    if (key==='reigns') {
      ref(key, r, 'persons', r.person_id);
      if (![1,2,3].includes(r.importance) || typeof r.label !== 'boolean') error(key,r.id,'display','Invalid reign importance or label flag');
    }
  }
  for (const r of data.relationships) {
    if (!Object.hasOwn(Core.relationshipTypes,r.type)) error('relationships',r.id,'type','Unknown relationship type');
    if (!year(r.start) || (r.end !== undefined && (!year(r.end) || r.end<r.start))) error('relationships',r.id,'range','Invalid relationship date range');
    if (!Array.isArray(r.from) || !Array.isArray(r.to)) { error('relationships',r.id,'endpoints','Endpoints must be arrays'); continue; }
    if (!r.from.length && !r.to.length) error('relationships',r.id,'endpoints','Relationship needs an endpoint');
    if (r.type==='state_union' && new Set(r.from).size<2) error('relationships',r.id,'union-inputs','A state union needs at least two distinct input polities');
    for (const id of [...r.from,...r.to]) {
      ref('relationships',r,'polities',id);
      // A 1 January transition can follow a predecessor ending on 31 December.
      const adjacentPredecessor = p => r.from.includes(id) && p.end !== null && Core.yearPosition(p.end) + 1 === Core.yearPosition(r.start);
      if (!(phasesFor.get(id)||[]).some(p=>Core.activeDuring(p,r.start,data.meta) || adjacentPredecessor(p))) error('relationships',r.id,'endpoint-date',`${id} has no phase active at the transition or ending in the immediately preceding year`);
    }
  }
  for (const key of ['events','presets']) for (const r of data[key]) {
    if (!year(r.year)) error(key,r.id,'year','Year must be within bounds and cannot be zero');
    if (key==='events') {
      if (!Array.isArray(r.polity_ids) || !r.polity_ids.length) error(key,r.id,'polities','Event must identify at least one polity');
      else for (const id of r.polity_ids) ref(key,r,'polities',id);
    }
  }
  for (const p of data.persons) if (!data.reigns.some(r=>r.person_id===p.id)) error('persons',p.id,'orphan','Person has no reign');
  for (const h of data.houses) if (h.kind !== undefined && !['dynasty','office'].includes(h.kind)) error('houses',h.id,'kind','House kind must be dynasty or office');
  for (const key of ['houses','persons']) for (const r of data[key]) {
    const title = r.wikipedia_title || Core.wikipediaTitle(r.url);
    if (!title) { warn(key,r.id,'wikipedia-mapping','No explicit Wikipedia article; the original reference remains available.'); continue; }
    const page = extracts[title];
    if (!page) { warn(key,r.id,'wikipedia-cache',`No cached extract for ${title}`); continue; }
    if (!text(page.text) || page.text.length<40 || page.text.length>1400 || /<\/?[a-z][^>]*>/i.test(page.text) || !Core.wikipediaTitle(page.url) || !Number.isInteger(page.revision_id) || !Number.isInteger(page.page_id) || !Number.isFinite(Date.parse(page.retrieved_at)) || !Number.isFinite(Date.parse(page.revision_at))) error(key,r.id,'wikipedia-extract','Extract must be plain text with a Wikipedia URL, page/revision IDs and timestamps');
  }
  const report=result();
  report.claims = ['phases','rules','reigns'].reduce((n,k)=>n+data[k].length,0);
  report.claims_with_sources = ['phases','rules','reigns'].reduce((n,k)=>n+data[k].filter(r=>r.citations?.length||r.sources?.length).length,0);
  report.claims_with_specialist_sources = ['phases','rules','reigns'].reduce((n,k)=>n+data[k].filter(r=>[...(Array.isArray(r.sources)?r.sources:[]),...(Array.isArray(r.citations)?r.citations.map(c=>c?.source_id):[])].some(specialist)).length,0);
  report.wikipedia_extracts = Object.keys(extracts).length;
  return report;
}
if (require.main === module) {
  const root=path.join(__dirname,'..');
  const data=JSON.parse(fs.readFileSync(path.join(root,'data/timeline.json')));
  const cache=path.join(root,'data/wikipedia-extracts.json');
  const report=validateData(data,fs.existsSync(cache)?JSON.parse(fs.readFileSync(cache)):{});
  if (process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
  else {
    console.log(`${report.errors} structural errors; ${report.review_items} editorial review items. ${report.claims_with_sources}/${report.claims} dated claims have direct sources; ${report.wikipedia_extracts} cached extracts.`);
    for (const i of report.issues.filter(i=>i.severity==='error')) console.error(`${i.collection}/${i.id} [${i.code}]: ${i.message}`);
    if (report.review_items) console.log('Use npm run report:data for the complete per-record review queue. Passing validation does not certify historical accuracy.');
  }
  process.exitCode = report.errors || (process.argv.includes('--strict') && report.review_items) ? 1 : 0;
}
module.exports = { validateData };
