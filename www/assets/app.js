const PIXELS_PER_YEAR = 1.35;
const ROW_HEIGHT = 62;
const REGION_HEIGHT = 34;
const AXIS_HEIGHT = 64;
const MOBILE_HEIGHT = 760;
const MOBILE_MARGIN = 34;

const REGION_ORDER = [
  'Mediterranean',
  'Southeast Europe',
  'Western Europe',
  'Britain and Ireland',
  'Iberia',
  'Nordics',
  'Central Europe',
  'Central and Eastern Europe',
  'Italian states'
];

const HOUSE_PALETTE = [
  '#9a3b32', '#295f73', '#82602c', '#526f3d', '#75518c', '#a35d27',
  '#3f6d68', '#864f64', '#5c5f9a', '#8a6939', '#3e6b50', '#765b43'
];

const RELATION_SYMBOLS = Object.fromEntries(Object.entries(TimelineCore.relationshipTypes).map(([key, value]) => [key, value[0]]));

const state = {
  data: window.TIMELINE_DATA,
  zoom: 1,
  snapshotYear: 1519,
  selected: null,
  polities: [],
  layout: [],
  plotWidth: 0,
  plotHeight: 0,
  mobilePolityId: 'france'
};

const elements = {
  search: document.getElementById('search'),
  searchPanel: document.getElementById('search-panel'),
  searchResults: document.getElementById('search-results'),
  searchStatus: document.getElementById('search-status'),
  yearInput: document.getElementById('year-input'),
  zoom: document.getElementById('zoom'),
  detailWikipedia: document.getElementById('detail-wikipedia'),
  detailEvidence: document.getElementById('detail-evidence'),
  detailRelated: document.getElementById('detail-related'),
  presetButtons: document.getElementById('preset-buttons'),
  snapshotYear: document.getElementById('snapshot-year'),
  snapshotYearOutput: document.getElementById('snapshot-year-output'),
  snapshotSummary: document.getElementById('snapshot-summary'),
  error: document.getElementById('timeline-error'),
  desktopTimeline: document.getElementById('desktop-timeline'),
  labelColumn: document.getElementById('label-column'),
  plotScroller: document.getElementById('plot-scroller'),
  plotCanvas: document.getElementById('plot-canvas'),
  axisLayer: document.getElementById('axis-layer'),
  stickyAxisLayer: document.getElementById('sticky-axis-layer'),
  laneLayer: document.getElementById('lane-layer'),
  relationshipLayer: document.getElementById('relationship-layer'),
  relationshipControlsLayer: document.getElementById('relationship-controls-layer'),
  relationshipTooltip: document.getElementById('relationship-tooltip'),
  crosshair: document.getElementById('crosshair'),
  mobilePolitySelect: document.getElementById('mobile-polity-select'),
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
  detailSources: document.getElementById('detail-sources')
};

const dataIndex = state.data ? TimelineCore.indexData(state.data) : { ids: {}, byPolity: new Map(), navigation: [] };
const collectionMaps = new Map(Object.entries(dataIndex.ids).map(([key, map]) => [state.data[key], map]));
const byId = (items, id) => collectionMaps.get(items)?.get(id);
const recordsFor = (polityId, key) => dataIndex.byPolity.get(polityId)?.[key] || [];
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
  const heading = document.createElement('h4');
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
    if (event.key === 'Escape') { closeSearch(); event.stopPropagation(); return; }
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

function jumpToResult(result, openDetails = false) {
  if (!openRecord(result.type, result.id, false)) return false;
  const collection = { reign: 'reigns', rule: 'rules', phase: 'phases', event: 'events', relationship: 'relationships' }[result.type];
  const record = result.type === 'house' ? rulesForHouse(result.id)[0] : dataIndex.ids[collection]?.get(result.id);
  const polityId = result.type === 'polity' ? result.id : result.type === 'region'
    ? state.polities.find(p => p.region === result.id)?.id : record?.polity_id || record?.from?.[0] || record?.to?.[0] || record?.polity_ids?.[0];
  if (!polityId) return false;
  state.mobilePolityId = polityId;
  elements.mobilePolitySelect.value = polityId;
  renderVerticalFocus();
  const phases = recordsFor(polityId, 'phases');
  const year = record?.start ?? record?.year ?? (result.type === 'region' || phases.some(p => TimelineCore.activeDuring(p, state.snapshotYear, state.data.meta)) ? state.snapshotYear : phases[0].start);
  state.snapshotYear = year;
  updateCrosshair();
  for (const button of elements.presetButtons.children) button.setAttribute('aria-pressed', String(Number(button.dataset.year) === year));
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const chart = mobile ? elements.verticalChart : elements.laneLayer;
  const attribute = { reign: 'reignId', rule: 'ruleId', house: 'ruleId', phase: 'phaseId' }[result.type];
  let target = attribute ? [...chart.querySelectorAll('button')].find(button => button.dataset[attribute] === record?.id) : null;
  if (!target && !mobile) target = result.type === 'region'
    ? [...elements.labelColumn.querySelectorAll('[data-region]')].find(item => item.dataset.region === result.id)
    : [...elements.labelColumn.querySelectorAll('button')].find(button => button.dataset.polityId === polityId);
  target ||= elements.verticalChart;
  for (const previous of document.querySelectorAll('.search-match')) previous.classList.remove('search-match');
  target.classList.add('search-match');
  target.focus({ preventScroll: true });
  if (!mobile) elements.plotScroller.scrollTo({
    left: Math.max(0, xForYear(record?.start !== undefined ? (record.start + (record.end === undefined ? record.start : effectiveEnd(record))) / 2 : year) - elements.plotScroller.clientWidth / 2),
    behavior: scrollBehavior()
  });
  const rect = target.getBoundingClientRect();
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top + rect.height / 2 - (window.innerHeight + 90) / 2), behavior: scrollBehavior() });
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
      selectSnapshotYear(preset.year, true);
      setDetailOpen(true);
    });
    elements.presetButtons.append(button);
  }
}

function buildLayout(polities) {
  const layout = [];
  let top = 0;
  let activeRegion = null;
  for (const polity of polities) {
    if (polity.region !== activeRegion) {
      activeRegion = polity.region;
      layout.push({ type: 'region', region: activeRegion, top });
      top += REGION_HEIGHT;
    }
    layout.push({ type: 'polity', polity, top });
    top += ROW_HEIGHT;
  }
  state.plotHeight = top;
  return layout;
}

function renderAxisInto(container) {
  container.replaceChildren();
  container.style.width = `${state.plotWidth}px`;
  const ticks = [chartStart()];
  const tickStep = state.zoom >= 4 ? 50 : state.zoom >= 2 ? 100 : 200;
  for (let year = Math.ceil(chartStart() / tickStep) * tickStep; year < chartEnd(); year += tickStep) {
    if (year !== 0 && year !== chartStart()) ticks.push(year);
  }
  if (chartEnd() !== chartStart()) ticks.push(chartEnd());
  for (const year of ticks) {
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
      const region = document.createElement('div');
      region.className = 'label-region';
      region.textContent = item.region;
      region.dataset.region = item.region;
      region.tabIndex = -1;
      elements.labelColumn.append(region);
      continue;
    }

    const row = document.createElement('div');
    row.className = 'label-row';
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
        () => showRuleDetail(rule.id)
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

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
    tip.textContent = `${TimelineCore.relationshipTypes[relationship.type][1]} · ${formatRange(relationship.start, relationship.end ?? relationship.start)}\n${relationship.label}\n\n${relationship.description}`;
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
  const namespace = 'http://www.w3.org/2000/svg';

  for (const relationship of state.data.relationships) {
    const endpointIds = [...new Set([...relationship.from, ...relationship.to])];
    const ys = endpointIds.map((id) => yByPolity.get(id));
    const markerY = average(ys);
    const x = xForYear(relationship.start);
    const group = document.createElementNS(namespace, 'g');
    group.dataset.relationshipId = relationship.id;
    bindRelationshipPreview(group, relationship);
    group.addEventListener('click', () => { showRelationshipDetail(relationship.id); setDetailOpen(true); });
    for (const y of ys) {
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('class', relationship.type);
      path.setAttribute('d', ys.length === 1
        ? `M ${x - 14} ${y} Q ${x} ${y - 28} ${x + 14} ${y}`
        : `M ${x} ${y} C ${x + 24} ${y}, ${x + 24} ${markerY}, ${x} ${markerY}`);
      const hit = path.cloneNode();
      hit.setAttribute('class', 'relationship-hit');
      group.append(path, hit);
    }
    elements.relationshipLayer.append(group);

    const button = elementButton(
      'relationship-button',
      `${relationship.label}, ${formatRange(relationship.start, relationship.end ?? relationship.start)}. ${TimelineCore.relationshipTypes[relationship.type][1]}: ${relationship.description}`,
      () => showRelationshipDetail(relationship.id)
    );
    button.textContent = RELATION_SYMBOLS[relationship.type] || '•';
    button.style.left = `${x}px`;
    button.style.top = `${ys.length === 1 ? markerY - 14 : markerY}px`;
    bindRelationshipPreview(button, relationship);
    button.dataset.relationshipId = relationship.id;
    elements.relationshipControlsLayer.append(button);
  }
}

function renderTimeline() {
  state.polities = orderedPolities();
  state.layout = buildLayout(state.polities);
  state.plotWidth = Math.round((TimelineCore.yearPosition(chartEnd()) - TimelineCore.yearPosition(chartStart())) * PIXELS_PER_YEAR * state.zoom);
  elements.plotCanvas.style.width = `${state.plotWidth}px`;
  elements.plotCanvas.style.height = `${AXIS_HEIGHT + state.plotHeight}px`;
  renderAxis();
  renderLabelColumn();
  renderLaneLayer();
  renderRelationships();
  renderMobileSelector();
  updateCrosshair();
}

function renderMobileSelector() {
  const previous = state.mobilePolityId;
  elements.mobilePolitySelect.replaceChildren();
  elements.mobilePolitySelect.append(
    ...state.polities.map((polity) => new Option(polity.name, polity.id))
  );
  state.mobilePolityId = state.polities.some((polity) => polity.id === previous)
    ? previous
    : state.polities[0]?.id || '';
  elements.mobilePolitySelect.value = state.mobilePolityId;
  renderVerticalFocus();
}

function mobileY(year, start, end) {
  const position = TimelineCore.yearPosition;
  return MOBILE_MARGIN + ((position(year) - position(start)) / Math.max(1, position(end) - position(start))) * (MOBILE_HEIGHT - MOBILE_MARGIN * 2);
}

function renderVerticalFocus() {
  const polity = byId(state.data.polities, state.mobilePolityId);
  elements.verticalChart.replaceChildren();
  if (!polity) return;

  const phases = recordsFor(polity.id, 'phases');
  const start = Math.min(...phases.map((phase) => phase.start));
  const end = Math.max(...phases.map(effectiveEnd));
  elements.verticalChart.setAttribute('aria-label', `${polity.name}, ${formatRange(start, end)}. Vertical timeline with phases, houses and selected monarchs.`);

  const axis = document.createElement('div');
  axis.className = 'vertical-axis';
  const span = TimelineCore.yearPosition(end) - TimelineCore.yearPosition(start);
  const step = span > 1200 ? 250 : span > 600 ? 100 : span > 250 ? 50 : 25;
  const ticks = [start];
  for (let year = Math.ceil(start / step) * step; year < end; year += step) {
    if (year > start && year !== 0) ticks.push(year);
  }
  ticks.push(end);
  for (const year of ticks) {
    const tick = document.createElement('div');
    tick.className = 'vertical-tick';
    tick.style.top = `${mobileY(year, start, end) - MOBILE_MARGIN}px`;
    const label = document.createElement('span');
    label.textContent = formatYear(year);
    tick.append(label);
    axis.append(tick);
  }
  elements.verticalChart.append(axis);

  for (const phase of phases) {
    const top = mobileY(phase.start, start, end);
    const bottom = mobileY(effectiveEnd(phase), start, end);
    const button = elementButton(
      'vertical-phase',
      `${phase.name}, ${formatRange(phase.start, phase.end)}`,
      () => showPhaseDetail(phase.id)
    );
    button.style.top = `${top}px`;
    button.style.height = `${Math.max(5, bottom - top)}px`;
    button.dataset.phaseId = phase.id;
    if (bottom - top > 30) button.textContent = phase.name;
    elements.verticalChart.append(button);
  }

  for (const rule of recordsFor(polity.id, 'rules')) {
    const top = mobileY(rule.start, start, end);
    const bottom = mobileY(effectiveEnd(rule), start, end);
    const house = byId(state.data.houses, rule.house_id);
    const button = elementButton(
      'vertical-rule',
      `${house.name}, ${formatRange(rule.start, rule.end)}`,
      () => showRuleDetail(rule.id)
    );
    button.dataset.ruleId = rule.id;
    button.style.setProperty('--house-color', houseColor(rule.house_id));
    button.style.top = `${top}px`;
    button.style.height = `${Math.max(3, bottom - top)}px`;
    elements.verticalChart.append(button);
  }

  const reigns = recordsFor(polity.id, 'reigns');
  let lastLabelY = -Infinity;
  for (const reign of reigns) {
    const person = byId(state.data.persons, reign.person_id);
    const y = (mobileY(reign.start, start, end) + mobileY(effectiveEnd(reign), start, end)) / 2;
    const button = elementButton(
      'vertical-reign',
      `${person.name}, ${reign.title}, ${formatRange(reign.start, reign.end)}`,
      () => showReignDetail(reign.id)
    );
    button.dataset.reignId = reign.id;
    button.style.top = `${y}px`;
    elements.verticalChart.append(button);
    if (reign.label && reign.importance === 3 && y - lastLabelY >= 25) {
      const label = document.createElement('span');
      label.className = 'vertical-reign-label';
      label.style.top = `${y}px`;
      label.textContent = person.name;
      elements.verticalChart.append(label);
      lastLabelY = y;
    }
  }
}

function activeAtYear(year) { return TimelineCore.snapshot(state.data, dataIndex, state.polities, year); }

function updateCrosshair() {
  const x = xForYear(state.snapshotYear);
  elements.crosshair.style.left = `${x}px`;
  elements.crosshair.style.height = `${AXIS_HEIGHT + state.plotHeight}px`;
  elements.crosshair.querySelector('span').textContent = formatYear(state.snapshotYear);
  elements.snapshotYearOutput.textContent = formatYear(state.snapshotYear);
  elements.snapshotYear.value = String(state.snapshotYear);
  elements.yearInput.value = String(state.snapshotYear);
  elements.snapshotYear.setAttribute('aria-valuetext', formatYear(state.snapshotYear));

  const { activeIds } = activeAtYear(state.snapshotYear);
  elements.snapshotSummary.textContent = `${activeIds.size} monarchies shown for this year.`;
}

function selectSnapshotYear(year, shouldScroll = false, writeUrl = true) {
  state.snapshotYear = TimelineCore.normalizeYear(year, state.data.meta, state.snapshotYear);
  for (const button of elements.presetButtons.querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.year) === state.snapshotYear));
  updateCrosshair();
  showSnapshotDetail(writeUrl);
  if (shouldScroll) elements.plotScroller.scrollTo({ left: Math.max(0, xForYear(state.snapshotYear) - elements.plotScroller.clientWidth / 2), behavior: scrollBehavior() });
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
  const url = new URL(window.location.href);
  for (const key of ['region', 'coverage', 'status', 'house', 'q', 'connections']) url.searchParams.delete(key);
  for (const [key, value] of Object.entries({ year: state.snapshotYear, zoom: state.zoom,
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
        event.preventDefault(); openRecord(item.type, item.id); elements.detailTitle.focus({ preventScroll: true });
      });
      li.append(link);
    }
    container.append(li);
  }
}
function setDetail({ type, title, dates = '', copy = '', listTitle = '', list = [], sources = [], links = [], groups = [], record = {}, writeUrl = true }) {
  hideRelationshipPreview();
  const polityId = record.polity_id || (state.selected.type === 'polity' ? record.id : null);
  if (polityId && polityId !== state.mobilePolityId && state.polities.some(p => p.id === polityId)) {
    state.mobilePolityId = polityId; elements.mobilePolitySelect.value = polityId; renderVerticalFocus();
  }
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
    const section = document.createElement('section'); const heading = document.createElement('h4'); const ul = document.createElement('ul');
    heading.textContent = group.title; appendItems(ul, group.items); section.append(heading, ul); elements.detailRelated.append(section);
  }
  elements.detailWikipedia.replaceChildren();
  elements.detailEvidence.replaceChildren();
  const citations = [...new Map([...(record.sources || []).map(source_id => ({ source_id })), ...(record.citations || [])].map(c => [c.source_id, c])).values()];
  const heading = document.createElement('h4'); heading.textContent = 'Sources'; elements.detailEvidence.append(heading);
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
function setDetailOpen(isOpen) {
  elements.detailPanel.classList.toggle('is-open', isOpen);
  elements.detailPanel.setAttribute('aria-hidden', String(!isOpen));
  elements.detailPanel.inert = !isOpen;
  elements.detailToggle.setAttribute('aria-expanded', String(isOpen));
  elements.detailToggle.hidden = isOpen;
  if (isOpen && !elements.detailPanel.open) elements.detailPanel.show();
  if (isOpen) requestAnimationFrame(() => {
    if (elements.detailPanel.open) elements.detailTitle.focus({ preventScroll: true });
  });
  if (!isOpen && elements.detailPanel.open) elements.detailPanel.close();
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
  state.mobilePolityId = polityId;
  if (state.polities.some(p => p.id === polityId)) { elements.mobilePolitySelect.value = polityId; renderVerticalFocus(); }
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
function showRuleDetail(ruleId) {
  const rule=byId(state.data.rules,ruleId),polity=byId(state.data.polities,rule.polity_id),house=byId(state.data.houses,rule.house_id);
  state.selected={type:'rule',id:ruleId};
  setDetail({type:house.kind==='office'?'Monarchical office':'Ruling house',title:house.name,dates:`${polity.name} · ${formatRange(rule.start,rule.end)}`,
    copy:rule.note || house.summary || polity.summary,record:rule,
    listTitle:'Reigns in this period',list:recordsFor(polity.id,'reigns').filter(r=>r.house_id===house.id && TimelineCore.overlaps(r,rule,state.data.meta)).map(reignLink),
    groups:[{title:'Explore further',items:[detailLink('polity',polity.id,polity.name),detailLink('house',house.id,`${house.name} across crowns`)]}],sources:sourceObjects(polity.sources)});
  addWikipediaSummary(house);
}
function showHouseDetail(houseId) {
  if(houseId==='all'){showSnapshotDetail();return;}
  const house=byId(state.data.houses,houseId),rules=rulesForHouse(houseId);
  state.selected={type:'house',id:houseId};
  setDetail({type:house.kind==='office'?'Office':'House across crowns',title:house.name,dates:`${rules.length} periods shown`,copy:house.summary || 'Select a period to see its rulers and sources.',record:house,
    listTitle:'Periods of rule',list:rules.map(r=>detailLink('rule',r.id,`${byId(state.data.polities,r.polity_id).name} · ${formatRange(r.start,r.end)}`))});
  addWikipediaSummary(house);
}
function showReignDetail(reignId) {
  const reign=byId(state.data.reigns,reignId),person=byId(state.data.persons,reign.person_id),polity=byId(state.data.polities,reign.polity_id);
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
  elements.relationshipTooltip.addEventListener('pointerenter', () => clearTimeout(relationshipPreviewTimer));
  elements.relationshipTooltip.addEventListener('pointerleave', hideRelationshipPreview);
  document.addEventListener('scroll', event => {
    if (event.target !== elements.relationshipTooltip) hideRelationshipPreview();
  }, { capture: true, passive: true });
  window.addEventListener('resize', hideRelationshipPreview);
  bindSearch();
  elements.yearInput.addEventListener('change', event => selectSnapshotYear(event.target.value, true));
  elements.zoom.addEventListener('change', event => {
    const selected = state.selected;
    state.zoom = Number(event.target.value);
    renderTimeline();
    if (selected.type === 'snapshot') selectSnapshotYear(state.snapshotYear, true);
    else jumpToResult(selected, elements.detailPanel.open);
  });
  // Commit the URL after dragging; per-frame history writes can hit browser rate limits.
  elements.snapshotYear.addEventListener('input', (event) => selectSnapshotYear(event.target.value, false, false));
  elements.snapshotYear.addEventListener('change', syncUrl);
  elements.mobilePolitySelect.addEventListener('change', (event) => {
    state.mobilePolityId = event.target.value;
    renderVerticalFocus();
    showPolityDetail(state.mobilePolityId);
    setDetailOpen(true);
  });
  elements.detailToggle.addEventListener('click', () => setDetailOpen(true));
  elements.detailClose.addEventListener('click', () => {
    setDetailOpen(false);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!elements.detailPanel.classList.contains('is-open')) return;
    if (elements.detailPanel.contains(event.target) || elements.detailToggle.contains(event.target)) return;
    setDetailOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.relationshipTooltip.matches(':popover-open')) {
      hideRelationshipPreview();
      return;
    }
    if (event.key === 'Escape' && elements.detailPanel.classList.contains('is-open')) {
      setDetailOpen(false);
      }
  });
  elements.plotScroller.addEventListener('scroll', syncStickyAxis, { passive: true });
}

function init() {
  try {
    if (!state.data) throw new Error('Timeline data bundle is missing.');
    state.plotWidth = Math.round((chartEnd() - chartStart()) * PIXELS_PER_YEAR);
    elements.snapshotYear.min = String(chartStart());
    elements.snapshotYear.max = String(chartEnd());
    elements.yearInput.min = String(chartStart());
    elements.yearInput.max = String(chartEnd());
    const searchParams = new URLSearchParams(window.location.search);
    state.snapshotYear = TimelineCore.normalizeYear(searchParams.get('year'), state.data.meta);
    if (['1','2','4'].includes(searchParams.get('zoom'))) state.zoom=Number(searchParams.get('zoom'));
    const requestedSelection = searchParams.get('selection')?.split(':');
    elements.search.value = searchParams.get('q') || '';
    elements.zoom.value = String(state.zoom);
    renderPresetButtons();
    bindControls();
    renderTimeline();
    showSnapshotDetail();
    const initialTarget = Math.max(0, xForYear(state.snapshotYear) - elements.plotScroller.clientWidth / 2);
    elements.plotScroller.scrollLeft = initialTarget;
    syncStickyAxis();
    if (requestedSelection?.length === 2) jumpToResult({ type: requestedSelection[0], id: requestedSelection[1] }, true);
    else if (searchParams.get('q')) renderSearch();
    else if (searchParams.get('region') && searchParams.get('region') !== 'all') jumpToResult({ type: 'region', id: searchParams.get('region') });
    else if (searchParams.get('house') && searchParams.get('house') !== 'all') jumpToResult({ type: 'house', id: searchParams.get('house') });
  } catch (error) {
    elements.error.hidden = false;
    elements.error.textContent = `The timeline could not be loaded. ${error.message}`;
  }
}

init();
