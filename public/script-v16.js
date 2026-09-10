const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
let headerCompact = false;
let headerFrame = null;

function applyHeaderSize() {
  headerFrame = null;
  if (!header) return;
  if (!headerCompact && window.scrollY > 72) {
    headerCompact = true;
    header.classList.add('is-compact');
  } else if (headerCompact && window.scrollY < 28) {
    headerCompact = false;
    header.classList.remove('is-compact');
  }
}

function requestHeaderUpdate() {
  if (headerFrame === null) headerFrame = requestAnimationFrame(applyHeaderSize);
}

applyHeaderSize();
window.addEventListener('scroll', requestHeaderUpdate, { passive: true });

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

// v17 — documenti alimentati dall'archivio condiviso con il pannello di gestione
(() => {
  const library = document.querySelector('.document-library');
  if (!library) return;

  const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const audienceLabels = audience => audience === 'primaria'
    ? '<span class="doc-audience doc-audience-primaria">Primaria</span>'
    : audience === 'secondaria'
      ? '<span class="doc-audience doc-audience-secondaria">Secondaria</span>'
      : '<span class="doc-audience doc-audience-primaria">Primaria</span><span class="doc-audience doc-audience-secondaria">Secondaria</span>';
  const metaHtml = value => String(value || '').split('•').map(part => escapeHtml(part.trim())).filter(Boolean).join('<span>•</span>');

  fetch('/data/documenti.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Elenco documenti non disponibile');
      return response.json();
    })
    .then(data => {
      const documents = (Array.isArray(data.items) ? data.items : []).filter(document => document.active);
      ['libri', 'regolamenti', 'benessere', 'privacy'].forEach(category => {
        const section = document.querySelector(`[data-document-section]#${category}`);
        if (!section) return;
        const items = documents
          .filter(document => document.category === category)
          .sort((a, b) => a.title.localeCompare(b.title, 'it'));
        const count = section.querySelector('.document-section-head .eyebrow');
        if (count) count.textContent = `${items.length} ${items.length === 1 ? 'documento' : 'documenti'}`;
        const list = section.querySelector('.document-list');
        if (!list) return;
        list.innerHTML = items.map(document => `<article class="doc-item" data-document data-audience="${escapeHtml(document.audience)}" data-category="${escapeHtml(document.category)}" data-search="${escapeHtml(`${document.title} ${document.description || ''}`.toLocaleLowerCase('it'))}">
          <div class="doc-icon" aria-hidden="true"><span>PDF</span></div>
          <div class="doc-copy"><div class="doc-labels">${audienceLabels(document.audience)}</div><h3>${escapeHtml(document.title)}</h3><p>${escapeHtml(document.description || '')}</p>${document.meta ? `<div class="doc-meta">${metaHtml(document.meta)}</div>` : ''}</div>
          <div class="doc-actions"><a class="doc-open" href="${escapeHtml(document.file)}" target="_blank" rel="noopener">Apri PDF <span aria-hidden="true">↗</span></a><a class="doc-download" href="${escapeHtml(document.file)}" download>Scarica <span aria-hidden="true">↓</span></a></div>
        </article>`).join('');
      });
      const summary = document.querySelector('.document-summary strong');
      if (summary) summary.textContent = String(documents.length);
      window.dispatchEvent(new CustomEvent('documents:updated'));
    })
    .catch(() => {
      // Mantiene i documenti presenti nell'HTML come ripiego in caso di rete assente.
    });
})();


// v17 — Filtri e ricerca dell’Area famiglie
(() => {
  if (!document.querySelector('[data-document-results]')) return;
  const buttons = [...document.querySelectorAll('[data-audience-filter]')];
  const search = document.querySelector('[data-document-search]');
  const sections = [...document.querySelectorAll('[data-document-section]')];
  const result = document.querySelector('[data-document-results]');
  const empty = document.querySelector('[data-document-empty]');
  let audience = 'all';
  const params = new URLSearchParams(location.search);
  const requested = params.get('scuola');
  if (requested === 'primaria' || requested === 'secondaria') audience = requested;

  function update() {
    const cards = [...document.querySelectorAll('[data-document]')];
    const term = (search?.value || '').trim().toLocaleLowerCase('it');
    let visible = 0;
    cards.forEach(card => {
      const cardAudience = card.dataset.audience;
      const audienceMatch = audience === 'all' || cardAudience === audience || cardAudience === 'comune';
      const searchMatch = !term || card.dataset.search.includes(term);
      card.hidden = !(audienceMatch && searchMatch);
      if (!card.hidden) visible++;
    });
    document.querySelectorAll('[data-notice]').forEach(card => {
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
  window.addEventListener('notices:updated', update);
  window.addEventListener('documents:updated', update);
  update();
})();

// v16 — avvisi alimentati dall'archivio condiviso con il pannello di gestione
(() => {
  const list = document.querySelector('[data-public-notice-list]');
  if (!list) return;

  const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dateParts = value => {
    const date = new Date(`${value}T12:00:00`);
    return {
      day: new Intl.DateTimeFormat('it-IT', { day: '2-digit' }).format(date),
      month: new Intl.DateTimeFormat('it-IT', { month: 'short', year: 'numeric' }).format(date).replace('.', '')
    };
  };
  const labels = audience => audience === 'primaria'
    ? '<span class="doc-audience doc-audience-primaria">Primaria</span>'
    : audience === 'secondaria'
      ? '<span class="doc-audience doc-audience-secondaria">Secondaria</span>'
      : '<span class="doc-audience doc-audience-primaria">Primaria</span><span class="doc-audience doc-audience-secondaria">Secondaria</span>';

  fetch('/data/avvisi.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Elenco avvisi non disponibile');
      return response.json();
    })
    .then(data => {
      const notices = (Array.isArray(data.items) ? data.items : [])
        .filter(notice => notice.active)
        .sort((a, b) => b.date.localeCompare(a.date));
      list.innerHTML = notices.map(notice => {
        const date = dateParts(notice.date);
        return `<article class="notice-card" data-notice data-audience="${escapeHtml(notice.audience)}">
          <div class="notice-date" aria-label="Pubblicato il ${escapeHtml(notice.date)}"><strong>${date.day}</strong><span>${date.month}</span></div>
          <div class="notice-copy"><div class="doc-labels">${labels(notice.audience)}</div><h3>${escapeHtml(notice.title)}</h3><p>${escapeHtml(notice.description || '')}</p></div>
          <div class="doc-actions"><a class="doc-open" href="${escapeHtml(notice.file)}" target="_blank" rel="noopener">Apri PDF <span aria-hidden="true">↗</span></a><a class="doc-download" href="${escapeHtml(notice.file)}" download>Scarica <span aria-hidden="true">↓</span></a></div>
        </article>`;
      }).join('');
      window.dispatchEvent(new CustomEvent('notices:updated'));
    })
    .catch(() => {
      // Mantiene l'avviso presente nell'HTML come ripiego in caso di rete assente.
    });
})();
