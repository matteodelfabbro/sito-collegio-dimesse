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

function closeMenu() {
  if (!header || !toggle) return;
  header.classList.remove('menu-open');
  document.body.classList.remove('menu-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Apri il menu');
}

if (header && toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = !header.classList.contains('menu-open');
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    if (open) nav.querySelector('a')?.focus();
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 850) closeMenu(); });
}

document.querySelectorAll('[data-carousel]').forEach(shell => {
  const track = shell.querySelector('.spaces-carousel');
  const prev = shell.querySelector('.carousel-prev');
  const next = shell.querySelector('.carousel-next');
  if (!track || !prev || !next) return;
  const step = () => Math.max(280, track.clientWidth * 0.72);
  const move = direction => track.scrollBy({ left: direction * step(), behavior: 'smooth' });
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


// v15 — Filtri e ricerca dell’archivio documenti
(() => {
  const cards = [...document.querySelectorAll('[data-document]')];
  if (!cards.length) return;
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
    const term = (search?.value || '').trim().toLocaleLowerCase('it');
    let visible = 0;
    cards.forEach(card => {
      const cardAudience = card.dataset.audience;
      const audienceMatch = audience === 'all' || cardAudience === audience || cardAudience === 'comune';
      const searchMatch = !term || card.dataset.search.includes(term);
      card.hidden = !(audienceMatch && searchMatch);
      if (!card.hidden) visible++;
    });
    sections.forEach(section => {
      section.hidden = !section.querySelector('[data-document]:not([hidden])');
    });
    buttons.forEach(button => button.classList.toggle('is-active', button.dataset.audienceFilter === audience));
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
