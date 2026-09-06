const fs = require('node:fs');
const path = require('node:path');
const { validateData } = require('./validate_data');
const root = path.join(__dirname, '..');

function buildArtifacts(data, extracts) {
  const report = validateData(data, extracts);
  if (report.errors) throw new Error(`Build blocked by ${report.errors} structural errors; run npm run validate:data.`);
  const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const types = {phases:'phase',rules:'rule',reigns:'reign',persons:'reign',houses:'house',polities:'polity',relationships:'relationship',events:'event'};
  const labels = {phases:'Institutional phases',rules:'House periods',reigns:'Reigns',persons:'People',houses:'Houses',polities:'Polities',relationships:'Connections',events:'Events'};
  const checks = {'claim-source':'missing direct citations','uncertainty-source':'uncertain dates needing evidence','editorial':'modelling review','specialist-source':'specialist sourcing needed','wikipedia-mapping':'article mapping needed','wikipedia-cache':'extract refresh needed'};
  const groups = new Map();
  for (const i of report.issues) {
    const key = `${labels[i.collection] || i.collection} · ${checks[i.code] || i.code}`;
    if (!groups.has(key)) groups.set(key, []);
    const id = i.collection === 'persons' ? data.reigns.find(r=>r.person_id===i.id)?.id : i.id;
    const href = `index.html?coverage=all&selection=${encodeURIComponent(`${types[i.collection]}:${id}`)}`;
    groups.get(key).push(`<li><a href="${escape(href)}">${escape(i.id)}</a>: ${escape(i.message)}</li>`);
  }
  const sections = [...groups].map(([name,items])=>`<details class="quality-group"><summary>${escape(name)} (${items.length})</summary><ul>${items.join('\n')}</ul></details>`).join('\n');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="Per-record structural validation and editorial sourcing gaps for the Braided Crowns timeline."><title>Data quality · The Braided Crowns of Europe</title><link rel="icon" href="assets/crown.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/styles.css?v=20260905e"></head>
<body><a class="skip-link" href="#quality-title">Skip to data quality</a><header class="site-header"><a class="wordmark" href="index.html"><img src="assets/crown.svg" width="36" height="32" alt=""><span>The Braided Crowns of Europe</span></a><nav aria-label="Primary navigation"><a href="index.html">Explore</a><a href="methodology.html">Methodology</a><a href="blog.html">Essay</a><a aria-current="page" href="quality.html">Data quality</a></nav></header>
<main class="article-page"><header><p class="eyebrow">Snapshot ${escape(report.snapshot)}</p><h1 id="quality-title">Data quality</h1><p class="dek">Every record is checked for structural consistency. Historical claims still need source review. This report keeps those two kinds of work visible.</p></header>
<div class="quality-counts"><div><strong>${report.errors}</strong>structural errors</div><div><strong>${report.claims_with_sources} / ${report.claims}</strong>dated claims with direct sources</div><div><strong>${report.wikipedia_extracts}</strong>cached Wikipedia articles</div></div>
<h2>How to read this report</h2><p>A direct source is attached to a phase, house period or reign. Its presence makes the claim reviewable; it does not prove that the source supports every detail. General polity bibliographies and Wikipedia extracts are background reading. Review items may overlap on the same record.</p><p>The automated checks cover IDs, required fields, references, dates, institutional gaps, relationship endpoints, state-union inputs and extract provenance. They cannot settle disputed chronology, confirm territorial control or replace a historian’s review.</p>
<p>${report.claims_with_specialist_sources} of ${report.claims} dated claims also have a specialist, scholarly, institutional or primary source attached. The others rely on general references such as Wikipedia. Source classification is an editorial judgment, not an automated assessment of accuracy.</p>
<p><a href="data/quality-report.json" download>Download the full JSON report</a> · <a href="methodology.html">Read the source policy</a></p>
<h2>Editorial review queue · ${report.review_items} items</h2>${sections || '<p>No outstanding automated review flags. Human review is still required.</p>'}
<h2>Reproduce the checks</h2><p>Run <code>npm test</code> for structural and behavioral regressions, <code>npm run report:data</code> for this review queue, and <code>npm run validate:strict</code> to require the queue to be empty. Normal builds fail on structural errors; strict validation also fails on unresolved editorial items.</p></main><footer><p><a href="index.html">Return to the timeline</a></p><p>Generated from the canonical data; do not edit this page by hand.</p></footer></body></html>\n`;
  return {
    'www/data/timeline-data.js': `window.TIMELINE_DATA = ${JSON.stringify(data)};\nwindow.WIKIPEDIA_EXTRACTS = ${JSON.stringify(extracts)};\n`,
    'www/data/quality-report.json': `${JSON.stringify(report,null,2)}\n`,
    'www/quality.html': html
  };
}
if (require.main === module) {
  const read = file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  const artifacts = buildArtifacts(read('data/timeline.json'),read('data/wikipedia-extracts.json'));
  for(const [file,content] of Object.entries(artifacts)) fs.writeFileSync(path.join(root,file),content);
  console.log(`Built ${Object.keys(artifacts).length} static artifacts, including the data-quality report.`);
}
module.exports = { buildArtifacts };
