const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('production pages and assets exist', () => {
  for (const relativePath of [
    'www/index.html', 'www/methodology.html', 'www/blog.html',
    'www/assets/styles.css', 'www/assets/app.js',
    'www/data/timeline.json', 'www/data/timeline-data.js'
  ]) {
    assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} is missing`);
  }
});

test('canonical and deployed data are identical', () => {
  const canonical = fs.readFileSync(path.join(root, 'data', 'timeline.json'));
  const deployed = fs.readFileSync(path.join(www, 'data', 'timeline.json'));
  assert.deepEqual(deployed, canonical);
});

test('file-compatible data bundle matches the canonical data', () => {
  const canonical = JSON.parse(read('data/timeline.json'));
  const bundle = read('www/data/timeline-data.js');
  assert.match(bundle, /^window\.TIMELINE_DATA = /);
  const bundledData = JSON.parse(bundle.replace(/^window\.TIMELINE_DATA = /, '').replace(/;\s*$/, ''));
  assert.deepEqual(bundledData, canonical);
});

test('production index uses the new explorer and editorial pages', () => {
  const index = read('www/index.html');
  assert.match(index, /The Braided Crowns of Europe/);
  assert.match(index, /<script src="data\/timeline-data\.js" defer><\/script>/);
  assert.match(index, /<script src="assets\/app\.js" defer><\/script>/);
  assert.doesNotMatch(index, /type="module"/);
  assert.match(index, /assets\/styles\.css/);
  assert.match(index, /methodology\.html/);
  assert.match(index, /blog\.html/);
  assert.match(index, /id="sticky-axis-layer"/);
  assert.match(index, /class="label-column" id="label-column"/);
  assert.match(index, /role="group" aria-label="Vertical focused timeline"/);
  assert.match(index, /id="detail-toggle"/);
  assert.match(index, /id="detail-close"/);
  assert.doesNotMatch(index, /label-column[^>]*aria-hidden/);
  assert.doesNotMatch(index, /vega(?:-lite|-embed)?/i);
});

test('the app preserves the 1519 default when no year query is present', () => {
  const app = read('www/assets/app.js');
  assert.match(app, /searchParams\.has\('year'\)/);
  assert.match(app, /snapshotYear: 1519/);
});

test('the detail drawer can be dismissed from outside', () => {
  const app = read('www/assets/app.js');
  assert.match(app, /document\.addEventListener\('pointerdown'/);
  assert.match(app, /detailPanel\.contains\(event\.target\)/);
  assert.match(app, /setDetailOpen\(false\)/);
});

test('Francia and France are explicitly distinguished', () => {
  const data = JSON.parse(read('data/timeline.json'));
  const francia = data.polities.find((polity) => polity.id === 'frankish-kingdom');
  const france = data.polities.find((polity) => polity.id === 'france');
  const partition = data.relationships.find((relationship) => relationship.id === 'rel-frankish-partition');
  assert.match(francia.name, /Francia/);
  assert.match(france.summary, /West Francia/);
  assert.equal(data.phases.find((phase) => phase.polity_id === francia.id).end, 843);
  assert.equal(data.phases.find((phase) => phase.polity_id === france.id).start, 843);
  assert.deepEqual(partition.to, ['france', 'holy-roman-empire']);
});

test('essay links to every story date', () => {
  const blog = read('www/blog.html');
  for (const year of [843, 1066, 1519, 1707, 1918]) {
    assert.match(blog, new RegExp(`index\\.html\\?year=${year}`));
  }
});

test('local navigation targets resolve', () => {
  for (const pageName of ['index.html', 'methodology.html', 'blog.html']) {
    const html = fs.readFileSync(path.join(www, pageName), 'utf8');
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    for (const href of hrefs) {
      if (/^(?:https?:|#)/.test(href)) continue;
      const target = href.split('#')[0].split('?')[0];
      assert.ok(fs.existsSync(path.join(www, target)), `${pageName} links to missing ${target}`);
    }
  }
});

test('publication workflow deploys the static web root', () => {
  const workflow = read('.github/workflows/pages.yml');
  assert.match(workflow, /npm test && npm run build/);
  assert.match(workflow, /path: www/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
