const demoAreas = [...document.querySelectorAll('[data-demo-area]')];
const all = document.querySelector('#demo-all');
const selected = new Set();
function updateDemoFilters() {
  all.setAttribute('aria-pressed', String(selected.size === 0));
  for (const button of demoAreas) button.setAttribute('aria-pressed', String(selected.has(button.dataset.demoArea)));
  document.querySelector('#demo-filter-status').textContent = 'Wybrane: ' + (selected.size ? demoAreas.filter(b => selected.has(b.dataset.demoArea)).map(b => b.textContent.trim()).join(', ') : 'wszystkie kategorie');
}
all.addEventListener('click', () => { selected.clear(); updateDemoFilters(); });
for (const button of demoAreas) button.addEventListener('click', () => {
  const area = button.dataset.demoArea;
  selected.has(area) ? selected.delete(area) : selected.add(area);
  updateDemoFilters();
});
const field = document.querySelector('#demo-name');
const error = document.querySelector('#demo-error');
const status = document.querySelector('#demo-form-status');
document.querySelector('#demo-form').addEventListener('submit', event => {
  event.preventDefault();
  const valid = !!field.value.trim();
  field.setAttribute('aria-invalid', String(!valid));
  error.hidden = valid;
  status.textContent = valid ? 'Pole uzupełnione poprawnie. To przykład, dane nie są zapisywane.' : '';
  if (!valid) field.focus();
});
field.addEventListener('input', () => {
  status.textContent = '';
  if (field.value.trim()) { field.removeAttribute('aria-invalid'); error.hidden = true; }
});
