const PIXELS_PER_YEAR = 1.35;
const ROW_HEIGHT = 62;
const REGION_HEIGHT = 34;
const AXIS_HEIGHT = 64;
const COLUMN_WIDTH = 36;
const COLUMN_AXIS = 52;
const COLUMN_PAD = 24;

const REGION_ORDER = [
  'Mediterranean',
  'Southeast Europe',
  'Italian states',
  'Iberia',
  'Western Europe',
  'Britain and Ireland',
  'Central Europe',
  'Central and Eastern Europe',
  'Nordics'
];

const HOUSE_PALETTE = [
  '#9a3b32', '#295f73', '#82602c', '#526f3d', '#75518c', '#a35d27',
  '#3f6d68', '#864f64', '#5c5f9a', '#8a6939', '#3e6b50', '#765b43'
];

const RELATION_SYMBOLS = Object.fromEntries(Object.entries(TimelineCore.relationshipTypes).map(([key, value]) => [key, value[0]]));

const state = {
  data: window.TIMELINE_DATA,
  snapshotYear: 1519,
  selected: null,
  // shortcut: focus is transient outside house/rule links; add URL state if independent focus sharing is needed.
  houseFocusId: null,
  collapsedRegions: new Set(),
  polities: [],
  layout: [],
  relationshipMarkers: new Map(),
  plotWidth: 0,
  plotHeight: 0
};

const elements = {
  explorer: document.querySelector('.explorer'),
  search: document.getElementById('search'),
  searchPanel: document.getElementById('search-panel'),
  searchResults: document.getElementById('search-results'),
  searchStatus: document.getElementById('search-status'),
  detailWikipedia: document.getElementById('detail-wikipedia'),
  detailEvidence: document.getElementById('detail-evidence'),
  detailRelated: document.getElementById('detail-related'),
  presetButtons: document.getElementById('preset-buttons'),
  snapshotYear: document.getElementById('snapshot-year'),
  snapshotYearOutput: document.getElementById('snapshot-year-output'),
  snapshotSummary: document.getElementById('snapshot-summary'),
  houseFocusStatus: document.getElementById('house-focus-status'),
  error: document.getElementById('timeline-error'),
  desktopTimeline: document.getElementById('desktop-timeline'),
  labelColumn: document.getElementById('label-column'),
  plotScroller: document.getElementById('plot-scroller'),
  plotCanvas: document.getElementById('plot-canvas'),
  axisLayer: document.getElementById('axis-layer'),
  stickyAxisLayer: document.getElementById('sticky-axis-layer'),
  rulerYear: document.getElementById('ruler-year'),
  laneLayer: document.getElementById('lane-layer'),
  relationshipLayer: document.getElementById('relationship-layer'),
  relationshipControlsLayer: document.getElementById('relationship-controls-layer'),
  relationshipTooltip: document.getElementById('relationship-tooltip'),
  crosshair: document.getElementById('crosshair'),
  columnHeader: document.getElementById('column-header'),
  columnHeaderTrack: document.getElementById('column-header-track'),
  verticalScroller: document.getElementById('vertical-scroller'),
  verticalChart: document.getElementById('vertical-chart'),
  detailPanel: document.getElementById('detail-panel'),
  detailToggle: document.getElementById('detail-toggle'),
  detailToggleTitle: document.getElementById('detail-toggle-title'),
  detailClose: document.getElementById('detail-close'),
  detailType: document.getElementById('detail-type'),
  detailTitle: document.getElementById('detail-title'),
  detailDates: document.getElementById('detail-dates'),
  detailCopy: document.getElementById('detail-copy'),
  detailSecondaryTitle: document.getElementById('detail-secondary-title'),
  detailList: document.getElementById('detail-list'),
  detailSources: document.getElementById('detail-sources'),
  readingGuide: document.getElementById('reading-guide'),
  readingGuideOpeners: document.querySelectorAll('.reading-guide-open'),
  readingGuideClose: document.getElementById('reading-guide-close')
};

const dataIndex = state.data ? TimelineCore.indexData(state.data) : { ids: {}, byPolity: new Map(), navigation: [] };
const collectionMaps = new Map(Object.entries(dataIndex.ids).map(([key, map]) => [state.data[key], map]));
const byId = (items, id) => collectionMaps.get(items)?.get(id);
const recordsFor = (polityId, key) => dataIndex.byPolity.get(polityId)?.[key] || [];
const mobileView = () => window.matchMedia('(max-width: 760px)').matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = () => reducedMotion() ? 'auto' : 'smooth';

function formatYear(year) { return TimelineCore.formatYear(year); }

function formatRange(start, end) { return TimelineCore.formatRange(start, end); }

function chartStart() {
  return state.data.meta.start_year;
}

function chartEnd() {
  return state.data.meta.end_year;
}

function effectiveEnd(item) {
  return item.end === null ? chartEnd() : item.end;
}

function xForYear(year) {
  const position = TimelineCore.yearPosition;
  return ((position(year) - position(chartStart())) / (position(chartEnd()) - position(chartStart()))) * state.plotWidth;
}

function yearForX(x) {
  const start = TimelineCore.yearPosition(chartStart());
  const end = TimelineCore.yearPosition(chartEnd());
  const position = Math.round(start + Math.max(0, Math.min(state.plotWidth, x)) / state.plotWidth * (end - start));
  return position <= 0 ? position - 1 : position;
}

let plotPanTarget = null;
let plotScrollLeft = 0;
let wheelX = null;
let timeScrollTimer;
let columnBrowsing = false;

function stopColumnBrowsing() {
  columnBrowsing = false;
  clearTimeout(timeScrollTimer);
}

function panPlotTo(left, behavior = 'instant') {
  const scroller = elements.plotScroller;
  clearTimeout(timeScrollTimer);
  wheelX = null;
  // Match native pixel rounding so the penultimate smooth-scroll event cannot release ownership.
  plotPanTarget = Math.round(Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth, left)));
  scroller.scrollTo({ left: plotPanTarget, behavior });
  plotScrollLeft = scroller.scrollLeft;
  if (plotScrollLeft === plotPanTarget) plotPanTarget = null;
  syncStickyAxis();
}

function houseColor(houseId) {
  let hash = 0;
  for (const character of houseId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return HOUSE_PALETTE[Math.abs(hash) % HOUSE_PALETTE.length];
}

function polityStart(polityId) { return recordsFor(polityId, 'phases')[0]?.start ?? chartEnd(); }

function sourceObjects(sourceIds = []) {
  return sourceIds.map((id) => byId(state.data.sources, id)).filter(Boolean);
}

function addWikipediaSummary(record) {
  const title = record.wikipedia_title || TimelineCore.wikipediaTitle(record.url);
  const page = window.WIKIPEDIA_EXTRACTS?.[title];
  elements.detailWikipedia.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = page ? `Wikipedia · ${page.title}` : 'Further reading';
  const copy = document.createElement('p');
  copy.textContent = page?.text || 'No cached Wikipedia extract is available for this record. The linked references below remain available.';
  elements.detailWikipedia.append(heading, copy);
  if (!page) return;
  const attribution = document.createElement('p');
  attribution.className = 'attribution';
  attribution.append('Excerpt from Wikipedia contributors; shortened and pronunciation guides omitted. ');
  for (const [label, url] of [
    ['Read the article', page.url],
    [`Revision ${page.revision_id}`, `https://en.wikipedia.org/w/index.php?oldid=${page.revision_id}`],
    ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/']
  ]) {
    const link = document.createElement('a'); link.href = url; link.textContent = label;
    link.target = '_blank'; link.rel = 'noreferrer'; attribution.append(link, ' · ');
  }
  attribution.append(`Retrieved ${page.retrieved_at}`);
  elements.detailWikipedia.append(attribution);
}

function orderedPolities() {
  return [...state.data.polities].sort((a, b) => {
    const rank = (region) => REGION_ORDER.includes(region) ? REGION_ORDER.indexOf(region) : REGION_ORDER.length;
    return rank(a.region) - rank(b.region) || polityStart(a.id) - polityStart(b.id) || a.name.localeCompare(b.name);
  });
}

let searchMatches = [];
let activeSearchIndex = -1;
function closeSearch() {
  elements.searchPanel.hidden = true;
  elements.search.setAttribute('aria-expanded', 'false');
  elements.search.removeAttribute('aria-activedescendant');
}
function renderSearch() {
  searchMatches = TimelineCore.searchEntries(dataIndex, elements.search.value);
  activeSearchIndex = -1;
  elements.searchResults.replaceChildren();
  elements.search.removeAttribute('aria-activedescendant');
  if (!elements.search.value.trim()) { closeSearch(); return; }
  for (const [index, result] of searchMatches.entries()) {
    const option = document.createElement('li');
    option.id = `search-option-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    const name = document.createElement('strong'), context = document.createElement('span');
    name.textContent = result.label;
    context.textContent = result.context;
    option.append(name, context);
    option.addEventListener('click', () => jumpToResult(result));
    elements.searchResults.append(option);
  }
  elements.searchStatus.textContent = searchMatches.length ? `${searchMatches.length} matches.` : 'No matches. Try another name or place.';
  elements.searchStatus.className = searchMatches.length ? 'sr-only' : '';
  elements.searchPanel.hidden = false;
  elements.search.setAttribute('aria-expanded', 'true');
}
function bindSearch() {
  elements.search.addEventListener('input', renderSearch);
  elements.search.addEventListener('focus', renderSearch);
  elements.search.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') { closeSearch(); setHouseFocus(null); event.stopPropagation(); return; }
    if (event.key === 'Tab') { closeSearch(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (elements.searchPanel.hidden) renderSearch();
    if (!searchMatches.length) return;
    if (event.key === 'Enter') { jumpToResult(searchMatches[Math.max(0, activeSearchIndex)]); return; }
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    activeSearchIndex = activeSearchIndex < 0 ? (direction > 0 ? 0 : searchMatches.length - 1)
      : (activeSearchIndex + direction + searchMatches.length) % searchMatches.length;
    [...elements.searchResults.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === activeSearchIndex)));
    const option = elements.searchResults.children[activeSearchIndex];
    elements.search.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.search-control')) closeSearch();
  });
}

function toggleRegion(region) {
  if (!state.collapsedRegions.delete(region)) state.collapsedRegions.add(region);
  renderTimeline();
  elements.labelColumn.querySelector(`[data-region="${CSS.escape(region)}"]`)?.focus();
}

function jumpToResult(result, openDetails = false, requestedYear = null) {
  stopColumnBrowsing();
  if (!openRecord(result.type, result.id, false)) return false;
  const collection = { reign: 'reigns', rule: 'rules', phase: 'phases', event: 'events', relationship: 'relationships' }[result.type];
  const record = result.type === 'house' ? rulesForHouse(result.id)[0] : dataIndex.ids[collection]?.get(result.id);
  const polityId = result.type === 'polity' ? result.id : result.type === 'region'
    ? state.polities.find(p => p.region === result.id)?.id : record?.polity_id || record?.from?.[0] || record?.to?.[0] || record?.polity_ids?.[0];
  if (!polityId) return false;
  if (state.collapsedRegions.delete(byId(state.data.polities, polityId)?.region)) renderTimeline();
  const phases = recordsFor(polityId, 'phases');
  const year = requestedYear ?? record?.start ?? record?.year ?? (result.type === 'region' || phases.some(p => TimelineCore.activeDuring(p, state.snapshotYear, state.data.meta)) ? state.snapshotYear : phases[0].start);
  state.snapshotYear = year;
  updateCrosshair();
  for (const button of elements.presetButtons.children) button.setAttribute('aria-pressed', String(Number(button.dataset.year) === year));
  const mobile = mobileView();
  const chart = mobile ? elements.verticalChart : elements.plotCanvas;
  const attribute = { reign: 'reignId', rule: 'ruleId', house: 'ruleId', phase: 'phaseId', relationship: 'relationshipId' }[result.type];
  let target = attribute ? [...chart.querySelectorAll('button')].find(button => button.dataset[attribute] === record?.id) : null;
  if (!target && mobile) target = elements.columnHeaderTrack.querySelector(`[data-polity-id="${CSS.escape(polityId)}"]`);
  if (!target && !mobile) target = result.type === 'region'
    ? [...elements.labelColumn.querySelectorAll('[data-region]')].find(item => item.dataset.region === result.id)
    : [...elements.labelColumn.querySelectorAll('button')].find(button => button.dataset.polityId === polityId);
  target ||= elements.verticalChart;
  for (const previous of document.querySelectorAll('.search-match')) previous.classList.remove('search-match');
  target.classList.add('search-match');
  target.focus({ preventScroll: true });
  const focusYear = record?.start !== undefined ? (record.start + (record.end === undefined ? record.start : effectiveEnd(record))) / 2 : year;
  if (mobile) scrollColumnsTo(focusYear, polityId);
  else {
    panPlotTo(xForYear(focusYear) - elements.plotScroller.clientWidth / 2, scrollBehavior());
    const rect = target.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + rect.top + rect.height / 2 - (window.innerHeight + 64) / 2), behavior: scrollBehavior() });
  }
  elements.search.value = result.label || (result.type === 'region' ? result.id : elements.detailTitle.textContent);
  closeSearch();
  syncUrl();
  if (openDetails) setDetailOpen(true);
  return true;
}

function renderPresetButtons() {
  elements.presetButtons.replaceChildren();
  for (const preset of state.data.presets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-button';
    button.dataset.year = String(preset.year);
    button.setAttribute('aria-pressed', String(preset.year === state.snapshotYear));
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      selectSnapshotYear(preset.year);
      setDetailOpen(true);
    });
    elements.presetButtons.append(button);
  }
}

function buildLayout(polities) {
  // Anchor each symbol to a visible endpoint; stack nearby dates below the ruler labels.
  const visible = new Set(polities.filter(p => !state.collapsedRegions.has(p.region)).map(p => p.id));
  const markerSlots = new Map();
  state.relationshipMarkers.clear();
  for (const relationship of [...state.data.relationships].sort((a, b) => a.start - b.start)) {
    const polityId = [...relationship.from, ...relationship.to].find(id => visible.has(id));
    if (!polityId) continue;
    const x = xForYear(relationship.start);
    const slots = markerSlots.get(polityId) || [];
    let slot = slots.findIndex(previousX => x - previousX >= 20);
    if (slot < 0) slot = slots.length;
    slots[slot] = x;
    markerSlots.set(polityId, slots);
    state.relationshipMarkers.set(relationship.id, { polityId, offset: ROW_HEIGHT + 10 + slot * 20 });
  }
  const layout = [];
  let top = 0;
  let activeRegion = null;
  for (const polity of polities) {
    if (polity.region !== activeRegion) {
      activeRegion = polity.region;
      layout.push({ type: 'region', region: activeRegion, top });
      top += REGION_HEIGHT;
    }
    if (state.collapsedRegions.has(polity.region)) continue;
    const height = ROW_HEIGHT + (markerSlots.get(polity.id)?.length || 0) * 20;
    layout.push({ type: 'polity', polity, top, height });
    top += height;
  }
  state.plotHeight = top;
  return layout;
}

function axisTicks() {
  const ticks = [chartStart()];
  const tickStep = 100;
  for (let year = Math.ceil(chartStart() / tickStep) * tickStep; year < chartEnd(); year += tickStep) {
    if (year !== 0 && year !== chartStart() && chartEnd() - year > tickStep / 2) ticks.push(year);
  }
  if (chartEnd() !== chartStart()) ticks.push(chartEnd());
  return ticks;
}

function renderAxisInto(container) {
  container.replaceChildren();
  container.style.width = `${state.plotWidth}px`;
  for (const year of axisTicks()) {
    const tick = document.createElement('div');
    tick.className = 'axis-tick';
    tick.style.left = `${xForYear(year)}px`;
    const label = document.createElement('span');
    label.textContent = formatYear(year);
    tick.append(label);
    container.append(tick);
  }
}

function syncStickyAxis() {
  elements.stickyAxisLayer.style.transform = `translateX(${-elements.plotScroller.scrollLeft}px)`;
  const left = xForYear(state.snapshotYear) - elements.plotScroller.scrollLeft;
  elements.rulerYear.style.left = `${left}px`;
  elements.rulerYear.dataset.edge = left <= 44 ? 'start'
    : left >= elements.rulerYear.parentElement.clientWidth - 44 ? 'end' : '';
}

function renderAxis() {
  renderAxisInto(elements.axisLayer);
  renderAxisInto(elements.stickyAxisLayer);
  syncStickyAxis();
}

function renderLabelColumn() {
  elements.labelColumn.replaceChildren();
  elements.labelColumn.style.height = `${AXIS_HEIGHT + state.plotHeight}px`;
  for (const item of state.layout) {
    if (item.type === 'region') {
      const collapsed = state.collapsedRegions.has(item.region);
      const region = document.createElement('button');
      region.type = 'button';
      region.className = 'label-region';
      region.textContent = item.region;
      region.dataset.region = item.region;
      region.setAttribute('aria-expanded', String(!collapsed));
      region.addEventListener('click', () => toggleRegion(item.region));
      elements.labelColumn.append(region);
      continue;
    }

    const row = document.createElement('div');
    row.className = 'label-row';
    row.dataset.polityId = item.polity.id;
    row.style.height = `${item.height}px`;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.polityId = item.polity.id;
    button.setAttribute('aria-pressed', String(state.selected?.type === 'polity' && state.selected.id === item.polity.id));
    button.className = item.polity.status === 'current' ? 'current-indicator' : '';
    button.textContent = item.polity.short_name;
    const small = document.createElement('small');
    small.textContent = item.polity.status === 'current' ? 'current monarchy' : `from ${formatYear(polityStart(item.polity.id))}`;
    button.append(small);
    button.addEventListener('click', () => {
      showPolityDetail(item.polity.id);
      setDetailOpen(true);
    });
    row.append(button);
    elements.labelColumn.append(row);
  }
}

function elementButton(className, ariaLabel, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', ariaLabel);
  button.addEventListener('click', () => {
    onClick();
    setDetailOpen(true);
  });
  return button;
}

function renderLaneLayer() {
  elements.laneLayer.replaceChildren();
  elements.laneLayer.style.width = `${state.plotWidth}px`;
  elements.laneLayer.style.height = `${state.plotHeight}px`;

  for (const item of state.layout) {
    if (item.type === 'region') {
      const region = document.createElement('div');
      region.className = 'plot-region';
      region.style.top = `${item.top}px`;
      elements.laneLayer.append(region);
      continue;
    }

    const polity = item.polity;
    const row = document.createElement('div');
    row.className = 'plot-row';
    row.style.height = `${item.height}px`;
    row.dataset.polityId = polity.id;
    row.style.top = `${item.top}px`;

    const phases = recordsFor(polity.id, 'phases');
    for (const phase of phases) {
      const end = effectiveEnd(phase);
      const phaseButton = elementButton(
        `phase-segment${phase.end === null ? ' current' : ''}`,
        `${phase.name}, ${formatRange(phase.start, phase.end)}`,
        () => showPhaseDetail(phase.id)
      );
      phaseButton.style.left = `${xForYear(phase.start)}px`;
      phaseButton.dataset.phaseId = phase.id;
      phaseButton.style.width = `${Math.max(3, xForYear(end) - xForYear(phase.start))}px`;
      row.append(phaseButton);
    }

    const rules = recordsFor(polity.id, 'rules');
    for (const rule of rules) {
      const house = byId(state.data.houses, rule.house_id);
      const width = Math.max(2, xForYear(effectiveEnd(rule)) - xForYear(rule.start));
      const ruleButton = elementButton(
        'rule-segment',
        `${house.name} ruled ${polity.name}, ${formatRange(rule.start, rule.end)}`,
        () => toggleHouseFocus(rule.id)
      );
      ruleButton.dataset.ruleId = rule.id;
      ruleButton.dataset.houseId = rule.house_id;
      ruleButton.style.setProperty('--house-color', houseColor(rule.house_id));
      ruleButton.style.left = `${xForYear(rule.start)}px`;
      ruleButton.style.width = `${width}px`;
      if (width > 65) ruleButton.textContent = house.name;
      row.append(ruleButton);
    }

    const reigns = recordsFor(polity.id, 'reigns');
    const labels = [];
    for (const reign of reigns) {
      const person = byId(state.data.persons, reign.person_id);
      const startX = xForYear(reign.start);
      const endX = xForYear(effectiveEnd(reign));
      const midX = (startX + endX) / 2;

      const duration = document.createElement('span');
      duration.className = 'reign-duration';
      duration.style.left = `${startX}px`;
      duration.style.width = `${Math.max(2, endX - startX)}px`;
      duration.setAttribute('aria-hidden', 'true');
      row.append(duration);

      const mark = elementButton(
        `reign-mark importance-${reign.importance}`,
        `${person.name}, ${reign.title}, ${formatRange(reign.start, reign.end)}`,
        () => showReignDetail(reign.id)
      );
      mark.dataset.reignId = reign.id;
      mark.style.left = `${midX}px`;
      row.append(mark);

      if (reign.label && reign.importance === 3) labels.push({ reign, person, x: midX });
    }

    let lastLabelX = -Infinity;
    for (const labelData of labels) {
      if (labelData.x - lastLabelX < 105) continue;
      const label = document.createElement('span');
      label.className = 'reign-label';
      label.style.left = `${labelData.x}px`;
      label.textContent = labelData.person.name;
      row.append(label);
      lastLabelX = labelData.x;
    }

    elements.laneLayer.append(row);
  }
}

let relationshipPreviewTimer;
function hideRelationshipPreview() {
  clearTimeout(relationshipPreviewTimer);
  elements.relationshipTooltip.hidePopover();
}
function bindRelationshipPreview(target, relationship) {
  const show = event => {
    if (event.pointerType === 'touch') return;
    clearTimeout(relationshipPreviewTimer);
    const tip = elements.relationshipTooltip;
    const names = [...new Set([...relationship.from, ...relationship.to])].map(id => byId(state.data.polities, id).name).join(' · ');
    tip.textContent = `${TimelineCore.relationshipTypes[relationship.type][1]} · ${formatRange(relationship.start, relationship.end ?? relationship.start)}\n${relationship.label}\n${names}\n\n${relationship.description}`;
    tip.showPopover();
    const rect = target.getBoundingClientRect();
    const x = event.clientX ?? rect.left + rect.width / 2;
    const y = event.clientY ?? rect.bottom;
    tip.style.left = `${Math.max(12, Math.min(x, window.innerWidth - tip.offsetWidth - 12))}px`;
    tip.style.top = `${Math.max(12, y + tip.offsetHeight + 24 <= window.innerHeight ? y + 12 : y - tip.offsetHeight - 12)}px`;
  };
  target.addEventListener('pointerenter', show);
  target.addEventListener('focus', event => {
    target.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    plotScrollLeft = elements.plotScroller.scrollLeft;
    requestAnimationFrame(() => {
      if (document.activeElement === target) show(event);
    });
  });
  for (const event of ['pointerleave', 'blur']) target.addEventListener(event, () => {
    clearTimeout(relationshipPreviewTimer);
    if (document.activeElement === target) return;
    relationshipPreviewTimer = setTimeout(hideRelationshipPreview, 150);
  });
}

function updateRelationshipSelection() {
  const id = state.selected?.type === 'relationship' ? state.selected.id : null;
  for (const group of elements.relationshipLayer.children) {
    group.classList.toggle('is-selected', group.dataset.relationshipId === id);
  }
  const selected = elements.relationshipLayer.querySelector('.is-selected');
  elements.relationshipLayer.classList.toggle('has-selection', Boolean(selected));
  // Paint the selected branches last so crossing lines cannot cover them.
  if (selected) elements.relationshipLayer.append(selected);
  for (const button of elements.relationshipControlsLayer.children) {
    button.setAttribute('aria-pressed', String(button.dataset.relationshipId === id));
  }
}

function relationshipButton(relationship, endpointIds, polityId) {
  const button = elementButton(
    'relationship-button',
    `${relationship.label}, ${formatRange(relationship.start, relationship.end ?? relationship.start)}. ${endpointIds.map(id => byId(state.data.polities, id).name).join(', ')}. ${TimelineCore.relationshipTypes[relationship.type][1]}: ${relationship.description}`,
    () => showRelationshipDetail(relationship.id)
  );
  button.append(document.querySelector(`.legend-marker[data-symbol="${RELATION_SYMBOLS[relationship.type]}"] svg`).cloneNode(true));
  bindRelationshipPreview(button, relationship);
  button.dataset.relationshipId = relationship.id;
  button.dataset.polityId = polityId;
  return button;
}

function renderRelationships() {
  hideRelationshipPreview();
  elements.relationshipLayer.replaceChildren();
  elements.relationshipControlsLayer.replaceChildren();
  elements.relationshipLayer.setAttribute('width', String(state.plotWidth));
  elements.relationshipLayer.setAttribute('height', String(state.plotHeight));
  elements.relationshipLayer.setAttribute('viewBox', `0 0 ${state.plotWidth} ${state.plotHeight}`);
  elements.relationshipControlsLayer.style.width = `${state.plotWidth}px`;
  elements.relationshipControlsLayer.style.height = `${state.plotHeight}px`;

  const yByPolity = new Map(
    state.layout
      .filter((item) => item.type === 'polity')
      .map((item) => [item.polity.id, item.top + ROW_HEIGHT / 2])
  );
  for (const item of state.layout) {
    if (item.type !== 'region' || !state.collapsedRegions.has(item.region)) continue;
    for (const polity of state.polities) if (polity.region === item.region) yByPolity.set(polity.id, item.top + REGION_HEIGHT / 2);
  }
  const namespace = 'http://www.w3.org/2000/svg';

  for (const relationship of state.data.relationships) {
    const marker = state.relationshipMarkers.get(relationship.id);
    if (!marker) continue;
    const endpointIds = [...new Set([...relationship.from, ...relationship.to])];
    const ys = [...new Set(endpointIds.map((id) => yByPolity.get(id)))];
    const markerY = state.layout.find(item => item.polity?.id === marker.polityId).top + marker.offset;
    const x = xForYear(relationship.start);
    const group = document.createElementNS(namespace, 'g');
    group.dataset.relationshipId = relationship.id;
    bindRelationshipPreview(group, relationship);
    group.addEventListener('click', () => { showRelationshipDetail(relationship.id); setDetailOpen(true); });
    for (const y of ys) {
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('class', relationship.type);
      path.setAttribute('d', `M ${x} ${y} C ${x + 24} ${y}, ${x + 24} ${markerY}, ${x} ${markerY}`);
      const hit = path.cloneNode();
      hit.setAttribute('class', 'relationship-hit');
      group.append(path, hit);
    }
    elements.relationshipLayer.append(group);

    const button = relationshipButton(relationship, endpointIds, marker.polityId);
    button.style.left = `${x}px`;
    button.style.top = `${markerY}px`;
    elements.relationshipControlsLayer.append(button);
  }
  updateRelationshipSelection();
}

function renderTimeline() {
  state.polities = orderedPolities();
  state.plotWidth = Math.round((TimelineCore.yearPosition(chartEnd()) - TimelineCore.yearPosition(chartStart())) * PIXELS_PER_YEAR);
  state.layout = buildLayout(state.polities);
  elements.plotCanvas.style.width = `${state.plotWidth}px`;
  elements.plotCanvas.style.height = `${AXIS_HEIGHT + state.plotHeight}px`;
  renderAxis();
  renderLabelColumn();
  renderLaneLayer();
  renderRelationships();
  renderColumns();
  updateCrosshair();
}

function columnY(year) {
  const position = TimelineCore.yearPosition;
  return COLUMN_PAD + (position(year) - position(chartStart())) * PIXELS_PER_YEAR;
}

function columnX(polityId) {
  return COLUMN_AXIS + state.polities.findIndex(polity => polity.id === polityId) * COLUMN_WIDTH;
}

function syncColumnHeader() {
  elements.columnHeaderTrack.style.transform = `translateX(${-elements.verticalScroller.scrollLeft}px)`;
}

function scrollColumnsTo(year, polityId, behavior = scrollBehavior()) {
  stopColumnBrowsing();
  if (polityId) elements.verticalScroller.scrollTo({ left: Math.max(0, columnX(polityId) + COLUMN_WIDTH / 2 - elements.verticalScroller.clientWidth / 2), behavior });
  const center = (64 + elements.columnHeader.offsetHeight + window.innerHeight) / 2;
  const top = elements.verticalChart.getBoundingClientRect().top + window.scrollY + columnY(year);
  window.scrollTo({ top: Math.max(0, top - center), behavior });
}

// Mobile view: the desktop chart transposed, with time running down and one column per polity.
function renderColumns() {
  const chart = elements.verticalChart;
  const header = elements.columnHeaderTrack;
  chart.replaceChildren();
  header.replaceChildren();
  const width = COLUMN_AXIS + state.polities.length * COLUMN_WIDTH;
  const height = columnY(chartEnd()) + COLUMN_PAD;
  chart.style.width = header.style.width = `${width}px`;
  chart.style.height = `${height}px`;

  const axis = document.createElement('div');
  axis.className = 'column-axis';
  for (const year of axisTicks()) {
    const label = document.createElement('span');
    label.className = 'column-tick';
    label.style.top = `${columnY(year)}px`;
    label.textContent = formatYear(year);
    axis.append(label);
    const line = document.createElement('div');
    line.className = 'column-gridline';
    line.style.top = `${columnY(year)}px`;
    chart.append(line);
  }
  const crosshairLabel = document.createElement('span');
  crosshairLabel.className = 'column-crosshair-label';
  axis.append(crosshairLabel);
  chart.prepend(axis);
  const crosshair = document.createElement('div');
  crosshair.className = 'column-crosshair';
  crosshair.setAttribute('aria-hidden', 'true');
  chart.append(crosshair);

  let region;
  for (const polity of state.polities) {
    const x = columnX(polity.id);
    if (polity.region !== region?.dataset.region) {
      region = document.createElement('span');
      region.className = 'column-region';
      region.dataset.region = polity.region;
      region.textContent = region.title = polity.region;
      region.style.left = `${x}px`;
      header.append(region);
    }
    region.style.width = `${x + COLUMN_WIDTH - parseFloat(region.style.left)}px`;

    const label = document.createElement('button');
    label.type = 'button';
    label.className = `column-label${polity.status === 'current' ? ' current-indicator' : ''}`;
    label.dataset.polityId = polity.id;
    label.style.left = `${x}px`;
    label.textContent = polity.short_name;
    label.title = polity.name;
    label.setAttribute('aria-label', polity.name);
    label.addEventListener('click', () => {
      showPolityDetail(polity.id);
      setDetailOpen(true);
    });
    header.append(label);

    const lane = document.createElement('div');
    lane.className = `column-lane${region.style.left === `${x}px` ? ' region-start' : ''}`;
    lane.dataset.polityId = polity.id;
    lane.style.left = `${x}px`;
    chart.append(lane);

    for (const phase of recordsFor(polity.id, 'phases')) {
      const top = columnY(phase.start);
      const button = elementButton(
        `vertical-phase${phase.end === null ? ' current' : ''}`,
        `${phase.name}, ${formatRange(phase.start, phase.end)}`,
        () => showPhaseDetail(phase.id)
      );
      button.dataset.phaseId = phase.id;
      button.dataset.polityId = polity.id;
      button.style.left = `${x + 12}px`;
      button.style.top = `${top}px`;
      button.style.height = `${Math.max(3, columnY(effectiveEnd(phase)) - top)}px`;
      chart.append(button);
    }

    for (const rule of recordsFor(polity.id, 'rules')) {
      const house = byId(state.data.houses, rule.house_id);
      const top = columnY(rule.start);
      const ruleHeight = Math.max(2, columnY(effectiveEnd(rule)) - top);
      const button = elementButton(
        'vertical-rule',
        `${house.name} ruled ${polity.name}, ${formatRange(rule.start, rule.end)}`,
        () => toggleHouseFocus(rule.id)
      );
      button.dataset.ruleId = rule.id;
      button.dataset.houseId = rule.house_id;
      button.dataset.polityId = polity.id;
      button.style.setProperty('--house-color', houseColor(rule.house_id));
      button.style.left = `${x + 15}px`;
      button.style.top = `${top}px`;
      button.style.height = `${ruleHeight}px`;
      if (ruleHeight > 65) button.textContent = house.name;
      chart.append(button);
    }

    for (const reign of recordsFor(polity.id, 'reigns')) {
      const person = byId(state.data.persons, reign.person_id);
      const top = columnY(reign.start);
      const bottom = columnY(effectiveEnd(reign));
      const duration = document.createElement('span');
      duration.className = 'vertical-reign-duration';
      duration.dataset.polityId = polity.id;
      duration.setAttribute('aria-hidden', 'true');
      duration.style.left = `${x + 6}px`;
      duration.style.top = `${top}px`;
      duration.style.height = `${Math.max(2, bottom - top)}px`;
      chart.append(duration);
      const button = elementButton(
        `vertical-reign importance-${reign.importance}`,
        `${person.name}, ${reign.title}, ${formatRange(reign.start, reign.end)}`,
        () => showReignDetail(reign.id)
      );
      button.dataset.reignId = reign.id;
      button.dataset.polityId = polity.id;
      button.style.left = `${x + 6}px`;
      button.style.top = `${(top + bottom) / 2}px`;
      chart.append(button);
    }
  }

  const namespace = 'http://www.w3.org/2000/svg';
  const links = document.createElementNS(namespace, 'svg');
  links.setAttribute('class', 'relationship-layer column-links');
  links.setAttribute('aria-hidden', 'true');
  links.setAttribute('width', String(width));
  links.setAttribute('height', String(height));
  chart.append(links);
  const markerSlots = new Map();
  for (const relationship of [...state.data.relationships].sort((a, b) => a.start - b.start)) {
    const endpointIds = [...new Set([...relationship.from, ...relationship.to])];
    const polityId = endpointIds[0];
    const y = columnY(relationship.start);
    const slots = markerSlots.get(polityId) || [];
    let slot = slots.findIndex(previousY => y - previousY >= 20);
    if (slot < 0) slot = slots.length;
    slots[slot] = y;
    markerSlots.set(polityId, slots);
    const markerX = columnX(polityId) + COLUMN_WIDTH / 2 + 3;
    const markerY = y + slot * 20;
    const group = document.createElementNS(namespace, 'g');
    group.dataset.relationshipId = relationship.id;
    group.addEventListener('click', () => { showRelationshipDetail(relationship.id); setDetailOpen(true); });
    for (const id of endpointIds.slice(1)) {
      const endX = columnX(id) + COLUMN_WIDTH / 2 + 3;
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('class', relationship.type);
      path.setAttribute('d', `M ${endX} ${y} C ${endX} ${y + 24}, ${markerX} ${markerY + 24}, ${markerX} ${markerY}`);
      const hit = path.cloneNode();
      hit.setAttribute('class', 'relationship-hit');
      group.append(path, hit);
    }
    links.append(group);
    const button = relationshipButton(relationship, endpointIds, polityId);
    button.style.left = `${markerX}px`;
    button.style.top = `${markerY}px`;
    chart.append(button);
  }
  syncColumnHeader();
}

function activeAtYear(year) { return TimelineCore.snapshot(state.data, dataIndex, state.polities, year); }

function updateHouseFocus() {
  const house = byId(state.data.houses, state.houseFocusId);
  const matches = new Set();
  if (house) {
    for (const rule of state.data.rules) {
      if (rule.house_id === house.id && TimelineCore.activeDuring(rule, state.snapshotYear, state.data.meta)
        && recordsFor(rule.polity_id, 'phases').some(phase => TimelineCore.activeDuring(phase, state.snapshotYear, state.data.meta))) {
        matches.add(rule.polity_id);
      }
    }
  }
  elements.explorer.classList.toggle('house-focus-active', Boolean(house));
  for (const node of elements.explorer.querySelectorAll('.label-row, .plot-row, .column-label, .column-lane, .vertical-phase, .vertical-rule, .vertical-reign, .vertical-reign-duration')) {
    const matching = matches.has(node.dataset.polityId);
    node.classList.toggle('house-focus-match', Boolean(house) && matching);
    node.classList.toggle('house-focus-muted', Boolean(house) && !matching);
  }
  for (const button of elements.explorer.querySelectorAll('.rule-segment, .vertical-rule')) {
    button.setAttribute('aria-pressed', String(Boolean(house) && button.dataset.houseId === house.id));
  }
  elements.houseFocusStatus.hidden = !house;
  elements.houseFocusStatus.textContent = house
    ? `${house.name} · ${matches.size ? `${matches.size} ${matches.size === 1 ? 'monarchy' : 'monarchies'} ruled` : 'No monarchies ruled'} in ${formatYear(state.snapshotYear)}. Click the same house again, empty chart space, or press Escape to clear.`
    : '';
}

function setHouseFocus(houseId) {
  if (state.houseFocusId === houseId) return;
  state.houseFocusId = houseId;
  updateHouseFocus();
}

function toggleHouseFocus(ruleId) {
  if (mobileView()) stopColumnBrowsing();
  const rule = byId(state.data.rules, ruleId);
  const clearing = state.houseFocusId === rule.house_id;
  if (!clearing && !TimelineCore.activeDuring(rule, state.snapshotYear, state.data.meta)) updateSnapshotYear(rule.start, false);
  setHouseFocus(clearing ? null : rule.house_id);
  showRuleDetail(ruleId, false);
}

function updateCrosshair() {
  const x = xForYear(state.snapshotYear);
  elements.crosshair.style.left = `${x}px`;
  elements.crosshair.style.height = `${AXIS_HEIGHT + state.plotHeight}px`;
  for (const item of elements.verticalChart.querySelectorAll('.column-crosshair, .column-crosshair-label')) item.style.top = `${columnY(state.snapshotYear)}px`;
  const columnLabel = elements.verticalChart.querySelector('.column-crosshair-label');
  if (columnLabel) columnLabel.textContent = formatYear(state.snapshotYear);
  elements.snapshotYearOutput.textContent = formatYear(state.snapshotYear);
  elements.snapshotYear.value = String(state.snapshotYear);
  elements.snapshotYear.setAttribute('aria-valuetext', formatYear(state.snapshotYear));
  elements.rulerYear.textContent = formatYear(state.snapshotYear);
  elements.rulerYear.setAttribute('aria-valuemin', String(chartStart()));
  elements.rulerYear.setAttribute('aria-valuemax', String(chartEnd()));
  elements.rulerYear.setAttribute('aria-valuenow', String(state.snapshotYear));
  elements.rulerYear.setAttribute('aria-valuetext', formatYear(state.snapshotYear));
  syncStickyAxis();

  const { activeIds } = activeAtYear(state.snapshotYear);
  elements.snapshotSummary.textContent = `${activeIds.size} monarchies shown for this year.`;
  updateHouseFocus();
}

function updateSnapshotYear(year, writeUrl = true) {
  if (writeUrl) stopColumnBrowsing();
  clearTimeout(timeScrollTimer);
  wheelX = null;
  state.snapshotYear = TimelineCore.normalizeYear(year, state.data.meta, state.snapshotYear);
  for (const button of elements.presetButtons.querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.year) === state.snapshotYear));
  updateCrosshair();
  showSnapshotDetail(writeUrl);
}

function selectSnapshotYear(year, behavior = scrollBehavior(), writeUrl = true) {
  if (mobileView()) stopColumnBrowsing();
  updateSnapshotYear(year, writeUrl);
  panPlotTo(xForYear(state.snapshotYear) - elements.plotScroller.clientWidth / 2, behavior);
  // Dragging the slider must not scroll the page out from under the thumb.
  if (mobileView() && behavior !== 'instant') scrollColumnsTo(state.snapshotYear, null, behavior);
}

function bindRulerYear() {
  let drag = null;
  const yearAtPosition = position => position <= 0 ? position - 1 : position;
  const reveal = () => {
    if (drag) return;
    const x = xForYear(state.snapshotYear);
    const right = x + elements.crosshair.offsetWidth;
    const scroller = elements.plotScroller;
    if (x < scroller.scrollLeft) panPlotTo(x);
    else if (right > scroller.scrollLeft + scroller.clientWidth) panPlotTo(right - scroller.clientWidth);
    else syncStickyAxis();
  };
  const move = event => {
    if (event.pointerId !== drag?.pointerId) return;
    const delta = event.clientX - drag.clientX;
    if (!delta) return;
    const scroller = elements.plotScroller, center = scroller.clientWidth / 2;
    const gain = drag.screen === center ? 3 : 1;
    const x = Math.max(0, Math.min(state.plotWidth, drag.x + delta * gain));
    const screenDelta = (x - drag.x) / gain;
    drag.x = x;
    drag.clientX = event.clientX;
    if (drag.screen < center) drag.screen = Math.min(center, drag.screen + screenDelta);
    else if (drag.screen > center) drag.screen = Math.max(center, drag.screen + screenDelta);
    const year = yearForX(drag.x);
    if (year !== state.snapshotYear) updateSnapshotYear(year, false);
    const world = xForYear(state.snapshotYear), left = world - drag.screen;
    const maxLeft = scroller.scrollWidth - scroller.clientWidth;
    // Only real camera limits unlock the logical anchor, not scrollLeft pixel rounding.
    if (left < 0 || left > maxLeft) drag.screen = world - Math.max(0, Math.min(maxLeft, left));
    panPlotTo(left);
  };
  const finish = event => {
    if (event.pointerId !== drag?.pointerId) return;
    drag = null;
    if (elements.rulerYear.hasPointerCapture(event.pointerId)) elements.rulerYear.releasePointerCapture(event.pointerId);
    syncUrl();
  };
  elements.rulerYear.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    event.preventDefault();
    elements.rulerYear.setPointerCapture(event.pointerId);
    const scroller = elements.plotScroller;
    panPlotTo(scroller.scrollLeft);
    const screen = xForYear(state.snapshotYear) - scroller.scrollLeft;
    drag = {
      pointerId: event.pointerId,
      x: xForYear(state.snapshotYear),
      clientX: event.clientX,
      screen: Math.abs(screen - scroller.clientWidth / 2) < 1 ? scroller.clientWidth / 2 : screen
    };
    elements.rulerYear.focus({ preventScroll: true });
  });
  elements.rulerYear.addEventListener('pointermove', move);
  elements.rulerYear.addEventListener('pointerup', event => {
    move(event);
    finish(event);
  });
  elements.rulerYear.addEventListener('pointercancel', finish);
  elements.rulerYear.addEventListener('lostpointercapture', finish);
  elements.rulerYear.addEventListener('focus', reveal);
  elements.rulerYear.addEventListener('keydown', event => {
    const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
    if (!(event.key in steps) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    if (drag) return;
    const position = TimelineCore.yearPosition(state.snapshotYear) + (steps[event.key] || 0);
    const year = TimelineCore.normalizeYear(event.key === 'Home' ? chartStart() : event.key === 'End' ? chartEnd()
      : yearAtPosition(position), state.data.meta, state.snapshotYear);
    if (year !== state.snapshotYear) selectSnapshotYear(year, 'instant');
  });
}

function bindTimeScrolling() {
  const scroller = elements.plotScroller;
  let touchBrowsing = false;
  let focusReveal = 0;
  let scrollWidth = scroller.clientWidth;
  window.addEventListener('resize', () => {
    scrollWidth = scroller.clientWidth;
    plotScrollLeft = scroller.scrollLeft;
    if (plotPanTarget !== null) panPlotTo(plotPanTarget);
    if (mobileView()) stopColumnBrowsing();
  });
  const commit = () => {
    clearTimeout(timeScrollTimer);
    timeScrollTimer = setTimeout(() => { wheelX = null; syncUrl(); }, 180);
  };
  scroller.addEventListener('focus', () => {
    const reveal = ++focusReveal;
    requestAnimationFrame(() => {
      if (focusReveal !== reveal) return;
      plotScrollLeft = scroller.scrollLeft;
      focusReveal = 0;
    });
  }, true);
  scroller.addEventListener('pointerdown', event => {
    touchBrowsing = event.pointerType === 'touch';
    if (touchBrowsing) return;
    wheelX = null;
    if (plotPanTarget !== null) panPlotTo(scroller.scrollLeft);
  }, { capture: true });
  const wheel = event => {
    if (mobileView() || event.ctrlKey || (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY))) return;
    const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
    if (!delta) return;
    event.preventDefault();
    touchBrowsing = false;
    const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientWidth : 1);
    const x = Math.max(0, Math.min(state.plotWidth, (wheelX ?? xForYear(state.snapshotYear)) + pixels));
    const year = yearForX(x);
    if (year !== state.snapshotYear) selectSnapshotYear(year, 'instant', false);
    else panPlotTo(xForYear(year) - scroller.clientWidth / 2);
    wheelX = x;
    commit();
  };
  for (const surface of [scroller, elements.rulerYear.parentElement]) surface.addEventListener('wheel', wheel, { passive: false });
  scroller.addEventListener('scroll', () => {
    syncStickyAxis();
    const left = scroller.scrollLeft;
    const resized = scrollWidth !== scroller.clientWidth;
    scrollWidth = scroller.clientWidth;
    const changed = Math.abs(left - plotScrollLeft) > 0.01;
    plotScrollLeft = left;
    if (plotPanTarget !== null) {
      if (left === plotPanTarget) plotPanTarget = null;
      return;
    }
    if (!changed || resized || mobileView() || touchBrowsing || focusReveal) return;
    wheelX = null;
    const year = yearForX(left + scroller.clientWidth / 2);
    if (year !== state.snapshotYear) updateSnapshotYear(year, false);
    commit();
  }, { passive: true });
  // Only vertical user input owns mobile time; app pans and focus reveals retain their explicit year.
  const unrelated = target => target instanceof Element && target.closest('input, textarea, select, .detail-panel, .reading-guide, .search-panel');
  const browseColumns = () => {
    if (columnBrowsing) return;
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    columnBrowsing = true;
  };
  document.addEventListener('focus', () => { if (mobileView()) columnBrowsing = false; }, true);
  window.addEventListener('wheel', event => {
    if (!mobileView()) return;
    if (event.ctrlKey || unrelated(event.target)) { columnBrowsing = false; return; }
    if (!event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) browseColumns();
    else columnBrowsing = false;
  }, { passive: true });
  let touch = null;
  window.addEventListener('touchstart', event => {
    touch = null;
    if (!mobileView()) return;
    columnBrowsing = false;
    if (event.touches.length !== 1 || unrelated(event.target)) return;
    touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, direction: null };
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1) return;
    const x = Math.abs(event.touches[0].clientX - touch.x);
    const y = Math.abs(event.touches[0].clientY - touch.y);
    if (touch.direction === null && Math.max(x, y) > 8) touch.direction = y > x ? 'vertical' : 'horizontal';
    if (touch.direction === 'vertical') browseColumns();
  }, { passive: true });
  for (const name of ['touchend', 'touchcancel']) window.addEventListener(name, () => { touch = null; }, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (mobileView() && event.target === document.documentElement && event.clientX >= document.documentElement.clientWidth - 16) browseColumns();
  }, { passive: true });
  window.addEventListener('keydown', event => {
    if (!mobileView() || event.defaultPrevented || unrelated(event.target) || event.target instanceof Element && event.target.closest('button, a, dialog')) return;
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) browseColumns();
  });
  window.addEventListener('scroll', () => {
    if (!mobileView() || !columnBrowsing) return;
    const chart = elements.verticalChart.getBoundingClientRect();
    const top = Math.max(64, elements.columnHeader.getBoundingClientRect().bottom);
    if (chart.bottom <= top || chart.top >= window.innerHeight || top >= window.innerHeight) return;
    const y = (64 + elements.columnHeader.offsetHeight + window.innerHeight) / 2 - chart.top;
    const position = Math.round(TimelineCore.yearPosition(chartStart()) + (y - COLUMN_PAD) / PIXELS_PER_YEAR);
    const year = TimelineCore.normalizeYear(position <= 0 ? position - 1 : position, state.data.meta, state.snapshotYear);
    if (year !== state.snapshotYear) updateSnapshotYear(year, false);
    commit();
  }, { passive: true });
}

function rulesForHouse(houseId) {
  return state.data.rules
    .filter((rule) => rule.house_id === houseId)
    .sort((a, b) => a.start - b.start || effectiveEnd(a) - effectiveEnd(b));
}

function detailLink(type, id, label) { return { type, id, label }; }
function recordUrl(type, id) {
  const url = new URL(window.location.href);
  url.searchParams.set('selection', `${type}:${id}`);
  return url.href;
}
function syncUrl() {
  clearTimeout(timeScrollTimer);
  wheelX = null;
  const url = new URL(window.location.href);
  for (const key of ['region', 'coverage', 'status', 'house', 'q', 'connections', 'zoom']) url.searchParams.delete(key);
  for (const [key, value] of Object.entries({ year: state.snapshotYear,
    selection: state.selected?.type !== 'snapshot' ? `${state.selected.type}:${state.selected.id}` : '' })) {
    if (value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  window.history.replaceState(null, '', url);
}
function openRecord(type, id, openDetails = true) {
  const show = { region: showRegionDetail, polity: showPolityDetail, phase: showPhaseDetail, rule: showRuleDetail,
    reign: showReignDetail, house: showHouseDetail, relationship: showRelationshipDetail, event: showEventDetail }[type];
  const collection = { polity:'polities', phase:'phases', rule:'rules', reign:'reigns', house:'houses', relationship:'relationships', event:'events' }[type];
  if (!show || !(type === 'region' ? state.polities.some(p => p.region === id) : dataIndex.ids[collection]?.has(id))) return false;
  show(id);
  setDetailOpen(openDetails);
  return true;
}
function appendItems(container, items) {
  for (const item of items) {
    const li = document.createElement('li');
    if (typeof item === 'string') li.textContent = item;
    else {
      const link = document.createElement('a');
      link.href = recordUrl(item.type, item.id); link.textContent = item.label;
      link.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); jumpToResult(item, true); elements.detailTitle.focus({ preventScroll: true });
      });
      li.append(link);
    }
    container.append(li);
  }
}
function setDetail({ type, title, dates = '', copy = '', listTitle = '', list = [], sources = [], links = [], groups = [], record = {}, writeUrl = true }) {
  hideRelationshipPreview();
  updateRelationshipSelection();
  elements.detailType.textContent = type;
  elements.detailTitle.textContent = title;
  elements.detailToggleTitle.textContent = title;
  elements.detailDates.textContent = dates;
  elements.detailCopy.textContent = [copy, record.date_precision && record.date_precision !== 'year' ? `Date precision: ${record.date_precision}.` : '', record.review_note ? `Review note: ${record.review_note}` : ''].filter(Boolean).join('\n\n');
  elements.detailSecondaryTitle.textContent = listTitle || 'Explore further';
  elements.detailList.replaceChildren();
  appendItems(elements.detailList, list.length ? list : ['No entries in this selection.']);
  elements.detailRelated.replaceChildren();
  for (const group of groups.filter(g => g.items.length)) {
    const section = document.createElement('section'); const heading = document.createElement('h3'); const ul = document.createElement('ul');
    heading.textContent = group.title; appendItems(ul, group.items); section.append(heading, ul); elements.detailRelated.append(section);
  }
  elements.detailWikipedia.replaceChildren();
  elements.detailEvidence.replaceChildren();
  const citations = [...new Map([...(record.sources || []).map(source_id => ({ source_id })), ...(record.citations || [])].map(c => [c.source_id, c])).values()];
  const heading = document.createElement('h3'); heading.textContent = 'Sources'; elements.detailEvidence.append(heading);
  if (citations.length) {
    const ul = document.createElement('ul');
    for (const citation of citations) {
      const source = byId(state.data.sources, citation.source_id); if (!source) continue;
      const li = document.createElement('li'); const a = document.createElement('a'); a.href = source.url; a.textContent = source.title;
      a.target = '_blank'; a.rel = 'noreferrer'; li.append(a);
      if (citation.locator) li.append(` · ${citation.locator}`);
      ul.append(li);
    }
    elements.detailEvidence.append(ul);
  } else {
    const note = document.createElement('p'); note.className = 'attribution';
    note.textContent = ['snapshot', 'region'].includes(state.selected.type) ? 'Select a ruler, monarchy or event to see its sources.' : 'No direct source attached. See background reading below.';
    elements.detailEvidence.append(note);
  }
  elements.detailSources.replaceChildren();
  for (const link of [...sources.map(source => ({ label: source.title, url: source.url })), ...links]) if (link?.url) appendDetailLink(link.label, link.url);
  for (const button of elements.labelColumn.querySelectorAll('button[data-polity-id]')) button.setAttribute('aria-pressed', String(state.selected.type === 'polity' && state.selected.id === button.dataset.polityId));
  elements.detailPanel.scrollTop = 0;
  if (writeUrl) syncUrl();
}
function appendDetailLink(label, url) {
  const anchor = document.createElement('a'); anchor.href = url;
  if ([...elements.detailSources.children].some(item => item.href === anchor.href)) return;
  anchor.target = '_blank'; anchor.rel = 'noreferrer'; anchor.textContent = label;
  elements.detailSources.append(anchor);
}
let detailOpener = null;
function setDetailOpen(isOpen, restoreFocus = false) {
  const wasOpen = elements.detailPanel.open;
  if (isOpen && !wasOpen) detailOpener = document.activeElement;
  elements.detailPanel.classList.toggle('is-open', isOpen);
  elements.detailPanel.setAttribute('aria-hidden', String(!isOpen));
  elements.detailPanel.inert = !isOpen;
  elements.detailToggle.setAttribute('aria-expanded', String(isOpen));
  elements.detailToggle.hidden = isOpen;
  if (isOpen && !elements.detailPanel.open) elements.detailPanel.show();
  if (isOpen) requestAnimationFrame(() => {
    if (elements.detailPanel.open) elements.detailTitle.focus({ preventScroll: true });
  });
  if (!isOpen && wasOpen) {
    elements.detailPanel.close();
    if (restoreFocus) {
      const opener = detailOpener?.isConnected && detailOpener.getClientRects().length && !detailOpener.closest('[inert]') ? detailOpener : elements.detailToggle;
      opener.focus({ preventScroll: true });
    }
  }
}
function reignLink(reign) {
  return detailLink('reign', reign.id, `${byId(state.data.persons, reign.person_id).name} · ${byId(state.data.polities, reign.polity_id).short_name} · ${formatRange(reign.start, reign.end)}`);
}
function connectionLinks(polityId) {
  return recordsFor(polityId, 'relationships').map(r => detailLink('relationship', r.id, `${r.label} · ${formatRange(r.start, r.end ?? r.start)}`));
}
function showSnapshotDetail(writeUrl = true) {
  state.selected = { type: 'snapshot', id: String(state.snapshotYear) };
  const preset = state.data.presets.find(item => item.year === state.snapshotYear);
  const { activeIds, activeReigns } = activeAtYear(state.snapshotYear);
  const events = state.data.events.filter(e => e.year === state.snapshotYear);
  setDetail({ writeUrl, type: 'Year', title: preset?.title || `Europe in ${formatYear(state.snapshotYear)}`,
    dates: `${activeIds.size} monarchies during ${formatYear(state.snapshotYear)}`,
    copy: preset?.description || 'Selected reigns active during this year.',
    listTitle: `Reigns (${activeReigns.length})`, list: activeReigns.map(reignLink),
    groups: [{ title: 'Events during this year', items: events.map(e => detailLink('event',e.id,e.label)) },
      { title: 'Monarchies', items: [...activeIds].map(id => detailLink('polity',id,byId(state.data.polities,id).name)) }] });
}
function showPolityDetail(polityId) {
  const polity = byId(state.data.polities, polityId);
  const phases = recordsFor(polityId, 'phases');
  state.selected = { type: 'polity', id: polityId };
  setDetail({ type: polity.status === 'current' ? 'Current monarchy' : 'Former monarchy',
    title: polity.name, dates: phases.map(p => formatRange(p.start,p.end)).join(' · '), copy: polity.summary,
    record: polity, listTitle: 'Selected reigns', list: recordsFor(polityId, 'reigns').map(reignLink),
    groups: [{title:'Periods',items:phases.map(p=>detailLink('phase',p.id,`${p.name} · ${formatRange(p.start,p.end)}`))},
      {title:'Crown connections',items:connectionLinks(polityId)},
      {title:'Events',items:recordsFor(polityId,'events').map(e=>detailLink('event',e.id,`${e.label} · ${formatYear(e.year)}`))}] });
}
function showRegionDetail(region) {
  state.selected = { type: 'region', id: region };
  setDetail({ type: 'Region', title: region, copy: '', listTitle: 'Monarchies',
    list: state.polities.filter(p => p.region === region).map(p => detailLink('polity', p.id, p.name)) });
}
function showPhaseDetail(phaseId) {
  const phase=byId(state.data.phases,phaseId), polity=byId(state.data.polities,phase.polity_id);
  state.selected={type:'phase',id:phaseId};
  setDetail({type:'Period',title:phase.name,dates:formatRange(phase.start,phase.end),copy:phase.note || polity.summary,record:phase,
    listTitle:'Ruling houses and offices',list:recordsFor(polity.id,'rules').filter(r=>TimelineCore.overlaps(r,phase,state.data.meta)).map(r=>detailLink('rule',r.id,`${byId(state.data.houses,r.house_id).name} · ${formatRange(r.start,r.end)}`)),
    groups:[{title:'Monarchy',items:[detailLink('polity',polity.id,polity.name)]}],sources:sourceObjects(polity.sources)});
}
function showRuleDetail(ruleId, focusHouse = true) {
  const rule=byId(state.data.rules,ruleId),polity=byId(state.data.polities,rule.polity_id),house=byId(state.data.houses,rule.house_id);
  if (focusHouse) setHouseFocus(house.id);
  state.selected={type:'rule',id:ruleId};
  setDetail({type:house.kind==='office'?'Monarchical office':'Ruling house',title:house.name,dates:`${polity.name} · ${formatRange(rule.start,rule.end)}`,
    copy:rule.note || house.summary || polity.summary,record:rule,
    listTitle:'Reigns in this period',list:recordsFor(polity.id,'reigns').filter(r=>r.house_id===house.id && TimelineCore.overlaps(r,rule,state.data.meta)).map(reignLink),
    groups:[{title:'Explore further',items:[detailLink('polity',polity.id,polity.name),detailLink('house',house.id,`${house.name} across crowns`)]}],sources:sourceObjects(polity.sources)});
  addWikipediaSummary(house);
}
function showHouseDetail(houseId) {
  if(houseId==='all'){setHouseFocus(null);showSnapshotDetail();return;}
  const house=byId(state.data.houses,houseId),rules=rulesForHouse(houseId);
  setHouseFocus(houseId);
  state.selected={type:'house',id:houseId};
  setDetail({type:house.kind==='office'?'Office':'House across crowns',title:house.name,dates:`${rules.length} periods shown`,copy:house.summary || 'Select a period to see its rulers and sources.',record:house,
    listTitle:'Periods of rule',list:rules.map(r=>detailLink('rule',r.id,`${byId(state.data.polities,r.polity_id).name} · ${formatRange(r.start,r.end)}`))});
  addWikipediaSummary(house);
}
function showReignDetail(reignId) {
  const reign=byId(state.data.reigns,reignId),person=byId(state.data.persons,reign.person_id),polity=byId(state.data.polities,reign.polity_id);
  if (state.houseFocusId && state.houseFocusId !== reign.house_id) setHouseFocus(null);
  state.selected={type:'reign',id:reignId};
  const siblings=state.data.reigns.filter(r=>r.person_id===person.id && r.id!==reign.id);
  setDetail({type:'Selected reign',title:person.name,dates:`${reign.title} · ${formatRange(reign.start,reign.end)}`,
    copy:reign.note || polity.summary,record:reign,
    listTitle:'Explore the crown',list:[detailLink('polity',polity.id,polity.name)],
    groups:[{title:'Other titles',items:siblings.map(reignLink)},{title:'Crown connections',items:connectionLinks(polity.id)}],
    sources:sourceObjects(polity.sources),links:[{label:`${person.name} reference`,url:person.url}]});
  addWikipediaSummary(person);
}
function showRelationshipDetail(id) {
  const r=byId(state.data.relationships,id);state.selected={type:'relationship',id};
  const ids=[...new Set([...r.from,...r.to])];
  setDetail({type:TimelineCore.relationshipTypes[r.type][1],title:r.label,dates:formatRange(r.start,r.end??r.start),
    copy:r.description,record:r,
    listTitle:'Connected monarchies',list:ids.map(id=>detailLink('polity',id,byId(state.data.polities,id).name))});
}
function showEventDetail(id) {
  const event=byId(state.data.events,id);state.selected={type:'event',id};
  setDetail({type:'Event',title:event.label,dates:formatYear(event.year),copy:event.description,record:event,
    listTitle:'Monarchies',list:event.polity_ids.map(id=>detailLink('polity',id,byId(state.data.polities,id).name))});
}

function bindControls() {
  for (const chart of [elements.plotCanvas, elements.verticalChart]) {
    chart.addEventListener('click', event => {
      if (event.target.matches('.plot-canvas, .lane-layer, .plot-row, .plot-region, #relationship-layer, .vertical-chart, .column-lane, .column-gridline, .column-links')) {
        setHouseFocus(null);
      }
    });
  }
  elements.relationshipTooltip.addEventListener('pointerenter', () => clearTimeout(relationshipPreviewTimer));
  elements.relationshipTooltip.addEventListener('pointerleave', hideRelationshipPreview);
  document.addEventListener('scroll', event => {
    if (event.target !== elements.relationshipTooltip) hideRelationshipPreview();
  }, { capture: true, passive: true });
  window.addEventListener('resize', hideRelationshipPreview);
  window.addEventListener('resize', syncStickyAxis);
  bindSearch();
  bindRulerYear();
  bindTimeScrolling();
  elements.readingGuideOpeners.forEach(opener => opener.addEventListener('click', () => {
    hideRelationshipPreview();
    elements.readingGuide.showModal();
  }));
  elements.readingGuideClose.addEventListener('click', () => elements.readingGuide.close());
  elements.readingGuide.addEventListener('click', event => {
    if (event.target !== elements.readingGuide) return;
    const rect = elements.readingGuide.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      elements.readingGuide.close();
    }
  });
  // Commit the URL after dragging; per-frame history writes can hit browser rate limits.
  elements.snapshotYear.addEventListener('input', (event) => selectSnapshotYear(event.target.value, 'instant', false));
  elements.snapshotYear.addEventListener('change', syncUrl);
  elements.detailToggle.addEventListener('click', () => setDetailOpen(true));
  elements.detailClose.addEventListener('click', () => {
    setDetailOpen(false, true);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!elements.detailPanel.classList.contains('is-open')) return;
    if (event.target.closest('#reading-guide, .reading-guide-open')) return;
    if (elements.detailPanel.contains(event.target) || elements.detailToggle.contains(event.target)) return;
    setDetailOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('#detail-panel, #detail-toggle, #relationship-tooltip, #reading-guide, .reading-guide-open')) return;
    for (const match of document.querySelectorAll('.search-match')) {
      if (!match.contains(event.target)) match.classList.remove('search-match');
    }
    if (state.selected?.type !== 'relationship' || event.target.closest('[data-relationship-id]')) return;
    setDetailOpen(false);
    showSnapshotDetail();
  }, { capture: true });
  document.addEventListener('keydown', (event) => {
    if (elements.readingGuide.open) return;
    if (event.key === 'Escape') setHouseFocus(null);
    if (event.key === 'Escape' && elements.relationshipTooltip.matches(':popover-open')) {
      hideRelationshipPreview();
      return;
    }
    if (event.key === 'Escape' && elements.detailPanel.classList.contains('is-open')) {
      setDetailOpen(false, true);
    }
  });
  elements.verticalScroller.addEventListener('scroll', syncColumnHeader, { passive: true });
}

function init() {
  try {
    if (!state.data) throw new Error('Timeline data bundle is missing.');
    state.plotWidth = Math.round((chartEnd() - chartStart()) * PIXELS_PER_YEAR);
    elements.snapshotYear.min = String(chartStart());
    elements.snapshotYear.max = String(chartEnd());
    const searchParams = new URLSearchParams(window.location.search);
    state.snapshotYear = TimelineCore.normalizeYear(searchParams.get('year'), state.data.meta);
    const urlYear = Number(searchParams.get('year'));
    const requestedYear = Number.isInteger(urlYear) && urlYear !== 0 && urlYear >= chartStart() && urlYear <= chartEnd() ? urlYear : null;
    const requestedSelection = searchParams.get('selection')?.split(':');
    elements.search.value = searchParams.get('q') || '';
    renderPresetButtons();
    bindControls();
    renderTimeline();
    showSnapshotDetail();
    const initialTarget = Math.max(0, xForYear(state.snapshotYear) - elements.plotScroller.clientWidth / 2);
    panPlotTo(initialTarget);
    if (requestedSelection?.length === 2) jumpToResult({ type: requestedSelection[0], id: requestedSelection[1] }, true, requestedYear);
    else if (searchParams.get('q')) renderSearch();
    else if (searchParams.get('region') && searchParams.get('region') !== 'all') jumpToResult({ type: 'region', id: searchParams.get('region') }, false, requestedYear);
    else if (searchParams.get('house') && searchParams.get('house') !== 'all') jumpToResult({ type: 'house', id: searchParams.get('house') }, false, requestedYear);
  } catch (error) {
    elements.error.hidden = false;
    elements.error.textContent = `The timeline could not be loaded. ${error.message}`;
  }
}

init();
