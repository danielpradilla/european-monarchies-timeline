const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { buildArtifacts, writeArtifact } = require('../scripts/build_site_data');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const data=JSON.parse(read('data/timeline.json'));
const extracts=JSON.parse(read('data/wikipedia-extracts.json'));

test('working-tree static artifacts match a deterministic validated build',()=>{
  for(const [file,content] of Object.entries(buildArtifacts(data,extracts))) assert.equal(read(file),content,`${file}: run npm run build`);
});
test('artifact publication creates and replaces complete files without temporary leftovers',t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'monarchy-build-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'artifact.json');
  for(const content of ['first artifact\n','replacement with Unicode: ñ\n','']){
    writeArtifact(file,content);
    assert.equal(fs.readFileSync(file,'utf8'),content);
    assert.deepEqual(fs.readdirSync(directory),['artifact.json']);
  }
});
for(const stage of ['write','rename']){
  test(`artifact publication preserves the previous target and cleans up after ${stage} failure`,t=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'monarchy-build-'));
    t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
    const file=path.join(directory,'artifact.json');
    fs.writeFileSync(file,'previous artifact\n');
    const failure=new Error(`${stage} failed`);
    if(stage==='write'){
      const write=fs.writeFileSync;
      t.mock.method(fs,'writeFileSync',(descriptor)=>{
        write(descriptor,'partial replacement');
        assert.equal(fs.readFileSync(file,'utf8'),'previous artifact\n');
        throw failure;
      });
    }else{
      t.mock.method(fs,'renameSync',(temporary,target)=>{
        assert.equal(path.dirname(temporary),directory);
        assert.equal(target,file);
        assert.equal(fs.readFileSync(temporary,'utf8'),'replacement artifact\n');
        assert.equal(fs.readFileSync(file,'utf8'),'previous artifact\n');
        throw failure;
      });
    }
    assert.throws(()=>writeArtifact(file,'replacement artifact\n'),error=>error===failure);
    assert.equal(fs.readFileSync(file,'utf8'),'previous artifact\n');
    assert.deepEqual(fs.readdirSync(directory),['artifact.json']);
  });
}
test('file-compatible bundle loads both data and cached context',()=>{
  const context={window:{}};vm.runInNewContext(read('www/data/timeline-data.js'),context);
  assert.equal(JSON.stringify(context.window.TIMELINE_DATA),JSON.stringify(data));
  assert.equal(JSON.stringify(context.window.WIKIPEDIA_EXTRACTS),JSON.stringify(extracts));
});
test('production pages resolve navigation and assets, including cache-versioned links',()=>{
  for(const page of ['index','methodology','blog','quality']){
    const html=read(`www/${page}.html`);
    for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=match[1];if(/^(?:https?:|#|\/)/.test(url))continue;
      assert.ok(fs.existsSync(path.join(root,'www',url.split(/[?#]/)[0])),`${page}: missing ${url}`);
    }
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
  assert.match(read('www/methodology.html'),/annual overlap/);
  assert.match(read('www/assets/app.js'),/CC BY-SA 4\.0/);
  assert.doesNotMatch(read('www/assets/app.js'),/fetch\(/);
});
