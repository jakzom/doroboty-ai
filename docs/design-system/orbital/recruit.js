const recruitOffer = offers.find((entry) => entry.slug === reviewOfferSlug);
const submittedApplication = storedWorkflow('application:' + reviewOfferSlug);
const applications = [sampleApplication];
if (submittedApplication) applications.unshift(submittedApplication);

const requestedId = new URLSearchParams(location.search).get('id');
const chosenApplication = applications.find((application) => application.id === requestedId);
const byId = (id) => document.getElementById(id);

const explanations = [
  {
    title: 'Zasady przypisywania zgłoszeń',
    label: 'Materiał do sprawdzenia',
    text: 'Fragment pokazuje przykładowe kategorie i sposób obsługi wyjątków. Możesz sprawdzić, czy reguła jest zrozumiała dla zespołu.',
    source: 'source-material',
  },
  {
    title: 'Samodzielna konfiguracja',
    label: 'Deklaracja w aplikacji',
    text: 'Kandydatka opisuje przygotowanie kategorii i instrukcji. Konfigurację przypisuje osobie z IT. Własne doświadczenie w konfiguracji pozostaje do ustalenia.',
    source: 'source-contribution',
  },
  {
    title: 'Sprawdzenie jakości po uruchomieniu',
    label: 'Brakuje informacji',
    text: 'Kandydatka wspomina przegląd zgłoszeń oznaczonych jako problematyczne. Nie podaje, jak dobrano przypadki do oceny ani jak sprawdzono jakość pozostałych przypisań.',
    source: 'source-pilot',
  },
];

function showCriteria(id) {
  byId(id).append(...reviewCriteria.map((criterion) => el('li', '', criterion)));
}

function decisionKey(application) {
  return 'decision:' + application.id;
}

function caseStatus(application) {
  const saved = storedWorkflow(decisionKey(application));
  return reviewStages[saved?.stage] || 'Do przeglądu';
}

function applicationLink(application) {
  const row = el('li', 'offer cat-apply');
  const link = el('a', 'case-link');
  link.href = 'rekrutacja.html?id=' + encodeURIComponent(application.id);
  const identity = el('span');
  identity.append(
    el('strong', '', application.name),
    el('span', 'workflow-muted', application.id === sampleApplication.id ? 'Scenariusz przykładowy' : 'Aplikacja z tej karty'),
  );
  const arrow = el('span', 'case-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  link.append(identity, el('span', 'count', caseStatus(application)), arrow);
  row.append(link);
  return row;
}

function renderCandidate(application, hasExplanation) {
  const answer = byId('candidate-answer');
  if (hasExplanation) {
    const cutoff = application.answer.indexOf('Po pilotażu');
    const contribution = el('blockquote', 'case-fragment workflow-text', application.answer.slice(0, cutoff).trim());
    const pilot = el('blockquote', 'case-fragment workflow-text', application.answer.slice(cutoff));
    contribution.id = 'source-contribution';
    contribution.tabIndex = -1;
    pilot.id = 'source-pilot';
    pilot.tabIndex = -1;
    answer.append(contribution, pilot);
  } else {
    answer.append(el('p', 'workflow-text', application.answer));
  }
  const material = byId('source-material');
  material.textContent = application.material || 'Nie dodano fragmentu.';
}

function showExplanation() {
  const list = byId('criteria-analysis');
  for (const { title, label, text, source } of explanations) {
    const item = el('article', 'case-criterion');
    const reference = el('a', '', 'Pokaż fragment');
    reference.href = '#' + source;
    reference.addEventListener('click', (event) => {
      event.preventDefault();
      if (source === 'source-material') byId('candidate-material-details').open = true;
      const fragment = byId(source);
      fragment.focus({ preventScroll: true });
      fragment.scrollIntoView({ block: 'center' });
    });
    item.append(el('p', 'utility', label), el('h3', '', title), el('p', '', text), reference);
    list.append(item);
  }

  const trigger = byId('explain-ai');
  const body = byId('interpretation-body');
  trigger.addEventListener('click', () => {
    body.hidden = !body.hidden;
    trigger.setAttribute('aria-expanded', String(!body.hidden));
    trigger.textContent = body.hidden ? 'Objaśnij doświadczenie AI' : 'Zwiń objaśnienie';
  });

  const feedback = byId('feedback-form');
  const feedbackKey = 'feedback:' + sampleApplication.id;
  feedback.elements.feedback.value = storedWorkflow(feedbackKey) || '';
  feedback.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = feedback.elements.feedback.value.trim();
    byId('feedback-status').textContent = value && saveWorkflow(feedbackKey, value)
      ? 'Zapisano uwagę w tej karcie.'
      : 'Wpisz uwagę i spróbuj zapisać ponownie.';
  });
}

function bindDecision(application) {
  const key = decisionKey(application);
  const form = byId('decision-form');
  const previous = storedWorkflow(key);
  byId('case-status').textContent = caseStatus(application);
  if (previous) {
    form.elements.stage.value = previous.stage;
    form.elements.reason.value = previous.reason;
  }
  form.elements.reason.addEventListener('input', () => form.elements.reason.setCustomValidity(''));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const stage = form.elements.stage.value;
    const reason = form.elements.reason.value.trim();
    if (!reason) {
      form.elements.reason.setCustomValidity('Wpisz uzasadnienie.');
      form.elements.reason.reportValidity();
      return;
    }
    if (saveWorkflow(key, { stage, reason })) {
      byId('case-status').textContent = caseStatus(application);
      byId('decision-status').textContent = 'Decyzja zapisana w tej karcie.';
    } else {
      byId('decision-status').textContent = 'Przeglądarka nie pozwoliła zapisać decyzji w tej karcie.';
    }
  });
}

byId('recruit-meta').prepend(categoryLabel(recruitOffer));
byId('recruit-role').textContent = recruitOffer.title + ' · ' + recruitOffer.company;

if (!requestedId) {
  byId('application-count').textContent = String(applications.length);
  byId('application-list').append(...applications.map(applicationLink));
  showCriteria('index-criteria');
} else {
  byId('recruit-index').hidden = true;
  byId('recruit-back').href = 'rekrutacja.html';
  byId('recruit-back').textContent = '← Wróć do zgłoszeń';
  if (chosenApplication) {
    const hasExplanation = chosenApplication.id === sampleApplication.id;
    byId('recruit-title').textContent = chosenApplication.name;
    byId('recruit-case').hidden = false;
    showCriteria('case-criteria');
    renderCandidate(chosenApplication, hasExplanation);
    if (hasExplanation) {
      showExplanation();
    } else {
      byId('interpretation-intro').textContent = 'Przygotowane objaśnienie znajdziesz w aplikacji Marty Nowak. Tutaj możesz przeczytać źródło i samodzielnie zapisać decyzję.';
      byId('interpretation-action').hidden = true;
    }
    bindDecision(chosenApplication);
  } else {
    byId('case-not-found').hidden = false;
  }
}
