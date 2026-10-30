/* Statistiche di visita (Google Analytics 4), caricate solo dopo il consenso.
   Prima della scelta non viene caricato nulla da Google e non viene scritto alcun cookie. */
(function () {
  var ID = ''; // ID di misurazione GA4 (G-XXXXXXXXXX): finché è vuoto il sito non misura nulla
  var CHIAVE = 'consenso-statistiche';
  var DURATA = 180 * 24 * 3600 * 1000; // la scelta vale 6 mesi, poi si richiede
  var host = location.hostname;
  var ufficiale = /(^|\.)collegiodimesse\.org$/.test(host);
  var anteprima = /--[a-z0-9-]+\.web\.app$/.test(host) || host === 'localhost';
  if (!ID && !anteprima) return;

  function leggi() {
    try {
      var s = JSON.parse(localStorage.getItem(CHIAVE) || 'null');
      if (s && Date.now() - s.t < DURATA) return s.v;
    } catch (e) {}
    return null;
  }

  function salva(v) {
    try { localStorage.setItem(CHIAVE, JSON.stringify({ v: v, t: Date.now() })); } catch (e) {}
  }

  function carica() {
    if (!ID || !ufficiale || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('config', ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }

  function cancellaCookie() {
    document.cookie.split(';').forEach(function (c) {
      var nome = c.split('=')[0].trim();
      if (!/^_ga/.test(nome)) return;
      [host, '.' + host.replace(/^www\./, '')].forEach(function (d) {
        document.cookie = nome + '=; Max-Age=0; path=/; domain=' + d;
      });
      document.cookie = nome + '=; Max-Age=0; path=/';
    });
  }

  var css = '.cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;max-width:620px;margin:0 auto;padding:20px 22px;border-radius:18px;background:#fff;color:var(--ink,#202b3d);box-shadow:0 18px 48px rgba(16,39,70,.22);font-size:.82rem;line-height:1.5}' +
    '.cookie-banner p{margin:0 0 14px}.cookie-banner strong{display:block;margin-bottom:4px;font-size:.9rem}.cookie-banner a{color:var(--blue,#2b5f9f);text-decoration:underline}' +
    '.cookie-banner-azioni{display:flex;gap:10px;flex-wrap:wrap}.cookie-banner-azioni .btn{flex:1 1 140px;min-height:44px;cursor:pointer;font:inherit;font-weight:700}' +
    '.cookie-prefs{padding:0;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}';

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function banner() {
    if (document.querySelector('.cookie-banner')) return;
    var b = document.createElement('div');
    b.className = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Statistiche di visita');
    b.innerHTML = '<p><strong>Statistiche di visita</strong>Con il tuo consenso usiamo Google Analytics per contare in forma aggregata le visite al sito e capire quali pagine sono più utili. Nessuna pubblicità, nessuna profilazione. <a href="/cookie">Maggiori informazioni</a>.</p>' +
      '<div class="cookie-banner-azioni"><button type="button" class="btn btn-ghost" data-scelta="no">Rifiuta</button><button type="button" class="btn btn-ghost" data-scelta="si">Accetta</button></div>';
    b.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-scelta');
      if (!v) return;
      var prima = leggi();
      salva(v);
      b.remove();
      if (v === 'si') carica();
      else if (prima === 'si') { cancellaCookie(); location.reload(); }
    });
    document.body.appendChild(b);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-cookie-prefs]');
    if (t) { e.preventDefault(); banner(); }
  });

  var scelta = leggi();
  if (scelta === 'si') carica();
  else if (scelta === null) banner();
})();
