const reviewOfferSlug = 'automatyzacja-obslugi-klienta';
const reviewCriteria = [
  'Rozpoznaje typy zgłoszeń i definiuje zasady ich przypisywania.',
  'Potrafi skonfigurować reguły i ścieżkę dla wyjątków.',
  'Sprawdza jakość przypisań po wdrożeniu.',
];

const sampleApplication = {
  id: 'przyklad',
  name: 'Marta Nowak',
  answer: 'W zespole obsługi wdrożyliśmy klasyfikację zgłoszeń z AI. Przygotowałam listę kategorii i instrukcję dla zespołu. Reguły w narzędziu skonfigurowała osoba z IT. Po pilotażu przejrzeliśmy zgłoszenia oznaczone przez zespół jako problematyczne.',
  material: 'Zwrot → kolejka zwrotów. Reklamacja → kolejka reklamacji. Jeśli system nie rozpoznaje tematu lub wiadomość pasuje do dwóch kategorii → ręczny przegląd.',
};

const reviewStages = {
  conversation: 'Do rozmowy',
  missing: 'Brakuje informacji',
  later: 'Odłożona',
};

function storedWorkflow(key) {
  try {
    return JSON.parse(sessionStorage.getItem('doroboty:' + key));
  } catch {
    return null;
  }
}

function saveWorkflow(key, value) {
  try {
    sessionStorage.setItem('doroboty:' + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
