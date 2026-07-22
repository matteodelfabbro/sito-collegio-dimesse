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
