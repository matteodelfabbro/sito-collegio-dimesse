(() => {
  const config = window.AVVISI_ADMIN_CONFIG || { endpoint: '', mode: 'draft' };
  const form = document.querySelector('[data-notice-form]');
  const dropzone = document.querySelector('[data-dropzone]');
  const input = document.querySelector('#notice-pdf');
  const fileTitle = document.querySelector('[data-file-title]');
  const fileDetail = document.querySelector('[data-file-detail]');
  const status = document.querySelector('[data-form-status]');
  const list = document.querySelector('[data-admin-list]');
  const search = document.querySelector('[data-admin-search]');
  const empty = document.querySelector('[data-admin-empty]');
  const maxSize = 20 * 1024 * 1024;
  let notices = [];
  let replacingId = '';

  const dateField = form?.querySelector('[name="date"]');
  if (dateField) dateField.value = new Date().toISOString().slice(0, 10);

  function showStatus(message, isError = false) {
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function setBusy(busy) {
    form?.querySelectorAll('button,input,select,textarea').forEach(control => { control.disabled = busy; });
    const publish = form?.querySelector('.admin-publish');
    if (publish) publish.firstChild.textContent = busy ? 'Pubblicazione… ' : (replacingId ? 'Sostituisci PDF ' : 'Pubblica avviso ');
  }

  function setFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      input.value = '';
      showStatus('Il file scelto non è un PDF.', true);
      return;
    }
    if (file.size > maxSize) {
      input.value = '';
      showStatus('Il PDF supera il limite di 20 MB.', true);
      return;
    }
    dropzone.classList.add('has-file');
    fileTitle.textContent = file.name;
    fileDetail.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · pronto per la pubblicazione`;
    status.hidden = true;
  }

  dropzone?.addEventListener('click', () => input.click());
  dropzone?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); }
  });
  input?.addEventListener('change', () => setFile(input.files[0]));
  ['dragenter', 'dragover'].forEach(type => dropzone?.addEventListener(type, event => {
    event.preventDefault(); dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach(type => dropzone?.addEventListener(type, event => {
    event.preventDefault(); dropzone.classList.remove('is-dragging');
  }));
  dropzone?.addEventListener('drop', event => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    setFile(file);
  });

  function formatDate(value) {
    return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  }

  function audienceLabel(value) {
    return { comune: 'Primaria e Secondaria', primaria: 'Primaria', secondaria: 'Secondaria' }[value] || value;
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    if (!list) return;
    const term = (search?.value || '').trim().toLocaleLowerCase('it');
    const filtered = notices.filter(notice => !term || `${notice.title} ${notice.description || ''} ${audienceLabel(notice.audience)}`.toLocaleLowerCase('it').includes(term));
    list.innerHTML = '';
    filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(notice => {
      const article = document.createElement('article');
      article.className = 'admin-notice';
      article.dataset.adminNotice = '';
      article.dataset.id = notice.id;
      article.innerHTML = `<div class="admin-notice-pdf" aria-hidden="true">PDF</div>
        <div class="admin-notice-copy"><div><span class="admin-state ${notice.active ? 'is-live' : 'is-hidden'}">${notice.active ? 'Pubblicato' : 'Nascosto'}</span><span class="admin-audience">${escapeHtml(audienceLabel(notice.audience))}</span></div><h3>${escapeHtml(notice.title)}</h3><p>Pubblicato il ${formatDate(notice.date)}</p></div>
        <div class="admin-notice-actions"><button type="button" data-action="copy">Copia link</button><button type="button" data-action="replace">Sostituisci</button><button type="button" data-action="hide">${notice.active ? 'Nascondi' : 'Ripubblica'}</button><button class="is-danger" type="button" data-action="delete">Elimina</button></div>`;
      list.append(article);
    });
    if (empty) empty.hidden = filtered.length !== 0;
  }

  async function loadNotices() {
    try {
      const response = await fetch('/data/avvisi.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Elenco non disponibile');
      const data = await response.json();
      notices = Array.isArray(data.items) ? data.items : [];
      render();
    } catch (error) {
      showStatus('Non riesco a caricare gli avvisi attuali. Riprova tra poco.', true);
    }
  }

  function fileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Lettura del PDF non riuscita'));
      reader.readAsDataURL(file);
    });
  }

  function openPublisherWindow() {
    const publisherWindow = window.open('', 'dimesse-avvisi-publisher', 'popup=yes,width=620,height=420');
    if (!publisherWindow) throw new Error('Safari ha bloccato la finestra protetta. Consenti i popup per questa pagina e riprova.');
    publisherWindow.document.title = 'Pubblicazione avviso';
    publisherWindow.document.body.innerHTML = '<p style="font:16px system-ui;padding:32px">Preparazione della pubblicazione…</p>';
    return publisherWindow;
  }

  function callPublisher(action, payload, publisherWindow) {
    if (!config.endpoint) return Promise.reject(new Error('Il collegamento protetto non è ancora configurato.'));
    return new Promise((resolve, reject) => {
      const requestId = `avviso-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const transport = document.createElement('form');
      const timeout = window.setTimeout(() => finish(new Error('Il servizio non ha risposto. Verifica di aver effettuato l’accesso con l’account Google autorizzato.')), 90000);

      publisherWindow.name = requestId;
      transport.method = 'post';
      transport.action = config.endpoint;
      transport.target = requestId;
      transport.hidden = true;

      function addField(name, value) {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = value;
        transport.append(field);
      }

      function finish(error, result) {
        window.clearTimeout(timeout);
        window.removeEventListener('message', receive);
        transport.remove();
        if (!publisherWindow.closed) publisherWindow.close();
        if (error) reject(error); else resolve(result);
      }

      function receive(event) {
        const message = event.data;
        if (!message || message.source !== 'dimesse-avvisi' || message.requestId !== requestId) return;
        if (!message.result?.ok) finish(new Error(message.result?.error || 'Pubblicazione non riuscita'));
        else finish(null, message.result);
      }

      window.addEventListener('message', receive);
      addField('requestId', requestId);
      addField('request', JSON.stringify({ action, payload }));
      document.body.append(transport);
      transport.submit();
    });
  }

  function resetForm() {
    form.reset();
    dateField.value = new Date().toISOString().slice(0, 10);
    replacingId = '';
    dropzone.classList.remove('has-file');
    fileTitle.textContent = 'Trascina qui il PDF';
    fileDetail.textContent = 'oppure premi per sceglierlo dal dispositivo';
    form.querySelector('.admin-publish').firstChild.textContent = 'Pubblica avviso ';
  }

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const file = input.files[0];
    if (!file) { showStatus('Prima scegli il PDF da pubblicare.', true); dropzone.focus(); return; }
    const data = new FormData(form);
    let publisherWindow;
    try {
      publisherWindow = openPublisherWindow();
      setBusy(true);
      const result = await callPublisher(replacingId ? 'replace' : 'publish', {
        id: replacingId || undefined,
        title: String(data.get('title')).trim(),
        description: String(data.get('description')).trim(),
        audience: String(data.get('audience')),
        date: String(data.get('date')),
        fileName: file.name,
        pdfBase64: await fileAsBase64(file)
      }, publisherWindow);
      notices = result.items;
      render();
      resetForm();
      showStatus(`Avviso pubblicato. Link diretto: ${result.url}`);
    } catch (error) {
      if (publisherWindow && !publisherWindow.closed) publisherWindow.close();
      showStatus(error.message, true);
    } finally {
      setBusy(false);
    }
  });

  list?.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const notice = notices.find(item => item.id === button.closest('[data-admin-notice]').dataset.id);
    if (!notice) return;
    const action = button.dataset.action;
    if (action === 'copy') {
      await navigator.clipboard.writeText(new URL(notice.file, location.origin).href);
      showStatus(`Link copiato: ${new URL(notice.file, location.origin).href}`);
      return;
    }
    if (action === 'replace') {
      replacingId = notice.id;
      form.elements.title.value = notice.title;
      form.elements.description.value = notice.description || '';
      form.elements.audience.value = notice.audience;
      form.elements.date.value = notice.date;
      form.querySelector('.admin-publish').firstChild.textContent = 'Sostituisci PDF ';
      showStatus(`Scegli il nuovo PDF per “${notice.title}”.`);
      dropzone.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'delete' && !confirm(`Eliminare definitivamente “${notice.title}”?`)) return;
    let publisherWindow;
    try {
      publisherWindow = openPublisherWindow();
      button.disabled = true;
      const result = await callPublisher(action, { id: notice.id }, publisherWindow);
      notices = result.items;
      render();
      showStatus(action === 'delete' ? 'Avviso eliminato.' : (notice.active ? 'Avviso nascosto.' : 'Avviso ripubblicato.'));
    } catch (error) {
      if (publisherWindow && !publisherWindow.closed) publisherWindow.close();
      showStatus(error.message, true);
      button.disabled = false;
    }
  });

  search?.addEventListener('input', render);
  loadNotices();
})();
