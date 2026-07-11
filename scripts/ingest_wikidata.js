/*
Fetch review candidates from Wikidata without modifying the canonical timeline.

The output is deliberately separate from data/timeline.json. Wikidata position
and date coverage is uneven, so every candidate still requires editorial review.
Run with Node 22+:

  node scripts/ingest_wikidata.js
*/

const fs = require('fs');
const path = require('path');

const endpoint = 'https://query.wikidata.org/sparql';
const realms = [
  { id: 'Q12544', slug: 'eastern-roman-empire', label: 'Byzantine Empire' },
  { id: 'Q179876', slug: 'england', label: 'Kingdom of England' },
  { id: 'Q70972', slug: 'france', label: 'Kingdom of France' },
  { id: 'Q12548', slug: 'holy-roman-empire', label: 'Holy Roman Empire' },
  { id: 'Q217196', slug: 'castile', label: 'Crown of Castile' },
  { id: 'Q2277', slug: 'roman-empire', label: 'Roman Empire' }
];

async function sparql(query) {
  const url = `${endpoint}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'european-monarchies-timeline/1.0 (https://github.com/danielpradilla/european-monarchies-timeline)'
    }
  });
  if (!response.ok) throw new Error(`SPARQL query failed with HTTP ${response.status}`);
  return response.json();
}

function qid(uri) {
  return uri.split('/').pop();
}

function wikidataYear(value) {
  if (!value) return null;
  const match = /^([+-]?\d+)-/.exec(value);
  return match ? Number(match[1]) : null;
}

async function fetchRealm(realm) {
  const query = `
SELECT ?person ?personLabel ?position ?positionLabel ?birth ?death ?start ?end WHERE {
  ?person p:P39 ?statement .
  ?statement ps:P39 ?position .
  ?position (wdt:P1001|wdt:P17) wd:${realm.id} .
  OPTIONAL { ?statement pq:P580 ?start }
  OPTIONAL { ?statement pq:P582 ?end }
  OPTIONAL { ?person wdt:P569 ?birth }
  OPTIONAL { ?person wdt:P570 ?death }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?start ?personLabel
LIMIT 500
`;
  const result = await sparql(query);
  return result.results.bindings.map((binding) => ({
    realm_id: realm.id,
    polity_id: realm.slug,
    person_id: qid(binding.person.value),
    person_name: binding.personLabel?.value || qid(binding.person.value),
    position_id: qid(binding.position.value),
    position_name: binding.positionLabel?.value || qid(binding.position.value),
    birth_year: wikidataYear(binding.birth?.value),
    death_year: wikidataYear(binding.death?.value),
    reign_start: wikidataYear(binding.start?.value),
    reign_end: wikidataYear(binding.end?.value),
    person_url: `https://www.wikidata.org/wiki/${qid(binding.person.value)}`
  }));
}

async function main() {
  const candidates = [];
  const summaries = [];

  for (const realm of realms) {
    try {
      const rows = await fetchRealm(realm);
      summaries.push({
        id: realm.slug,
        wikidata: realm.id,
        label: realm.label,
        candidate_count: rows.length
      });
      candidates.push(...rows);
      console.log(`${realm.label}: ${rows.length} candidate rows`);
    } catch (error) {
      summaries.push({
        id: realm.slug,
        wikidata: realm.id,
        label: realm.label,
        candidate_count: 0,
        error: error.message
      });
      console.error(`${realm.label}: ${error.message}`);
    }
  }

  const seen = new Set();
  const deduplicated = candidates.filter((candidate) => {
    const key = [
      candidate.polity_id,
      candidate.person_id,
      candidate.position_id,
      candidate.reign_start,
      candidate.reign_end
    ].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const dataDirectory = path.join(__dirname, '..', 'data');
  fs.writeFileSync(
    path.join(dataDirectory, 'wikidata_monarchies.json'),
    `${JSON.stringify(summaries, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(dataDirectory, 'wikidata_candidates.json'),
    `${JSON.stringify(deduplicated, null, 2)}\n`
  );
  console.log(`Wrote ${deduplicated.length} review candidates without changing the canonical timeline.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
