const categories = {
  build: 'Build',
  apply: 'Apply',
  lead: 'Lead',
};

const categoryActions = {
  build: 'Budowanie rozwiązań',
  apply: 'Stosowanie AI',
  lead: 'Prowadzenie inicjatyw',
};

const contractLabels = { UoP: 'UoP · brutto', B2B: 'B2B · netto + VAT' };

const offers = [
  {
    slug: 'projektowanie-narzedzi-operacyjnych',
    title: 'Projektant / Projektantka produktu AI – asystent planowania pracy zespołów operacyjnych',
    company: 'Pracownia Zmiana',
    category: 'build',
    mode: 'Hybrydowo',
    cities: ['Wrocław'],
    level: 'Senior',
    pay: [16500, 21000],
    contract: 'B2B',
    due: '2026-12-04',
    description: 'Zaprojektujesz asystenta AI, który proponuje obsadę zmian na podstawie dostępności pracowników. Koordynator sprawdza i zatwierdza propozycje. Zespół spotyka się we Wrocławiu dwa dni w tygodniu.',
    sections: [
      {
        title: 'O produkcie i zespole',
        text: 'Pracujemy nad aplikacją używaną przez koordynatorów zmian. Wspólnie z inżynierami i osobą odpowiedzialną za produkt sprawdzamy, kiedy propozycje asystenta pomagają koordynatorom i jakie informacje są im potrzebne przed zatwierdzeniem grafiku.',
      },
      {
        title: 'Czym będziesz się zajmować',
        items: [
          'Prowadzić rozmowy i obserwacje z osobami planującymi pracę zespołów.',
          'Projektować sposób prezentacji propozycji AI oraz ścieżki ich poprawiania i odrzucania.',
          'Testować prototypy z koordynatorami, także przy niepełnych danych i konfliktach w grafiku.',
          'Włączać sprawdzone wzorce do wspólnej biblioteki komponentów.',
        ],
      },
      {
        title: 'Czego szukamy',
        items: [
          'Doświadczenia w projektowaniu złożonych produktów cyfrowych i pracy z zespołem inżynierskim.',
          'Portfolio z przykładem decyzji projektowej dotyczącej rekomendacji, automatyzacji lub trudnego przypadku.',
          'Umiejętności prowadzenia rozmów i przekładania obserwacji na konkretne decyzje.',
        ],
      },
      {
        title: 'Jak wygląda rekrutacja',
        text: 'Najpierw krótka rozmowa o roli i warunkach. Potem wspólnie omówimy jeden projekt z Twojego portfolio. Na koniec spotkasz osoby, z którymi będziesz pracować.',
      },
    ],
  },
  {
    slug: 'redagowanie-tresci-zdalnie',
    title: 'Redaktor / Redaktorka treści z AI',
    company: 'Studio Przecinek',
    category: 'apply',
    mode: 'Zdalnie',
    remoteFrom: 'Polska',
    level: 'Mid',
    pay: null,
    contract: 'UoP',
    due: '2026-12-01',
    description: 'Wykorzystasz AI do przygotowania szkiców artykułów i newsletterów. Sprawdzisz źródła i zredagujesz ostateczną wersję do publikacji. Zespół pracuje zdalnie z Polski.',
    sections: [
      {
        title: 'Czym będziesz się zajmować',
        items: [
          'Przygotowywać konspekty i warianty nagłówków z pomocą AI.',
          'Weryfikować twierdzenia oraz cytaty w źródłach i poprawiać błędy w szkicach.',
          'Redagować teksty do publikacji oraz uzgadniać z autorami zasady korzystania z AI.',
        ],
      },
      {
        title: 'Czego szukamy',
        text: 'Doświadczenia w pracy redakcyjnej oraz przykładu użycia AI, przy którym możesz opowiedzieć, co narzędzie zaproponowało i co zmieniłaś lub zmieniłeś przed publikacją.',
      },
      {
        title: 'Jak wygląda rekrutacja',
        text: 'Zaczniemy od rozmowy o przykładowych tekstach i zakresie roli. Widełki pozostają niepodane w ogłoszeniu.',
      },
    ],
  },
  { title:'AI Product Manager', company:'Studio Północ', category:'lead', mode:'Hybrydowo', cities:['Warszawa'], level:'Senior', pay:[14000,18000], contract:'B2B', due:'2026-11-22', cover:'PÓŁNOC.', description:'Ustalanie kolejności wdrożeń funkcji AI, uzgadnianie zakresu z zespołami i podejmowanie decyzji o kontynuacji pilotaży na podstawie wyników.' },
  { title:'Inżynier / Inżynierka platformy ML', company:'Obieg', category:'build', mode:'Zdalnie', remoteFrom:'Polska', level:'Senior', pay:[19000,24000], contract:'B2B', due:'2026-11-25', cover:'obieg↗', description:'Budowa platformy do wdrażania modeli oraz monitorowanie jakości danych i predykcji po wdrożeniu.' },
  { title:'Specjalista / Specjalistka ds. komunikacji z AI', company:'Rozgłos', category:'apply', mode:'Stacjonarnie', cities:['Kraków'], level:'Mid', pay:null, contract:'UoP', due:'2026-11-29', description:'Wykorzystanie AI do podsumowywania pytań społeczności i przygotowywania odpowiedzi, które zespół sprawdza przed publikacją.' },
  {
    slug: 'automatyzacja-obslugi-klienta',
    title: 'Specjalista / Specjalistka ds. automatyzacji obsługi klienta',
    company: 'Pętla',
    category: 'apply',
    mode: 'Hybrydowo',
    cities: ['Gdańsk', 'Gdynia', 'Sopot'],
    level: 'Mid',
    pay: [9000, 12000],
    contract: 'UoP',
    due: null,
    description: 'Usprawnianie obsługi klienta: konfigurowanie narzędzi AI do klasyfikowania zgłoszeń i sprawdzanie, kiedy automatyczne przypisanie wymaga korekty.',
    sections: [
      { title: 'Czym będziesz się zajmować', items: [
        'Zdefiniujesz kategorie wiadomości i zasady kierowania ich do właściwych zespołów.',
        'Skonfigurujesz reguły i ścieżkę ręcznego przeglądu w niejednoznacznych przypadkach.',
        'Sprawdzisz jakość przypisań po wdrożeniu i zaproponujesz korekty.',
      ] },
      { title: 'Jak wygląda rekrutacja', text: 'W zgłoszeniu opisz własny wkład w usprawnienie jednego procesu z AI. Dołącz krótki, zanonimizowany przykład, jeśli możesz go udostępnić.' },
    ],
  },
  { title:'Projektant / Projektantka kampanii z generatywną AI', company:'Punkt', category:'apply', mode:'Zdalnie', remoteFrom:'Polska', level:'Mid', pay:[12000,16000], contract:'B2B', due:'2026-11-30', cover:'punkt.', description:'Przygotowywanie wariantów kreacji kampanii z pomocą modeli generatywnych i dopracowywanie wybranych materiałów zgodnie z zasadami marki.' },
  { title:'Koordynator / Koordynatorka programu wdrażania AI', company:'Fundacja Równik', category:'lead', mode:'Zdalnie', remoteFrom:'Polska', level:'Mid', pay:null, contract:'UoP', due:null, description:'Prowadzenie pilotażu narzędzi AI w programie edukacyjnym: ustalanie zakresu z partnerami i decydowanie, które wdrożenia rozszerzyć po pilotażu.' },
  { title:'Frontend Developer – asystent AI', company:'Warstwa', category:'build', mode:'Hybrydowo', cities:['Łódź'], level:'Mid', pay:[15000,20000], contract:'B2B', due:'2026-11-24', cover:'WARSTWA', description:'Budowa interfejsu asystenta AI, w tym wyświetlania źródeł, przekazywania uwag i obsługi sytuacji, w których asystent nie ma odpowiedzi.' },
  { title:'Analityk / Analityczka kampanii z AI', company:'Kamerton', category:'apply', mode:'Zdalnie', remoteFrom:'Polska', level:'Mid', pay:[10500,14000], contract:'UoP', due:'2026-11-27', description:'Wykorzystanie AI do grupowania opinii i podsumowywania kampanii oraz weryfikowanie wniosków w danych źródłowych.' },
  { title:'Specjalista / Specjalistka ds. operacji z AI', company:'Wspólny Stół', category:'apply', mode:'Stacjonarnie', cities:['Lublin'], level:'Junior', pay:[7600,9800], contract:'UoP', due:'2026-11-21', description:'Przygotowywanie raportów z pomocą AI, sprawdzanie zgodności z dokumentami dostaw i przekazywanie wyjątków właściwym osobom.' },
  { title:'UX Researcher – asystent wyszukiwania', company:'Przestrzeń', category:'build', mode:'Hybrydowo', cities:['Wrocław'], level:'Senior', pay:[11000,15000], contract:'UoP', due:'2026-11-20', description:'Badanie prototypu wyszukiwarki opartej na AI: sprawdzanie, czy użytkownicy rozpoznają błędne odpowiedzi i potrafią wrócić do źródła.' },
  { title:'Inżynier / Inżynierka testów modeli AI', company:'Mapa', category:'build', mode:'Zdalnie', remoteFrom:'Polska', level:'Mid', pay:[13000,17500], contract:'B2B', due:'2026-11-06', closed:true, description:'Tworzenie zestawów testowych i sprawdzanie, jak zmiana modelu wpływa na odpowiedzi asystenta.' },
  { title:'Lider / Liderka wdrożeń AI w operacjach', company:'Dalszy Plan', category:'lead', secondary:['apply'], mode:'Stacjonarnie', cities:['Poznań'], level:'Senior', pay:[15000,19000], contract:'UoP', due:'2026-11-19', description:'Prowadzenie wdrożeń AI w zespołach operacyjnych: ustalanie budżetu, wybór procesów do pilotażu i samodzielne konfigurowanie automatyzacji raportowania.' },
];

const money = new Intl.NumberFormat('pl-PL');
const calendar = new Intl.DateTimeFormat('pl-PL', { day:'numeric', month:'short', timeZone:'UTC' });

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function categoryLabel(offer) {
  const label = el('span', 'category');
  label.append(el('span', 'mark'), categories[offer.category]);
  return label;
}

function terms(offer) {
  return [
    offer.cities?.length
      ? ['Lokalizacja / tryb', offer.cities.join(', '), offer.mode]
      : ['Lokalizacja / tryb', offer.remoteFrom === 'Polska' ? 'Zdalnie z Polski' : offer.mode, ''],
    ['Wynagrodzenie', offer.pay ? offer.pay.map((value) => money.format(value)).join('–') + ' zł / mies.' : 'Nie podano', contractLabels[offer.contract]],
    ['Termin', offer.due ? calendar.format(new Date(offer.due + 'T00:00:00Z')) : 'Nie podano', offer.closed ? 'Rekrutacja zamknięta' : ''],
  ];
}

function offerFacts(offer) {
  const facts = el('dl');
  for (const [label, value, extra] of [...terms(offer), ['Doświadczenie', offer.level]]) {
    const pair = el('div', 'fact');
    pair.append(el('dt', '', label), el('dd', '', value + (extra && label !== 'Termin' ? ' · ' + extra : '')));
    facts.append(pair);
  }
  return facts;
}

function recruitmentStatus(offer) {
  return offer.closed ? 'Rekrutacja zamknięta' : 'Rekrutacja otwarta';
}
