const $ = (selector) => document.querySelector(selector);
const results = $('#offers');
const query = $('#query');
const searchCity = $('#search-city');
const multipleCitiesOption = searchCity?.querySelector('[value=multiple]');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const selectedModes = new Set();
const selectedCities = new Set();
const initialArea = new URLSearchParams(location.search).get('area');
const selectedAreas = new Set(Object.hasOwn(categories, initialArea) ? [initialArea] : []);
const minimumPay = $('#minimum-pay');
const contract = $('#contract');
const level = $('#level');
const selects = [minimumPay, contract, level];
const activeFilters = $('#active-filters');
const sort = $('#sort');
const dialog = $('#details');
const metroRoutes = document.querySelectorAll('[data-metro-route]');
const plurals = new Intl.PluralRules('pl-PL');
let view = 'list';

function normalize(value) {
  return value.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('ł', 'l');
}

function offerCategories(offer) {
  return [offer.category, ...(offer.secondary || [])];
}

const cities = [...new Set(offers.flatMap((offer) => offer.cities || []))]
  .sort((a, b) => a.localeCompare(b, 'pl'));
if (searchCity) {
  for (const city of cities) searchCity.add(new Option(city, city));
  searchCity.addEventListener('change', () => {
    selectedCities.clear();
    if (cities.includes(searchCity.value)) selectedCities.add(searchCity.value);
    render();
  });
}

function facetButton(label, className = 'chip') {
  const button = el('button', className);
  button.type = 'button';
  button.append(label);
  return button;
}

const cityButtons = cities.map((city) => {
  const button = facetButton(city);
  $('#cities').append(button);
  return { value: city, label: city, button };
});
const areaButtons = Object.entries(categories).map(([value, label]) => {
  const button = facetButton(label + ' · ' + categoryActions[value], 'chip area-chip cat-' + value);
  const mark = el('span', 'mark');
  mark.setAttribute('aria-hidden', 'true');
  button.prepend(mark);
  $('#areas').append(button);
  return { value, label, button };
});
const facetGroups = [
  { selected: selectedAreas, options: areaButtons },
  { selected: selectedCities, options: cityButtons },
  {
    selected: selectedModes,
    options: modeButtons.map((button) => ({ value: button.dataset.mode, label: button.textContent, button })),
  },
];

for (const { selected, options } of facetGroups) {
  for (const { value, button } of options) {
    button.addEventListener('click', () => {
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
      render();
    });
  }
}

$('#all-areas').addEventListener('click', () => {
  selectedAreas.clear();
  render();
});

function offerRow(offer, rowIndex) {
  const item = el('li', 'offer cat-' + offer.category);
  const button = el('button', 'offer-row');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-label', 'Szczegóły: ' + offer.title + ', ' + offer.company + ', ' + offerCategories(offer).map((key) => categories[key]).join(', '));
  const identity = el('span', 'identity');
  const meta = el('span', 'identity-meta');
  meta.append(el('span', '', offer.company), categoryLabel(offer));
  if (offer.secondary) meta.append(el('span', '', '· ' + offer.secondary.map((key) => categories[key]).join(', ')));
  identity.append(el('span', 'offer-title', offer.title), meta);

  const initials = offer.company.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const cover = el('span', 'cover' + (offer.cover ? ' word' : ''), offer.cover || initials);
  cover.setAttribute('aria-hidden', 'true');
  const fields = terms(offer).map(([label, value, extra], index) => {
    const fact = el('span', ['fact fact-location', 'fact fact-pay', 'fact'][index]);
    fact.id = 'offer-' + rowIndex + '-fact-' + index;
    fact.append(el('span', 'fact-label', label), el('span', '', value));
    if (extra) fact.append(el('small', '', index === 0 ? ' · ' + extra : extra));
    return fact;
  });
  button.setAttribute('aria-describedby', fields.map((fact) => fact.id).join(' '));
  const arrow = el('span', 'offer-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  button.append(cover, identity, ...fields, arrow);
  button.addEventListener('click', () => openDetails(offer));
  item.append(button);
  return item;
}

function openDetails(offer) {
  const panel = el('article', 'detail cat-' + offer.category);
  const title = el('h2', '', offer.title);
  title.id = 'detail-title';
  const facts = offerFacts(offer);
  const status = el('p', 'utility', recruitmentStatus(offer));
  const company = el('p', 'detail-company', offer.company + (offer.secondary ? ' · ' + offer.secondary.map((key) => categories[key]).join(', ') : ''));
  panel.append(categoryLabel(offer), title, company, status, facts, el('h3', '', 'O stanowisku'), el('p', '', offer.description), el('p', 'note', 'Oferta przykładowa'));
  if (offer.slug) {
    const link = el('a', 'detail-link', 'Pełne ogłoszenie');
    link.href = 'oferta.html?id=' + encodeURIComponent(offer.slug);
    panel.append(link);
  }
  $('#detail-content').replaceChildren(panel);
  dialog.showModal();
}

function renderActiveFilters() {
  const selected = [];
  const search = query.value.trim();
  if (search) selected.push({ label: 'Szukasz: „' + search + '”', clear: () => { query.value = ''; } });
  for (const { selected: group, options } of facetGroups) {
    for (const { value, label } of options) {
      if (group.has(value)) selected.push({ label, clear: () => group.delete(value) });
    }
  }
  for (const select of selects) {
    if (!select.value) continue;
    selected.push({
      label: select.selectedOptions[0].textContent,
      clear: () => { select.value = ''; },
    });
  }

  const items = selected.map(({ label, clear }, index) => {
    const item = el('li');
    const button = el('button', 'chip', label);
    button.type = 'button';
    button.setAttribute('aria-label', 'Usuń filtr: ' + label);
    const mark = el('span', 'remove', '×');
    mark.setAttribute('aria-hidden', 'true');
    button.append(mark);
    button.addEventListener('click', () => {
      clear();
      render();
      const remaining = activeFilters.querySelectorAll('button');
      (remaining[Math.min(index, remaining.length - 1)] || $('#results-title')).focus();
    });
    item.append(button);
    return item;
  });
  activeFilters.replaceChildren(...items);
  activeFilters.hidden = selected.length === 0;
  $('#reset').hidden = selected.length === 0;
}

function render() {
  const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
  const filtered = offers.filter((offer) => {
    const haystack = normalize([
      offer.title, offer.company, ...(offer.cities || []), offer.remoteFrom, offer.mode,
      ...offerCategories(offer).map((key) => categories[key]),
    ].join(' '));
    const matchesCity = selectedCities.size === 0 || offer.remoteFrom === 'Polska'
      || offer.cities?.some((city) => selectedCities.has(city));
    return matchesCity
      && (selectedModes.size === 0 || selectedModes.has(offer.mode))
      && (selectedAreas.size === 0 || offerCategories(offer).some((area) => selectedAreas.has(area)))
      && (!minimumPay.value || (offer.pay && offer.pay[0] >= Number(minimumPay.value)))
      && (!contract.value || contract.value === offer.contract)
      && (!level.value || level.value === offer.level)
      && words.every((word) => haystack.includes(word));
  });
  if (sort.value === 'pay') filtered.sort((a, b) => (b.pay?.[1] ?? 0) - (a.pay?.[1] ?? 0));

  for (const { selected, options } of facetGroups) {
    for (const { value, button } of options) {
      button.setAttribute('aria-pressed', String(selected.has(value)));
    }
  }
  if (searchCity) {
    if (selectedCities.size > 1) {
      const noun = plurals.select(selectedCities.size) === 'few' ? 'miasta' : 'miast';
      multipleCitiesOption.textContent = selectedCities.size + ' ' + noun;
      searchCity.value = 'multiple';
    } else {
      searchCity.value = [...selectedCities][0] ?? '';
    }
  }
  for (const route of metroRoutes) {
    route.classList.toggle('is-muted', selectedAreas.size > 0 && !selectedAreas.has(route.dataset.metroRoute));
  }
  $('#all-areas').setAttribute('aria-pressed', String(selectedAreas.size === 0));
  $('#city-hint').hidden = selectedCities.size === 0 || (selectedModes.size > 0 && !selectedModes.has('Zdalnie'));
  const extras = [minimumPay, contract, level].filter((select) => select.value).length;
  $('#extra-count').hidden = extras === 0;
  $('#extra-count').textContent = extras;
  renderActiveFilters();

  results.classList.toggle('grid', view === 'grid');
  $('#columns').hidden = view === 'grid' || !filtered.length;
  const noun = { one:'oferta', few:'oferty', many:'ofert' }[plurals.select(filtered.length)];
  $('#count').textContent = filtered.length + ' ' + noun;
  $('#empty').hidden = Boolean(filtered.length);
  results.replaceChildren(...filtered.map(offerRow));
}

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    view = button.dataset.view;
    for (const control of document.querySelectorAll('[data-view]')) {
      control.setAttribute('aria-pressed', String(control === button));
    }
    render();
  });
}
$('#search').addEventListener('submit', (event) => {
  event.preventDefault();
  $('#results-title').focus();
});
query.addEventListener('input', render);
for (const select of selects) select.addEventListener('change', render);
sort.addEventListener('change', render);
$('#reset').addEventListener('click', () => {
  for (const { selected } of facetGroups) selected.clear();
  query.value = '';
  for (const select of selects) select.value = '';
  render();
  query.focus();
});
render();
