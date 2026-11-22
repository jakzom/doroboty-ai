const fullOffer = document.querySelector('#full-offer');
const slug = new URLSearchParams(location.search).get('id');
const offer = offers.find((entry) => entry.slug && entry.slug === slug);

if (offer) {
  document.title = offer.title + ' · DoRoboty.ai';
  const header = el('header', 'offer-page-header cat-' + offer.category);
  const identity = el('div', 'offer-page-meta');
  identity.append(categoryLabel(offer), el('span', 'utility', recruitmentStatus(offer)));
  const company = el('p', 'offer-page-company', offer.company);
  if (offer.secondary) company.append(' · ' + offer.secondary.map((key) => categories[key]).join(', '));
  header.append(identity, el('h1', '', offer.title), company);
  if (offer.local) {
    const edit = el('a', 'text-button', 'Edytuj ofertę testową');
    edit.href = 'dodaj-oferte.html?edit=' + encodeURIComponent(offer.slug);
    header.append(el('p', 'workflow-muted', 'Oferta testowa zapisana w tej karcie.'), edit);
  }

  const body = el('div', 'offer-page-body');
  const summary = el('aside', 'offer-summary');
  summary.setAttribute('aria-labelledby', 'summary-title');
  const summaryTitle = el('h2', '', 'Warunki oferty');
  summaryTitle.id = 'summary-title';
  summary.append(summaryTitle, offerFacts(offer));
  if (!offer.closed) {
    const apply = el('a', 'detail-link', 'Aplikuj');
    apply.href = 'aplikuj.html?id=' + encodeURIComponent(offer.slug);
    summary.append(apply, el('p', 'application-note', 'Oferta przykładowa · aplikacja testowa'));
  }

  const content = el('div', 'offer-description');
  content.append(el('p', 'offer-lead', offer.description));
  for (const { title, text, items } of offer.sections) {
    const section = el('section');
    section.append(el('h2', '', title));
    if (text) section.append(el('p', '', text));
    if (items) {
      const list = el('ul');
      list.append(...items.map((item) => el('li', '', item)));
      section.append(list);
    }
    content.append(section);
  }
  body.append(summary, content);
  fullOffer.append(header, body);
} else {
  const state = el('section', 'workflow-panel');
  state.append(el('h1', '', 'Ta oferta jest niedostępna.'), el('p', '', 'Ogłoszenie może być nieaktualne. Jeśli było ofertą testową, jest dostępne tylko w karcie, w której je zapisano.'));
  const actions = el('div', 'workflow-actions');
  const back = el('a', 'detail-link', 'Przejdź do ofert'); back.href = 'index.html#wyniki';
  actions.append(back); state.append(actions); fullOffer.append(state);
}
