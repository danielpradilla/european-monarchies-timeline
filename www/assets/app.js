const DATA_URL = 'data/timeline.json';
const CHART_START = -27;
const CHART_END = 2026;
const PIXELS_PER_YEAR = 1.35;
const ROW_HEIGHT = 62;
const REGION_HEIGHT = 34;
const AXIS_HEIGHT = 64;
const MOBILE_HEIGHT = 760;
const MOBILE_MARGIN = 34;

const REGION_ORDER = [
  'Mediterranean',
  'Western Europe',
  'Britain and Ireland',
  'Iberia',
  'Nordics',
  'Central Europe',
  'Central and Eastern Europe',
  'Italian states',
  'Southeast Europe'
];

const HOUSE_PALETTE = [
  '#9a3b32', '#295f73', '#82602c', '#526f3d', '#75518c', '#a35d27',
  '#3f6d68', '#864f64', '#5c5f9a', '#8a6939', '#3e6b50', '#765b43'
];

const RELATION_SYMBOLS = {
  continuity: '→',
  conquest: '×',
  dissolution: '×',
  dynastic_union: '◇',
  partition: '↗',
  personal_union: '◇',
  restoration: '↺',
  state_union: '+'
};

const state = {
  data: null,
  region: 'all',
  coverage: 'core-current',
  status: 'all',
  house: 'all',
  showRelationships: true,
  snapshotYear: 1519,
  selected: null,
  visiblePolities: [],
  layout: [],
  plotWidth: Math.round((CHART_END - CHART_START) * PIXELS_PER_YEAR),
  plotHeight: 0,
  mobilePolityId: 'france'
};

const elements = {
  polityCount: document.getElementById('polity-count'),
  reignCount: document.getElementById('reign-count'),
  currentCount: document.getElementById('current-count'),
  regionFilter: document.getElementById('region-filter'),
  coverageFilter: document.getElementById('coverage-filter'),
  statusFilter: document.getElementById('status-filter'),
  houseFilter: document.getElementById('house-filter'),
  relationshipToggle: document.getElementById('relationship-toggle'),
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

const byId = (items, id) => items.find((item) => item.id === id);

function formatYear(year) {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year === 0) return '1 CE';
  return `${year} CE`;
}

function formatRange(start, end) {
  if (start === end) return formatYear(start);
  return `${formatYear(start)}–${formatYear(end)}`;
}

function xForYear(year) {
  return ((year - CHART_START) / (CHART_END - CHART_START)) * state.plotWidth;
}

function houseColor(houseId) {
  let hash = 0;
  for (const character of houseId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return HOUSE_PALETTE[Math.abs(hash) % HOUSE_PALETTE.length];
}

function polityStart(polityId) {
  return Math.min(...state.data.phases.filter((phase) => phase.polity_id === polityId).map((phase) => phase.start));
}

function sourceObjects(sourceIds = []) {
  return sourceIds.map((id) => byId(state.data.sources, id)).filter(Boolean);
}

function visiblePolities() {
  return state.data.polities
    .filter((polity) => state.region === 'all' || polity.region === state.region)
    .filter((polity) => {
      if (state.coverage === 'all') return true;
      if (state.coverage === 'core') return polity.tier === 1;
      return polity.tier === 1 || polity.status === 'current';
    })
    .filter((polity) => state.status === 'all' || polity.status === state.status)
    .sort((a, b) => {
      const regionDelta = REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region);
      if (regionDelta) return regionDelta;
      return polityStart(a.id) - polityStart(b.id) || a.name.localeCompare(b.name);
    });
}

function renderFilterOptions() {
  const regions = [...new Set(state.data.polities.map((polity) => polity.region))]
    .sort((a, b) => REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b));
  for (const region of regions) {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    elements.regionFilter.append(option);
  }

  const usedHouseIds = new Set(state.data.rules.map((rule) => rule.house_id));
  const houses = state.data.houses
    .filter((house) => usedHouseIds.has(house.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const house of houses) {
    const option = document.createElement('option');
    option.value = house.id;
    option.textContent = house.name;
    elements.houseFilter.append(option);
  }
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
      layout.push({ type: 'region', region: activeRegion, top, height: REGION_HEIGHT });
      top += REGION_HEIGHT;
    }
    layout.push({ type: 'polity', polity, top, height: ROW_HEIGHT });
    top += ROW_HEIGHT;
  }
  state.plotHeight = top;
  return layout;
}

function renderAxisInto(container) {
  container.replaceChildren();
  container.style.width = `${state.plotWidth}px`;
  const ticks = [CHART_START];
  for (let year = 200; year <= 2000; year += 200) ticks.push(year);
  ticks.push(CHART_END);
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
  elements.plotCanvas.classList.toggle('house-filtering', state.house !== 'all');

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

    const phases = state.data.phases.filter((phase) => phase.polity_id === polity.id);
    for (const phase of phases) {
      const phaseButton = elementButton(
        `phase-segment${phase.end === state.data.meta.end_year ? ' current' : ''}`,
        `${phase.name}, ${formatRange(phase.start, phase.end)}`,
        () => showPhaseDetail(phase.id)
      );
      phaseButton.style.left = `${xForYear(phase.start)}px`;
      phaseButton.style.width = `${Math.max(3, xForYear(phase.end) - xForYear(phase.start))}px`;
      row.append(phaseButton);
    }

    const rules = state.data.rules.filter((rule) => rule.polity_id === polity.id);
    for (const rule of rules) {
      const house = byId(state.data.houses, rule.house_id);
      const width = Math.max(2, xForYear(rule.end) - xForYear(rule.start));
      const ruleButton = elementButton(
        `rule-segment${state.house === rule.house_id ? ' house-match' : ''}`,
        `${house.name} ruled ${polity.name}, ${formatRange(rule.start, rule.end)}`,
        () => showRuleDetail(rule.id)
      );
      ruleButton.dataset.houseId = rule.house_id;
      ruleButton.style.setProperty('--house-color', houseColor(rule.house_id));
      ruleButton.style.left = `${xForYear(rule.start)}px`;
      ruleButton.style.width = `${width}px`;
      if (width > 65) ruleButton.textContent = house.name;
      row.append(ruleButton);
    }

    const reigns = state.data.reigns
      .filter((reign) => reign.polity_id === polity.id && reign.importance >= 2)
      .sort((a, b) => a.start - b.start);
    const labels = [];
    for (const reign of reigns) {
      const person = byId(state.data.persons, reign.person_id);
      const startX = xForYear(reign.start);
      const endX = xForYear(reign.end);
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

function renderRelationships() {
  elements.relationshipLayer.replaceChildren();
  elements.relationshipControlsLayer.replaceChildren();
  elements.desktopTimeline.classList.toggle('relationships-hidden', !state.showRelationships);
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
  const visibleIds = new Set(yByPolity.keys());
  const namespace = 'http://www.w3.org/2000/svg';

  for (const relationship of state.data.relationships) {
    const fromIds = relationship.from.filter((id) => visibleIds.has(id));
    const toIds = relationship.to.filter((id) => visibleIds.has(id));
    if (!fromIds.length && !toIds.length) continue;
    if (!fromIds.length || !toIds.length) continue;

    const fromY = average(fromIds.map((id) => yByPolity.get(id)));
    const toY = average(toIds.map((id) => yByPolity.get(id)));
    const x = xForYear(relationship.start);
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('class', relationship.type);
    if (Math.abs(fromY - toY) < 2) {
      path.setAttribute('d', `M ${x - 14} ${fromY} C ${x - 38} ${fromY - 28}, ${x + 38} ${toY - 28}, ${x + 14} ${toY}`);
    } else {
      const bend = Math.min(42, Math.max(18, Math.abs(toY - fromY) / 5));
      path.setAttribute('d', `M ${x} ${fromY} C ${x + bend} ${fromY}, ${x - bend} ${toY}, ${x} ${toY}`);
    }
    elements.relationshipLayer.append(path);

    const button = elementButton(
      'relationship-button',
      `${relationship.label}, ${formatRange(relationship.start, relationship.end ?? relationship.start)}. ${relationship.description}`,
      () => showRelationshipDetail(relationship.id)
    );
    button.textContent = RELATION_SYMBOLS[relationship.type] || '•';
    button.style.left = `${x}px`;
    button.style.top = `${(fromY + toY) / 2}px`;
    elements.relationshipControlsLayer.append(button);
  }
}

function renderTimeline() {
  state.visiblePolities = visiblePolities();
  state.layout = buildLayout(state.visiblePolities);
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
  for (const polity of state.visiblePolities) {
    const option = document.createElement('option');
    option.value = polity.id;
    option.textContent = polity.name;
    elements.mobilePolitySelect.append(option);
  }
  if (state.visiblePolities.some((polity) => polity.id === previous)) {
    state.mobilePolityId = previous;
  } else {
    state.mobilePolityId = state.visiblePolities[0]?.id || '';
  }
  elements.mobilePolitySelect.value = state.mobilePolityId;
  renderVerticalFocus();
}

function mobileY(year, start, end) {
  return MOBILE_MARGIN + ((year - start) / Math.max(1, end - start)) * (MOBILE_HEIGHT - MOBILE_MARGIN * 2);
}

function renderVerticalFocus() {
  const polity = byId(state.data.polities, state.mobilePolityId);
  elements.verticalChart.replaceChildren();
  if (!polity) return;
  elements.verticalChart.classList.toggle('house-filtering', state.house !== 'all');

  const phases = state.data.phases.filter((phase) => phase.polity_id === polity.id);
  const start = Math.min(...phases.map((phase) => phase.start));
  const end = Math.max(...phases.map((phase) => phase.end));
  elements.verticalChart.setAttribute('aria-label', `${polity.name}, ${formatRange(start, end)}. Vertical timeline with phases, houses and selected monarchs.`);

  const axis = document.createElement('div');
  axis.className = 'vertical-axis';
  const span = end - start;
  const step = span > 1200 ? 250 : span > 600 ? 100 : span > 250 ? 50 : 25;
  const ticks = [start];
  for (let year = Math.ceil(start / step) * step; year < end; year += step) {
    if (year > start) ticks.push(year);
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
    const bottom = mobileY(phase.end, start, end);
    const button = elementButton(
      'vertical-phase',
      `${phase.name}, ${formatRange(phase.start, phase.end)}`,
      () => showPhaseDetail(phase.id)
    );
    button.style.top = `${top}px`;
    button.style.height = `${Math.max(5, bottom - top)}px`;
    if (bottom - top > 30) button.textContent = phase.name;
    elements.verticalChart.append(button);
  }

  for (const rule of state.data.rules.filter((item) => item.polity_id === polity.id)) {
    const top = mobileY(rule.start, start, end);
    const bottom = mobileY(rule.end, start, end);
    const house = byId(state.data.houses, rule.house_id);
    const button = elementButton(
      `vertical-rule${state.house === rule.house_id ? ' house-match' : ''}`,
      `${house.name}, ${formatRange(rule.start, rule.end)}`,
      () => showRuleDetail(rule.id)
    );
    button.style.setProperty('--house-color', houseColor(rule.house_id));
    button.style.top = `${top}px`;
    button.style.height = `${Math.max(3, bottom - top)}px`;
    elements.verticalChart.append(button);
  }

  const reigns = state.data.reigns
    .filter((reign) => reign.polity_id === polity.id && reign.importance >= 2)
    .sort((a, b) => a.start - b.start);
  let lastLabelY = -Infinity;
  for (const reign of reigns) {
    const person = byId(state.data.persons, reign.person_id);
    const y = mobileY((reign.start + reign.end) / 2, start, end);
    const button = elementButton(
      'vertical-reign',
      `${person.name}, ${reign.title}, ${formatRange(reign.start, reign.end)}`,
      () => showReignDetail(reign.id)
    );
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

function activeAtYear(year) {
  const visibleIds = new Set(state.visiblePolities.map((polity) => polity.id));
  const activePhases = state.data.phases.filter(
    (phase) => visibleIds.has(phase.polity_id) && phase.start <= year && phase.end >= year
  );
  const activeIds = new Set(activePhases.map((phase) => phase.polity_id));
  const activeReigns = state.data.reigns.filter(
    (reign) => activeIds.has(reign.polity_id) && reign.start <= year && reign.end >= year
  );
  return { activePhases, activeIds, activeReigns };
}

function updateCrosshair() {
  const x = xForYear(state.snapshotYear);
  elements.crosshair.style.left = `${x}px`;
  elements.crosshair.style.height = `${AXIS_HEIGHT + state.plotHeight}px`;
  elements.crosshair.querySelector('span').textContent = formatYear(state.snapshotYear);
  elements.snapshotYearOutput.textContent = formatYear(state.snapshotYear);
  elements.snapshotYear.value = String(state.snapshotYear);

  const { activeIds, activeReigns } = activeAtYear(state.snapshotYear);
  const named = activeReigns
    .filter((reign) => reign.importance === 3)
    .map((reign) => byId(state.data.persons, reign.person_id)?.name)
    .filter(Boolean);
  const uniqueNamed = [...new Set(named)];
  const namesSummary = uniqueNamed.length ? ` Notable rulers include ${uniqueNamed.slice(0, 4).join(', ')}${uniqueNamed.length > 4 ? ' and others' : ''}.` : '';
  elements.snapshotSummary.textContent = `${activeIds.size} visible monarchies or monarchical states are active.${namesSummary}`;
}

function selectSnapshotYear(year, shouldScroll = false) {
  const numericYear = Number(year);
  state.snapshotYear = numericYear === 0 ? 1 : numericYear;
  for (const button of elements.presetButtons.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.year) === state.snapshotYear));
  }
  updateCrosshair();
  showSnapshotDetail();
  if (shouldScroll) {
    const target = Math.max(0, xForYear(state.snapshotYear) - elements.plotScroller.clientWidth / 2);
    elements.plotScroller.scrollTo({ left: target, behavior: 'smooth' });
  }
}

function setDetail({ type, title, dates = '', copy = '', listTitle = '', list = [], sources = [], links = [] }) {
  elements.detailType.textContent = type;
  elements.detailTitle.textContent = title;
  elements.detailToggleTitle.textContent = title;
  elements.detailDates.textContent = dates;
  elements.detailCopy.textContent = copy;
  elements.detailSecondaryTitle.textContent = listTitle || 'Related details';
  elements.detailList.replaceChildren();
  for (const item of list) {
    const li = document.createElement('li');
    li.textContent = item;
    elements.detailList.append(li);
  }
  if (!list.length) {
    const li = document.createElement('li');
    li.textContent = 'No additional items in the current editorial selection.';
    elements.detailList.append(li);
  }

  elements.detailSources.replaceChildren();
  const allLinks = [
    ...sources.map((source) => ({ label: source.title, url: source.url })),
    ...links
  ];
  const seen = new Set();
  for (const link of allLinks) {
    if (!link?.url || seen.has(link.url)) continue;
    seen.add(link.url);
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = link.label;
    elements.detailSources.append(anchor);
  }
}

function setDetailOpen(isOpen) {
  elements.detailPanel.classList.toggle('is-open', isOpen);
  elements.detailPanel.setAttribute('aria-hidden', String(!isOpen));
  elements.detailPanel.inert = !isOpen;
  elements.detailToggle.setAttribute('aria-expanded', String(isOpen));
  elements.detailToggle.hidden = isOpen;
}

function showSnapshotDetail() {
  state.selected = { type: 'snapshot', id: String(state.snapshotYear) };
  const preset = state.data.presets.find((item) => item.year === state.snapshotYear);
  const { activeIds, activeReigns } = activeAtYear(state.snapshotYear);
  const notable = activeReigns
    .filter((reign) => reign.importance === 3)
    .sort((a, b) => byId(state.data.polities, a.polity_id).region.localeCompare(byId(state.data.polities, b.polity_id).region))
    .slice(0, 14)
    .map((reign) => `${byId(state.data.persons, reign.person_id).name} — ${byId(state.data.polities, reign.polity_id).short_name}`);
  const events = state.data.events
    .filter((event) => event.year === state.snapshotYear)
    .map((event) => event.label);
  setDetail({
    type: preset ? 'Story date' : 'Year snapshot',
    title: preset?.title || `Europe in ${formatYear(state.snapshotYear)}`,
    dates: `${activeIds.size} visible active polities`,
    copy: preset?.description || 'The vertical line aligns every visible lane to the same year. Select a realm, dynasty band, monarch dot or crown connection for its sources and editorial note.',
    listTitle: events.length ? 'Events and notable rulers' : 'Notable rulers',
    list: [...events, ...notable]
  });
}

function showPolityDetail(polityId) {
  const polity = byId(state.data.polities, polityId);
  const phases = state.data.phases.filter((phase) => phase.polity_id === polityId);
  const reigns = state.data.reigns
    .filter((reign) => reign.polity_id === polityId && reign.importance === 3)
    .map((reign) => `${byId(state.data.persons, reign.person_id).name}, ${formatRange(reign.start, reign.end)}`);
  state.selected = { type: 'polity', id: polityId };
  for (const button of elements.labelColumn.querySelectorAll('button[data-polity-id]')) {
    button.setAttribute('aria-pressed', String(button.dataset.polityId === polityId));
  }
  setDetail({
    type: `${polity.status === 'current' ? 'Current' : 'Former'} monarchy · Tier ${polity.tier}`,
    title: polity.name,
    dates: phases.map((phase) => formatRange(phase.start, phase.end)).join(' · '),
    copy: polity.summary,
    listTitle: 'Selected monarchs',
    list: reigns,
    sources: sourceObjects(polity.sources)
  });
}

function showPhaseDetail(phaseId) {
  const phase = byId(state.data.phases, phaseId);
  const polity = byId(state.data.polities, phase.polity_id);
  const houses = state.data.rules
    .filter((rule) => rule.polity_id === polity.id && rule.start <= phase.end && rule.end >= phase.start)
    .map((rule) => `${byId(state.data.houses, rule.house_id).name}, ${formatRange(rule.start, rule.end)}`);
  state.selected = { type: 'phase', id: phaseId };
  setDetail({
    type: 'Institutional phase',
    title: phase.name,
    dates: formatRange(phase.start, phase.end),
    copy: phase.note || `${phase.name} is one dated phase within the broader ${polity.name} lane. Separate phases preserve interruptions, restorations and changes of constitutional identity.`,
    listTitle: 'Ruling houses in this phase',
    list: houses,
    sources: sourceObjects(polity.sources)
  });
}

function showRuleDetail(ruleId) {
  const rule = byId(state.data.rules, ruleId);
  const polity = byId(state.data.polities, rule.polity_id);
  const house = byId(state.data.houses, rule.house_id);
  const reigns = state.data.reigns
    .filter((reign) => reign.polity_id === polity.id && reign.house_id === house.id)
    .map((reign) => `${byId(state.data.persons, reign.person_id).name}, ${formatRange(reign.start, reign.end)}`);
  state.selected = { type: 'rule', id: ruleId };
  setDetail({
    type: 'Ruling house',
    title: house.name,
    dates: `${polity.name} · ${formatRange(rule.start, rule.end)}`,
    copy: `The band marks the period assigned to ${house.name} in the ${polity.name} lane. It does not imply uninterrupted biological succession: elective accessions, cadet branches and disputed reigns are simplified at overview scale.`,
    listTitle: 'Selected rulers from this house',
    list: reigns,
    sources: sourceObjects(polity.sources)
  });
}

function showHouseDetail(houseId) {
  if (houseId === 'all') {
    showSnapshotDetail();
    return;
  }
  const house = byId(state.data.houses, houseId);
  const visibleIds = new Set(state.visiblePolities.map((polity) => polity.id));
  const rules = state.data.rules
    .filter((rule) => rule.house_id === houseId && visibleIds.has(rule.polity_id))
    .sort((a, b) => a.start - b.start);
  setDetail({
    type: 'House highlight',
    title: house.name,
    dates: `${rules.length} visible crown segment${rules.length === 1 ? '' : 's'}`,
    copy: 'Every matching band remains saturated while other ruling houses recede. Shared colour identifies the same house across different polity lanes; it does not claim that every branch acted as one political unit.',
    listTitle: 'Crowns in chronological order',
    list: rules.map((rule) => `${byId(state.data.polities, rule.polity_id).name}, ${formatRange(rule.start, rule.end)}`)
  });
}

function showReignDetail(reignId) {
  const reign = byId(state.data.reigns, reignId);
  const person = byId(state.data.persons, reign.person_id);
  const polity = byId(state.data.polities, reign.polity_id);
  const house = reign.house_id ? byId(state.data.houses, reign.house_id) : null;
  const otherReigns = state.data.reigns
    .filter((item) => item.person_id === person.id && item.id !== reign.id)
    .map((item) => `${item.title} in ${byId(state.data.polities, item.polity_id).short_name}, ${formatRange(item.start, item.end)}`);
  state.selected = { type: 'reign', id: reignId };
  setDetail({
    type: 'Selected reign',
    title: person.name,
    dates: `${reign.title} · ${formatRange(reign.start, reign.end)}`,
    copy: house ? `${person.name} is shown within the ${house.name} segment of the ${polity.name} lane.` : `${person.name} is shown as a selected ruler of ${polity.name}.`,
    listTitle: otherReigns.length ? 'Other crowns held' : 'Context',
    list: otherReigns.length ? otherReigns : [polity.summary],
    sources: sourceObjects(polity.sources),
    links: [{ label: `${person.name} reference`, url: person.url }]
  });
}

function showRelationshipDetail(relationshipId) {
  const relationship = byId(state.data.relationships, relationshipId);
  const polityNames = [...new Set([...relationship.from, ...relationship.to])]
    .map((id) => byId(state.data.polities, id)?.name)
    .filter(Boolean);
  state.selected = { type: 'relationship', id: relationshipId };
  setDetail({
    type: relationship.type.replaceAll('_', ' '),
    title: relationship.label,
    dates: formatRange(relationship.start, relationship.end ?? relationship.start),
    copy: relationship.description,
    listTitle: 'Connected polity lanes',
    list: polityNames,
    sources: sourceObjects(relationship.sources)
  });
}

function bindControls() {
  elements.regionFilter.addEventListener('change', (event) => {
    state.region = event.target.value;
    renderTimeline();
    showSnapshotDetail();
  });
  elements.coverageFilter.addEventListener('change', (event) => {
    state.coverage = event.target.value;
    renderTimeline();
    showSnapshotDetail();
  });
  elements.statusFilter.addEventListener('change', (event) => {
    state.status = event.target.value;
    renderTimeline();
    showSnapshotDetail();
  });
  elements.houseFilter.addEventListener('change', (event) => {
    state.house = event.target.value;
    renderTimeline();
    showHouseDetail(state.house);
    setDetailOpen(true);
  });
  elements.relationshipToggle.addEventListener('change', (event) => {
    state.showRelationships = event.target.checked;
    elements.desktopTimeline.classList.toggle('relationships-hidden', !state.showRelationships);
  });
  elements.snapshotYear.addEventListener('input', (event) => selectSnapshotYear(event.target.value));
  elements.mobilePolitySelect.addEventListener('change', (event) => {
    state.mobilePolityId = event.target.value;
    renderVerticalFocus();
    showPolityDetail(state.mobilePolityId);
    setDetailOpen(true);
  });
  elements.detailToggle.addEventListener('click', () => setDetailOpen(true));
  elements.detailClose.addEventListener('click', () => {
    setDetailOpen(false);
    elements.detailToggle.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!elements.detailPanel.classList.contains('is-open')) return;
    if (elements.detailPanel.contains(event.target) || elements.detailToggle.contains(event.target)) return;
    setDetailOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.detailPanel.classList.contains('is-open')) {
      setDetailOpen(false);
      elements.detailToggle.focus();
    }
  });
  elements.plotScroller.addEventListener('scroll', syncStickyAxis, { passive: true });
}

async function loadTimelineData() {
  if (window.TIMELINE_DATA) return window.TIMELINE_DATA;

  const response = await fetch(DATA_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Timeline data returned HTTP ${response.status}`);
  return response.json();
}

async function init() {
  try {
    state.data = await loadTimelineData();
    const searchParams = new URLSearchParams(window.location.search);
    const requestedYear = Number(searchParams.get('year'));
    if (searchParams.has('year') && Number.isInteger(requestedYear) && requestedYear >= CHART_START && requestedYear <= CHART_END) {
      state.snapshotYear = requestedYear === 0 ? 1 : requestedYear;
    }
    elements.polityCount.textContent = String(state.data.polities.length);
    elements.reignCount.textContent = String(state.data.reigns.length);
    elements.currentCount.textContent = String(state.data.polities.filter((polity) => polity.status === 'current').length);
    renderFilterOptions();
    renderPresetButtons();
    bindControls();
    renderTimeline();
    showSnapshotDetail();
    const initialTarget = Math.max(0, xForYear(state.snapshotYear) - elements.plotScroller.clientWidth / 2);
    elements.plotScroller.scrollLeft = initialTarget;
    syncStickyAxis();
  } catch (error) {
    elements.error.hidden = false;
    elements.error.textContent = `The timeline could not be loaded. ${error.message}`;
  }
}

init();
