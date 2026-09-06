const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { buildArtifacts } = require('../scripts/build_site_data');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const data=JSON.parse(read('data/timeline.json'));
const extracts=JSON.parse(read('data/wikipedia-extracts.json'));

test('committed static artifacts match a deterministic validated build',()=>{
  for(const [file,content] of Object.entries(buildArtifacts(data,extracts))) assert.equal(read(file),content,`${file}: run npm run build`);
});
test('file-compatible bundle loads both data and cached context',()=>{
  const context={window:{}};vm.runInNewContext(read('www/data/timeline-data.js'),context);
  assert.equal(JSON.stringify(context.window.TIMELINE_DATA),JSON.stringify(data));
  assert.equal(JSON.stringify(context.window.WIKIPEDIA_EXTRACTS),JSON.stringify(extracts));
});
test('production pages resolve navigation and assets, including cache-versioned links',()=>{
  for(const page of ['index','methodology','blog','quality']){
    const html=read(`www/${page}.html`);
    for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=match[1];if(/^(?:https?:|#)/.test(url))continue;
      assert.ok(fs.existsSync(path.join(root,'www',url.split(/[?#]/)[0])),`${page}: missing ${url}`);
    }
    assert.match(html,/aria-current="page"/);
    assert.match(html,/quality\.html/);
  }
});
test('app scripts are valid and controls use unique IDs',()=>{
  new vm.Script(read('www/assets/app.js'));new vm.Script(read('www/assets/timeline-core.js'));
  const index=read('www/index.html'),ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const m of read('www/assets/app.js').matchAll(/getElementById\('([^']+)'\)/g)) assert.ok(ids.includes(m[1]),`missing control ${m[1]}`);
  const scripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
  assert.deepEqual(scripts,['assets/timeline-core.js','data/timeline-data.js','assets/app.js']);
});
test('editorial examples preserve real inputs and distinguish conquest from union',()=>{
  const rel=id=>data.relationships.find(r=>r.id===id);
  assert.deepEqual(rel('rel-frankish-partition').to,['france','middle-francia','east-francia']);
  assert.deepEqual(rel('rel-united-kingdom').from,['great-britain','ireland']);
  assert.deepEqual(rel('rel-serbia-yugoslavia').from,['serbia']);
  assert.equal(rel('rel-sardinia-italy').type,'continuity');
  assert.equal(rel('rel-two-sicilies-annexation').type,'conquest');
  assert.equal(data.rules.find(r=>r.id==='rule-croatia-trpimirovic').end,1090);
});
test('published copy explains annual overlap and Wikipedia attribution',()=>{
  const index=read('www/index.html');
  assert.doesNotMatch(index,/same moment|Loading context from Wikipedia/);
  assert.match(index,/during that year/);
  assert.match(read('www/assets/app.js'),/CC BY-SA 4\.0/);
  assert.doesNotMatch(read('www/assets/app.js'),/fetch\(/);
});
test('publication workflow validates and deploys the static web root',()=>{
  const workflow=read('.github/workflows/pages.yml');
  assert.match(workflow,/npm test && npm run build/);
  assert.match(workflow,/path: www/);
});
