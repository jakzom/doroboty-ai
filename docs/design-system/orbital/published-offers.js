/* Lokalne oferty prototypu. Wczytuj po offers.js, przed kontrolerem ekranu. */
(() => {
  const key = 'doroboty:published-offers:v1';
  const draftKey = 'doroboty:offer-draft:v1';
  const modes = ['Zdalnie', 'Hybrydowo', 'Stacjonarnie'];
  const valid = item => item && typeof item === 'object'
    && typeof item.slug === 'string' && /^test-[a-z0-9-]+$/.test(item.slug)
    && ['title', 'company', 'description'].every(k => typeof item[k] === 'string' && item[k].length > 0)
    && Object.hasOwn(categories, item.category) && modes.includes(item.mode)
    && ['UoP', 'B2B'].includes(item.contract) && ['Junior', 'Mid', 'Senior'].includes(item.level)
    && Array.isArray(item.cities) && item.cities.every(c => typeof c === 'string')
    && (item.pay === null || (Array.isArray(item.pay) && item.pay.length === 2 && item.pay.every(n => Number.isFinite(n) && n > 0) && item.pay[1] >= item.pay[0]))
    && (item.due === null || (typeof item.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.due) && Number.isFinite(Date.parse(item.due))))
    && Array.isArray(item.sections) && item.sections.every(s => typeof s.title === 'string' && Array.isArray(s.items) && s.items.every(x => typeof x === 'string'));
  function read() {
    try { const data = JSON.parse(sessionStorage.getItem(key)); return Array.isArray(data) ? data.filter(valid).map(x => ({...x, local: true})) : []; }
    catch { return []; }
  }
  function write(offer) {
    if (!valid(offer)) return false;
    const all = read().filter(x => x.slug !== offer.slug);
    try { sessionStorage.setItem(key, JSON.stringify([{...offer, local: true}, ...all])); return true; }
    catch { return false; }
  }
  function readDraft() { try { return JSON.parse(sessionStorage.getItem(draftKey)); } catch { return null; } }
  function writeDraft(data) { try { sessionStorage.setItem(draftKey, JSON.stringify(data)); return true; } catch { return false; } }
  function clearDraft() { try { sessionStorage.removeItem(draftKey); } catch {} }
  window.DrPublishedOffers = {read, write, readDraft, writeDraft, clearDraft};
  offers.unshift(...read().filter(item => !offers.some(original => original.slug === item.slug)));
})();
