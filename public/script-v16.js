const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');

function closeMenu(restoreFocus = false) {
  if (!header || !toggle) return;
  const wasOpen = header.classList.contains('menu-open');
  header.classList.remove('menu-open');
  document.body.classList.remove('menu-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Apri il menu');
  if (restoreFocus && wasOpen) toggle.focus();
}

if (header && toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = !header.classList.contains('menu-open');
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 850) closeMenu(); });
}

document.querySelectorAll('[data-carousel]').forEach(shell => {
  const track = shell.querySelector('.spaces-carousel');
  const prev = shell.querySelector('.carousel-prev');
  const next = shell.querySelector('.carousel-next');
  if (!track || !prev || !next) return;
  const step = () => Math.max(280, track.clientWidth * 0.72);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const move = direction => track.scrollBy({ left: direction * step(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  });
  const update = () => {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    prev.setAttribute('aria-disabled', String(prev.disabled));
    next.setAttribute('aria-disabled', String(next.disabled));
  };
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});

// v19 — richiesta informazioni tramite email precompilata
(() => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-contact-status]');
  const recipients = {
    primaria: 'primaria.ud@dimesse.org',
    secondaria: 'segreteria@dimesse.org',
    convitto: 'convitto@dimesse.org',
    generale: 'segreteria@dimesse.org'
  };
  const labels = {
    primaria: 'Scuola Primaria',
    secondaria: 'Scuola Secondaria di primo grado',
    convitto: 'Convitto universitario',
    generale: 'Informazioni generali'
  };
  const requestedInterest = new URLSearchParams(location.search).get('interesse');
  const interestSelect = form.querySelector('[name="interesse"]');
  if (interestSelect && Object.hasOwn(recipients, requestedInterest)) {
    interestSelect.value = requestedInterest;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const interest = String(data.get('interesse') || 'generale');
    const recipient = recipients[interest] || recipients.generale;
    const phone = String(data.get('telefono') || '').trim();
    const subject = `Richiesta dal sito — ${labels[interest] || labels.generale}`;
    const body = [
      `Nome e cognome: ${data.get('nome')}`,
      `Email: ${data.get('email')}`,
      phone ? `Telefono: ${phone}` : '',
      `Area di interesse: ${labels[interest] || labels.generale}`,
      '',
      'Messaggio:',
      String(data.get('messaggio') || '')
    ].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\n');
    if (status) status.textContent = 'Email pronta: completa l’invio nel programma di posta che si apre.';
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();


// v15 — Filtri e ricerca dell’archivio documenti
(() => {
  const cards = [...document.querySelectorAll('[data-document]')];
  if (!cards.length) return;
  const buttons = [...document.querySelectorAll('[data-audience-filter]')];
  const noticeCards = [...document.querySelectorAll('[data-notice]')];
  const search = document.querySelector('[data-document-search]');
  const sections = [...document.querySelectorAll('[data-document-section]')];
  const result = document.querySelector('[data-document-results]');
  const empty = document.querySelector('[data-document-empty]');
  let audience = 'all';
  const params = new URLSearchParams(location.search);
  const requested = params.get('scuola');
  if (requested === 'primaria' || requested === 'secondaria') audience = requested;

  function update() {
    const term = (search?.value || '').trim().toLocaleLowerCase('it');
    let visible = 0;
    cards.forEach(card => {
      const cardAudience = card.dataset.audience;
      const audienceMatch = audience === 'all' || cardAudience === audience || cardAudience === 'comune';
      const searchMatch = !term || card.dataset.search.includes(term);
      card.hidden = !(audienceMatch && searchMatch);
      if (!card.hidden) visible++;
    });
    noticeCards.forEach(card => {
      const cardAudience = card.dataset.audience;
      card.hidden = !(audience === 'all' || cardAudience === audience || cardAudience === 'comune');
    });
    sections.forEach(section => {
      section.hidden = !section.querySelector('[data-document]:not([hidden])');
    });
    buttons.forEach(button => {
      const active = button.dataset.audienceFilter === audience;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (result) result.textContent = `${visible} ${visible === 1 ? 'documento disponibile' : 'documenti disponibili'}`;
    if (empty) empty.hidden = visible !== 0;
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    audience = button.dataset.audienceFilter;
    const next = new URL(location.href);
    if (audience === 'all') next.searchParams.delete('scuola'); else next.searchParams.set('scuola', audience);
    history.replaceState({}, '', next);
    update();
  }));
  search?.addEventListener('input', update);
  update();
})();
