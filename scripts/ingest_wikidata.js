/*
Simple Wikidata ingestion script (Node).

Purpose: given a list of monarchy Wikidata Q-IDs, fetch rulers and basic metadata,
then write two JSON outputs:
- data/wikidata_monarchies.json
- data/wikidata_people.json

Notes:
- This script uses node-fetch. Run `npm install node-fetch@2` in the project
  (or adapt to native fetch in Node 18+).
- Query strategy: for each monarchy QID we fetch rulers (P35? P39? uses 'position held')
  We'll query for humans who held a position that is subclass of 'monarch' and are
  linked to the monarchy item.
*/

const fs = require('fs');
const fetch = require('node-fetch');

const endpoint = 'https://query.wikidata.org/sparql';
const monIds = [
  // example: Byzantium, England (king of), France (king of), Holy Roman Empire (emperor), Castile
  { id: 'Q214', slug: 'byzantine-empire' },        // Byzantine Empire
  { id: 'Q145', slug: 'kingdom-england' },         // United Kingdom placeholder — we query kings of England differently
  { id: 'Q142', slug: 'kingdom-france' },
  { id: 'Q23484', slug: 'holy-roman-empire' },
  { id: 'Q9258', slug: 'crown-of-castile' },
  { id: 'Q458', slug: 'roman-empire' }
];

async function sparql(query) {
  const url = endpoint + '?query=' + encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error('SPARQL query failed: ' + res.status);
  return res.json();
}

function wikidataUrl(qid) { return `https://www.wikidata.org/wiki/${qid}`; }

async function fetchMonarchy(mon) {
  // Query: people who held a 'position held' (P39) that is instance of/held for this monarchy
  const q = `
SELECT ?person ?personLabel ?personDescription ?personBirth ?personDeath ?start ?end ?position ?positionLabel WHERE {
  ?person wdt:P39 ?position .
  ?position wdt:P279* ?posType .
  ?posType wdt:P31 wd:Q11696 . # Q11696 = monarch
  OPTIONAL { ?person wdt:P569 ?personBirth }
  OPTIONAL { ?person wdt:P570 ?personDeath }
  OPTIONAL { ?pNode ps:P39 ?position; pq:P580 ?start; pq:P582 ?end; }
  FILTER EXISTS { ?position wdt:P17 wd:${mon.id} } # position's country = monarchy
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?start
LIMIT 500
`;
  try {
    const r = await sparql(q);
    const people = r.results.bindings.map(b => ({
      id: b.person.value.split('/').pop(),
      name: b.personLabel ? b.personLabel.value : null,
      description: b.personDescription ? b.personDescription.value : null,
      birth_year: b.personBirth ? new Date(b.personBirth.value).getUTCFullYear() : null,
      death_year: b.personDeath ? new Date(b.personDeath.value).getUTCFullYear() : null,
      reign_start: b.start ? new Date(b.start.value).getUTCFullYear() : null,
      reign_end: b.end ? new Date(b.end.value).getUTCFullYear() : null,
      position: b.position ? b.position.value.split('/').pop() : null,
      wikidata: wikidataUrl(b.person.value.split('/').pop())
    }));

    return { monarchy: mon, people };
  } catch (err) {
    console.error('Error fetching', mon, err);
    return { monarchy: mon, people: [] };
  }
}

(async function main(){
  const allMonarchies = [];
  const allPeople = {};

  for (const m of monIds) {
    const res = await fetchMonarchy(m);
    allMonarchies.push({ id: m.slug, wikidata: m.id, people_count: res.people.length });
    for (const p of res.people) allPeople[p.id] = p;
  }

  fs.writeFileSync('data/wikidata_monarchies.json', JSON.stringify(allMonarchies, null, 2));
  fs.writeFileSync('data/wikidata_people.json', JSON.stringify(Object.values(allPeople), null, 2));

  console.log('Wrote data/wikidata_monarchies.json and data/wikidata_people.json');
})();
