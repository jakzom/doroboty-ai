(() => {
 const output=document.querySelector('#state-output'), status=document.querySelector('#lab-status');
 const controls=[...document.querySelectorAll('[data-state]')];
 let timer;
 function button(text,action) { const b=el('button','detail-link',text);b.type='button';b.addEventListener('click',action);return b; }
 function link(text,href) {const a=el('a','detail-link',text);a.href=href;return a;}
 function render(state) {
  clearTimeout(timer);output.replaceChildren();output.setAttribute('aria-busy',String(state==='loading'));
  controls.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===state)));
  status.textContent='';
  const icon=el('span','state-icon',state==='error'||state==='offline'?'!':state==='ready'?'✓':'—');icon.setAttribute('aria-hidden','true');
  output.append(icon);
  if(state==='loading') {
   status.textContent='Wczytuję aplikacje…';const spinner=el('span','state-loader');spinner.setAttribute('aria-hidden','true');status.prepend(spinner);
   output.append(el('h2','','Przygotowuję listę aplikacji.'));
   const lines=el('div','state-lines');lines.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)lines.append(el('span'));output.append(lines);
   timer=setTimeout(()=>render('ready'),1400);return;
  }
  const texts={error:['Nie udało się wczytać aplikacji.','Spróbuj ponownie. Nie wprowadzono zmian w zgłoszeniach.'],offline:['Brak połączenia.','Sprawdź połączenie i spróbuj wczytać listę ponownie.'],empty:['Jeszcze nie ma aplikacji.','Zgłoszenia pojawią się tutaj, gdy kandydaci odpowiedzą na ofertę.'],unavailable:['Ta oferta jest niedostępna.','Ogłoszenie mogło zostać usunięte albo rekrutacja została zakończona. Sprawdź pozostałe oferty.'],ready:['Lista aplikacji gotowa.','To demonstracja udanego wczytania. W panelu znajdziesz przykładowe zgłoszenie.']};
  const [title,copy]=texts[state];output.append(el('h2','',title),el('p','',copy));status.textContent=title;
  const actions=el('div','workflow-actions');
  if(state==='error'||state==='offline')actions.append(button('Spróbuj ponownie',()=>render('loading')));
  else if(state==='empty')actions.append(link('Przygotuj ofertę','dodaj-oferte.html'));
  else if(state==='unavailable')actions.append(link('Przejdź do ofert','index.html#wyniki'));
  else actions.append(link('Otwórz panel rekrutera','rekrutacja.html'));
  output.append(actions);
 }
 controls.forEach(b=>b.addEventListener('click',()=>render(b.dataset.state)));
 render('empty');
})();
