const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { fetchRealm, main } = require('../scripts/ingest_wikidata');

test('candidate ingestion limits offices, reports truncation and preserves files on total or partial failure', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'monarchy-ingest-'));
  const files = ['wikidata_monarchies.json', 'wikidata_candidates.json'];
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const file of files) fs.writeFileSync(path.join(directory, file), 'previous data');
  const binding = { person: { value: 'http://www.wikidata.org/entity/Q1' }, position: { value: 'http://www.wikidata.org/entity/Q2' } };
  const fetch = t.mock.method(globalThis, 'fetch', async url => {
    const query = new URL(url).searchParams.get('query');
    assert.match(query, /\(wdt:P31\|wdt:P279\)\/wdt:P279\* wd:Q116/);
    assert.match(query, /LIMIT 501/);
    return { ok: true, json: async () => ({ results: { bindings: Array(501).fill(binding) } }) };
  });
  const result = await fetchRealm({ id: 'Q2277', slug: 'roman-empire' });
  assert.equal(result.rows.length, 500);
  assert.equal(result.truncated, true);
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  fetch.mock.mockImplementation(async () => { throw new Error('offline'); });
  await assert.rejects(main(directory), /6\/6.*Previous output files preserved/);
  let calls = 0;
  fetch.mock.mockImplementation(async () => {
    if (++calls === 2) throw new Error('offline');
    return { ok: true, json: async () => ({ results: { bindings: [binding] } }) };
  });
  await assert.rejects(main(directory), /1\/6.*no partial results written/);
  for (const file of files) assert.equal(fs.readFileSync(path.join(directory, file), 'utf8'), 'previous data');
  fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ results: { bindings: [binding, binding] } }) }));
  await main(directory);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, files[1]))).length, 6);
  assert.ok(JSON.parse(fs.readFileSync(path.join(directory, files[0]))).every(r => r.truncated === false));
});
