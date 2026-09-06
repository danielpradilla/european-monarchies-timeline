// Explicit article titles only. Review the diff before accepting refreshed context.
const fs = require('node:fs');
const path = require('node:path');
const { wikipediaTargets } = require('../www/assets/timeline-core');
const root = path.join(__dirname, '..');

function excerpt(text) {
  // Remove pronunciation-only parentheses, preserving dates and meaningful qualifications.
  const clean = text.replace(/\([^()]*[ˈˌɑɐəɛɪʊɜʃʒθð][^()]*\)/gu, '')
    .replace(/\(\s*[;,]?\s*\)/g, '').replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
  const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(clean)];
  let result = '';
  for (const { segment } of sentences.slice(0, 3)) {
    if (result.length + segment.length > 1100 && result) break;
    result += segment;
  }
  return result.length > 1400 ? `${result.slice(0, 1350).replace(/\s+\S*$/, '')}…` : result.trim();
}

async function refresh(data, previous = {}, fetcher = fetch) {
  const pages = {};
  const titles = wikipediaTargets(data);
  for (let offset = 0; offset < titles.length; offset += 20) {
    const batch = titles.slice(offset, offset + 20);
    const params = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', redirects: '1',
      prop: 'extracts|info|pageprops|revisions', exintro: '1', explaintext: '1', exlimit: 'max',
      inprop: 'url', rvprop: 'ids|timestamp', titles: batch.join('|') });
    const response = await fetcher(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'BraidedCrowns/1.0 (https://github.com/danielpradilla/european-monarchies-timeline)' },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`Wikipedia returned HTTP ${response.status}; cache unchanged.`);
    const body = await response.json();
    if (body.error || !body.query?.pages) throw new Error(body.error?.info || 'Missing Wikipedia pages');
    const aliases = new Map([...(body.query.normalized || []), ...(body.query.redirects || [])].map((r) => [r.from, r.to]));
    for (const requested of batch) {
      let title = requested;
      const seen = new Set();
      while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); }
      const page = body.query.pages.find((p) => p.title === title);
      if (!page || page.missing || page.ns !== 0 || page.pageprops?.disambiguation !== undefined || !page.extract?.trim()) {
        throw new Error(`No unambiguous article for ${requested}; correct the mapping. Cache unchanged.`);
      }
      const text = excerpt(page.extract);
      const revision = page.revisions?.[0];
      if (!revision?.revid || text.length < 40) throw new Error(`Incomplete extract for ${requested}; cache unchanged.`);
      pages[requested] = { title: page.title, page_id: page.pageid, revision_id: revision.revid,
        revision_at: revision.timestamp, retrieved_at: new Date().toISOString().slice(0, 10),
        url: page.fullurl, text };
      if (previous[requested]?.revision_id === revision.revid && previous[requested]?.text === text) pages[requested] = previous[requested];
    }
  }
  return pages;
}

if (require.main === module) {
  const cachePath = path.join(root, 'data', 'wikipedia-extracts.json');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'timeline.json')));
  const previous = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath)) : {};
  refresh(data, previous).then((pages) => {
    fs.writeFileSync(`${cachePath}.tmp`, `${JSON.stringify(pages, null, 2)}\n`);
    fs.renameSync(`${cachePath}.tmp`, cachePath);
    console.log(`Saved ${Object.keys(pages).length} attributed extracts. Review the diff, then npm run build.`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { excerpt, refresh };
