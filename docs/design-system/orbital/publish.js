(() => {
  const $ = s => document.querySelector(s);
  const store = window.DrPublishedOffers;
  const form = $('#publish-form');
  const names = ['title','company','category','city','mode','level','contract','payMin','payMax','due','description','tasks','requirements'];
  let currentOffer, editingId = null, busy = false;
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  form.elements.due.min = today;
  function formData() {
    return {...Object.fromEntries(names.map(n => [n, form.elements[n].value.trim()])), showPay: $('#show-pay').checked};
  }
  function reflectFields() {
    const remote = form.elements.mode.value === 'Zdalnie';
    form.elements.city.required = !remote;
    form.elements.city.labels[0].textContent = remote ? 'Lokalizacja (opcjonalnie)' : 'Lokalizacja';
    $('#city-help').textContent = remote ? 'Opcjonalnie podaj miasto zespołu. Oferta będzie dostępna zdalnie z Polski.' : 'Podaj miasto lub miasta oddzielone przecinkiem.';
    const pay = $('#show-pay').checked;
    $('#pay-fields').hidden = !pay;
    for (const name of ['payMin','payMax']) { form.elements[name].disabled = !pay; form.elements[name].required = pay; }
    $('#pay-help').textContent = !pay ? 'W ogłoszeniu pokażemy „Nie podano”.' : form.elements.contract.value === 'UoP' ? 'Kwoty brutto miesięcznie na umowie o pracę.' : 'Kwoty netto + VAT miesięcznie na B2B.';
  }
  function clearErrors() {
    form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(x => { x.hidden = true; x.textContent = ''; });
    $('#validation-summary').hidden = true;
  }
  function fill(data) {
    for (const name of names) if (typeof data[name] === 'string') form.elements[name].value = data[name];
    $('#show-pay').checked = data.showPay !== false;
    reflectFields(); clearErrors();
  }
  function fromOffer(o) {
    return {title:o.title, company:o.company, category:o.category, city:o.cities.join(', '), mode:o.mode, level:o.level, contract:o.contract,
      payMin:String(o.pay?.[0] || ''), payMax:String(o.pay?.[1] || ''), due:o.due || '', description:o.description,
      tasks:o.sections[0]?.items.join('\n') || '', requirements:o.sections[1]?.items.join('\n') || '', showPay:!!o.pay};
  }
  function show(step) {
    for (const name of ['edit','review','done']) $('#publish-'+name).hidden = name !== step;
    document.querySelectorAll('[data-step]').forEach(li => {
      if (li.dataset.step === step) li.setAttribute('aria-current','step'); else li.removeAttribute('aria-current');
    });
    $('#'+step+'-title').focus();
  }
  function localList() {
    const items = store.read();
    $('#no-local-offers').hidden = items.length > 0;
    $('#local-offers').replaceChildren(...items.map(o => {
      const li = el('li'); const a = el('a','',o.title); a.href = 'oferta.html?id='+encodeURIComponent(o.slug);
      const edit = el('a','text-button','Edytuj'); edit.href = 'dodaj-oferte.html?edit='+encodeURIComponent(o.slug);
      li.append(a,edit); return li;
    }));
  }
  function validate() {
    clearErrors();
    const data = formData(), errors = new Map();
    for (const name of ['title','company','description','tasks','requirements']) {
      if (!data[name]) errors.set(name,'Uzupełnij to pole.');
      else if (data[name].length > form.elements[name].maxLength) errors.set(name,'Skróć treść do '+form.elements[name].maxLength+' znaków.');
    }
    if (data.mode !== 'Zdalnie' && !data.city.split(',').some(c => c.trim())) errors.set('city','Podaj miasto dla tego trybu pracy.');
    if (data.showPay) {
      for (const name of ['payMin','payMax']) if (!data[name] || !Number.isInteger(Number(data[name])) || Number(data[name]) <= 0 || Number(data[name]) > 1000000) errors.set(name,'Podaj pełną kwotę od 1 do 1 000 000 zł.');
      if (!errors.has('payMin') && !errors.has('payMax') && Number(data.payMax) < Number(data.payMin)) errors.set('payMax','Górna kwota nie może być niższa od dolnej.');
    }
    if (form.elements.due.validity.badInput || (data.due && (!Number.isFinite(Date.parse(data.due)) || data.due < today))) errors.set('due','Wybierz dzisiejszą lub późniejszą datę.');
    if (!errors.size) return data;
    const summary = $('#validation-summary'); summary.replaceChildren(el('strong','','Sprawdź zaznaczone pola.'));
    const list = el('ul');
    for (const [name,message] of errors) {
      const input = form.elements[name]; input.setAttribute('aria-invalid','true');
      const error = $('#'+name+'-error'); error.textContent = message; error.hidden = false;
      const li=el('li'), a=el('a','',input.labels[0].textContent+': '+message); a.href='#'+name;
      a.addEventListener('click',e=>{e.preventDefault();input.focus();}); li.append(a);list.append(li);
    }
    summary.append(list);summary.hidden=false; summary.focus(); return null;
  }
  function buildOffer(data) {
    return {slug:editingId || 'test-'+crypto.randomUUID(), local:true, title:data.title, company:data.company, category:data.category,
      cities:data.city.split(',').map(s=>s.trim()).filter(Boolean), mode:data.mode, remoteFrom:data.mode==='Zdalnie'?'Polska':undefined,
      level:data.level, contract:data.contract, pay:data.showPay?[Number(data.payMin),Number(data.payMax)]:null, due:data.due || null,
      description:data.description, sections:[{title:'Czym będziesz się zajmować',items:data.tasks.split('\n').map(x=>x.trim()).filter(Boolean)},{title:'Czego szukamy',items:data.requirements.split('\n').map(x=>x.trim()).filter(Boolean)}]};
  }
  function preview() {
    const host = $('#offer-preview'), o=currentOffer;
    const header = el('header','offer-page-header cat-'+o.category);header.append(categoryLabel(o),el('h3','preview-title',o.title),el('p','offer-page-company',o.company),offerFacts(o));
    const content=el('div','offer-description preview-description'); content.append(el('p','offer-lead',o.description));
    for (const section of o.sections) {const block=el('section');block.append(el('h3','',section.title));const ul=el('ul');ul.append(...section.items.map(x=>el('li','',x)));block.append(ul);content.append(block);}
    host.replaceChildren(header,content); $('#save-error').hidden=true;$('#save-status').textContent='';
    $('#publish').textContent = editingId ? 'Zapisz zmiany testowe' : 'Dodaj ofertę testową';
  }
  async function save() {
    if (busy || !currentOffer) return;
    busy=true; $('#save-error').hidden=true; $('#save-status').textContent='Zapisuję ofertę…';
    $('#offer-preview').setAttribute('aria-busy','true');
    for (const id of ['publish','back-edit','retry-save']) $('#'+id).disabled=true;
    const simulate=$('#simulate-error').checked; $('#simulate-error').checked=false;
    await new Promise(resolve=>setTimeout(resolve,800));
    const success=!simulate && store.write(currentOffer);
    busy=false;$('#offer-preview').setAttribute('aria-busy','false');
    for (const id of ['publish','back-edit','retry-save']) $('#'+id).disabled=false;
    $('#save-status').textContent='';
    if (!success) {
      $('#save-error-copy').textContent=simulate ? 'To zaplanowany błąd demonstracyjny. Treść pozostała w formularzu. Spróbuj ponownie.' : 'Treść pozostała w formularzu. Zapis w tej karcie jest niedostępny. Spróbuj ponownie; jeśli błąd wraca, skopiuj treść przed zamknięciem karty.';
      $('#save-error').hidden=false; $('#retry-save').focus(); return;
    }
    const wasEdit=!!editingId; editingId=currentOffer.slug; store.clearDraft();localList();
    $('#done-title').textContent=wasEdit?'Zmiany testowe zapisane.':'Oferta testowa dodana.';
    $('#done-copy').textContent=currentOffer.title+' · '+currentOffer.company;
    $('#view-published').href='oferta.html?id='+encodeURIComponent(currentOffer.slug);show('done');
  }
  form.addEventListener('submit',event=>{event.preventDefault();const data=validate();if(!data)return;currentOffer=buildOffer(data);preview();show('review');});
  form.addEventListener('change',reflectFields);
  $('#save-draft').addEventListener('click',()=>{
    const ok=store.writeDraft({fields:formData(),editingId});
    $('#draft-status').textContent=ok?'Szkic zapisany w tej karcie. Możesz wrócić do niego później.':'Nie udało się zapisać szkicu. Treść pozostaje w formularzu.';
  });
  $('#example').addEventListener('click',()=>{
    fill({title:'Projektant / Projektantka automatyzacji z AI',company:'Studio Przepływ',category:'apply',city:'Wrocław',mode:'Hybrydowo',level:'Mid',contract:'B2B',payMin:'12000',payMax:'16000',due:'',description:'Pomóż zespołom obsługi klienta odzyskać czas. Połącz narzędzia AI z codzienną pracą i sprawdzaj jakość rezultatów.',tasks:'Rozpoznasz powtarzalne zadania w obsłudze klienta.\nSkonfigurujesz automatyzacje z użyciem AI.\nSprawdzisz rezultaty i opiszesz sytuacje wymagające oceny człowieka.',requirements:'Doświadczenie w usprawnianiu procesów.\nPrzykład automatyzacji i opis własnego wkładu.\nUmiejętność sprawdzania jakości rezultatów AI.',showPay:true});
    $('#draft-status').textContent='Wstawiono przykład. Możesz zmienić każde pole.';
  });
  $('#back-edit').addEventListener('click',()=>show('edit'));
  $('#edit-published').addEventListener('click',()=>{fill(fromOffer(currentOffer));show('edit');});
  $('#publish').addEventListener('click',save);$('#retry-save').addEventListener('click',save);
  const editId=new URLSearchParams(location.search).get('edit');
  if (editId) {
    const found=store.read().find(o=>o.slug===editId);
    if(found){editingId=found.slug;fill(fromOffer(found));$('#edit-title').textContent='Edytuj ofertę.';}
    else $('#draft-status').textContent='Nie znaleziono tej oferty w tej karcie. Możesz przygotować nową.';
  } else {
    const draft=store.readDraft();
    if(draft && draft.fields && typeof draft.fields==='object') {
      editingId=store.read().some(o=>o.slug===draft.editingId)?draft.editingId:null;
      fill(draft.fields);$('#draft-status').textContent='Przywrócono szkic zapisany w tej karcie.';
    }
  }
  reflectFields();localList();
})();
