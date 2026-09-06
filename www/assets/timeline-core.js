/* Shared by the static explorer and Node checks; no browser or network required. */
const TimelineCore = (() => {
  const relationshipTypes = {
    continuity: ['→', 'Continuity'], conquest: ['×', 'Conquest'],
    composite_monarchy: ['◇', 'Composite monarchy'], dissolution: ['×', 'Dissolution'],
    dynastic_union: ['◇', 'Dynastic union'], partition: ['↗', 'Partition'],
    personal_union: ['◇', 'Personal union'], restoration: ['↺', 'Restoration'],
    state_union: ['+', 'State union'], constitutional_reorganization: ['↔', 'Constitutional reorganization'],
    union_framework: ['◇', 'Union framework (interrupted)']
  };
  const endYear = (item, meta) => item.end === null ? meta.end_year : item.end;
  const yearPosition = (year) => year < 0 ? year + 1 : year;
  const formatYear = (year) => `${Math.abs(year)} ${year < 0 ? 'BCE' : 'CE'}`;
  const formatRange = (start, end) => start === end ? formatYear(start)
    : `${formatYear(start)}–${end === null ? 'ongoing at snapshot' : formatYear(end)}`;
  const overlaps = (a, b, meta) => a.start <= endYear(b, meta) && endYear(a, meta) >= b.start;
  // ponytail: annual overlap includes transition years; add exact dates when sub-year comparison is required.
  const activeDuring = (item, year, meta) => item.start <= year && endYear(item, meta) >= year;
  const normalizeText = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en');
  function normalizeYear(value, meta, fallback = 1519) {
    const number = String(value ?? '').trim() ? Number(value) : NaN;
    const year = Number.isInteger(number) ? number : fallback;
    return Math.max(meta.start_year, Math.min(meta.end_year, year === 0 ? 1 : year));
  }
  function indexData(data) {
    const ids = Object.fromEntries(Object.entries(data).filter(([, v]) => Array.isArray(v))
      .map(([key, rows]) => [key, new Map(rows.map((row) => [row.id, row]))]));
    const byPolity = new Map(data.polities.map((p) => [p.id, { phases: [], rules: [], reigns: [], relationships: [], events: [] }]));
    for (const key of ['phases', 'rules', 'reigns']) {
      for (const row of data[key]) byPolity.get(row.polity_id)?.[key].push(row);
      for (const group of byPolity.values()) group[key].sort((a, b) => a.start - b.start);
    }
    for (const row of data.relationships) {
      for (const id of new Set([...row.from, ...row.to])) byPolity.get(id)?.relationships.push(row);
    }
    for (const row of data.events) for (const id of row.polity_ids) byPolity.get(id)?.events.push(row);
    const navigation = [
      ...data.polities.map(p => ({ type: 'polity', id: p.id, label: p.short_name, context: `Country · ${p.name} · ${p.region}` })),
      ...[...new Set(data.polities.map(p => p.region))].map(region => ({ type: 'region', id: region, label: region, context: 'Region' }))
    ];
    for (const [collection, type, entity, key, kind] of [
      ['reigns', 'reign', 'persons', 'person_id', 'Monarch'],
      ['rules', 'rule', 'houses', 'house_id', 'Dynasty']
    ]) for (const row of data[collection]) navigation.push({
      type, id: row.id, label: ids[entity].get(row[key]).name,
      context: `${ids[entity].get(row[key]).kind === 'office' ? 'Office' : kind} · ${ids.polities.get(row.polity_id).short_name} · ${formatRange(row.start, row.end)}`
    });
    for (const item of navigation) {
      item.name = normalizeText(item.label);
      item.text = normalizeText(`${item.label} ${item.context}`);
    }
    return { ids, byPolity, navigation };
  }
  function searchEntries(index, input) {
    const query = normalizeText(input).trim().replace(/\s+/g, ' ');
    if (!query) return [];
    const words = query.split(' ');
    const rank = item => item.name === query ? 0 : item.name.startsWith(query) ? 1 : item.name.includes(query) ? 2 : 3;
    return index.navigation.filter(item => words.every(word => item.text.includes(word)))
      .sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label) || a.context.localeCompare(b.context));
  }
  function snapshot(data, index, polities, year) {
    const activePhases = polities.flatMap((p) => index.byPolity.get(p.id).phases).filter((p) => activeDuring(p, year, data.meta));
    const activeIds = new Set(activePhases.map((p) => p.polity_id));
    const activeReigns = [...activeIds].flatMap((id) => index.byPolity.get(id).reigns).filter((r) => activeDuring(r, year, data.meta));
    return { activePhases, activeIds, activeReigns };
  }
  function wikipediaTitle(url) {
    try {
      const parsed = new URL(url);
      return parsed.origin === 'https://en.wikipedia.org' && parsed.pathname.startsWith('/wiki/')
        ? decodeURIComponent(parsed.pathname.slice(6)).replaceAll('_', ' ') : '';
    } catch { return ''; }
  }
  function wikipediaTargets(data) {
    return [...new Set([...data.houses, ...data.persons].map((row) => row.wikipedia_title || wikipediaTitle(row.url)).filter(Boolean))].sort();
  }
  return { relationshipTypes, endYear, yearPosition, formatYear, formatRange, overlaps, activeDuring,
    normalizeYear, normalizeText, indexData, searchEntries, snapshot, wikipediaTitle, wikipediaTargets };
})();
if (typeof module !== 'undefined') module.exports = TimelineCore;
