const applicationSlug = new URLSearchParams(location.search).get('id');
const applicationOffer = offers.find((entry) => entry.slug && entry.slug === applicationSlug && !entry.closed);
const applicationLayout = document.querySelector('#application-layout');
const applicationForm = document.querySelector('#application-form');
const applicationSections = ['edit', 'review', 'done'];
let draft;

function showApplicationStep(step) {
  for (const name of applicationSections) {
    document.querySelector('#application-' + name).hidden = name !== step;
  }
  document.querySelector('#application-' + step + '-title').focus();
}

function fillApplication(data) {
  for (const field of ['name', 'answer', 'material']) {
    applicationForm.elements[field].value = data[field];
  }
}

if (!applicationOffer) {
  document.querySelector('#application-unavailable').hidden = false;
} else {
  const key = 'application:' + applicationSlug;
  document.querySelector('#offer-back').href = 'oferta.html?id=' + encodeURIComponent(applicationSlug);
  document.querySelector('#application-role').textContent = applicationOffer.title + ' · ' + applicationOffer.company;
  const meta = document.querySelector('#application-meta');
  meta.classList.add('cat-' + applicationOffer.category);
  meta.prepend(categoryLabel(applicationOffer));
  document.querySelector('#application-facts').append(offerFacts(applicationOffer));
  applicationLayout.hidden = false;

  const previous = storedWorkflow(key);
  if (previous) fillApplication(previous);

  document.querySelector('#prefill').addEventListener('click', () => {
    fillApplication({
      name: 'Aleks Żuraw',
      answer: 'Przygotowałem instrukcję przeglądu propozycji AI. Przetestowałem ją z dwiema osobami i dopisałem przykład, w którym należało odrzucić podpowiedź i samodzielnie sprawdzić źródło.',
      material: 'Jeśli podpowiedź AI nie zgadza się z danymi źródłowymi, użyj danych źródłowych i zgłoś rozbieżność.',
    });
    applicationForm.elements.name.focus();
  });

  applicationForm.addEventListener('input', (event) => event.target.setCustomValidity(''));
  applicationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    for (const field of ['name', 'answer']) {
      const input = applicationForm.elements[field];
      if (!input.value.trim()) {
        input.setCustomValidity('Wpisz treść w tym polu.');
        input.reportValidity();
        return;
      }
    }
    draft = { id: crypto.randomUUID() };
    for (const field of ['name', 'answer', 'material']) {
      draft[field] = applicationForm.elements[field].value.trim();
      document.querySelector('#review-' + field).textContent = draft[field] || 'Nie dodano.';
    }
    showApplicationStep('review');
  });
  document.querySelector('#edit-application').addEventListener('click', () => showApplicationStep('edit'));
  document.querySelector('#submit-application').addEventListener('click', () => {
    if (!saveWorkflow(key, draft)) {
      document.querySelector('#application-error').textContent = 'Przeglądarka nie pozwoliła zapisać aplikacji w tej karcie.';
      return;
    }
    const recruiterLink = document.querySelector('#show-recruiter');
    recruiterLink.href = 'rekrutacja.html?id=' + encodeURIComponent(draft.id);
    recruiterLink.hidden = applicationSlug !== reviewOfferSlug;
    showApplicationStep('done');
  });
}
