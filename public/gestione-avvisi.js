(() => {
  const config = window.AVVISI_ADMIN_CONFIG || { endpoint: '', mode: 'draft' };
  const form = document.querySelector('[data-content-form]');
  const dropzone = document.querySelector('[data-dropzone]');
  const input = document.querySelector('#notice-pdf');
  const fileTitle = document.querySelector('[data-file-title]');
  const fileDetail = document.querySelector('[data-file-detail]');
  const status = document.querySelector('[data-form-status]');
  const list = document.querySelector('[data-admin-list]');
  const search = document.querySelector('[data-admin-search]');
  const empty = document.querySelector('[data-admin-empty]');
  const kindButtons = [...document.querySelectorAll('[data-admin-kind]')];
  const maxSize = 20 * 1024 * 1024;
  const collections = { notice: [], document: [] };
  let kind = 'notice';
  let mode = 'publish';
  let editingId = '';

  const labels = {
    notice: { singular: 'avviso', plural: 'Avvisi', title: 'Titolo dell’avviso', placeholder: 'Es. Orario primi giorni di scuola' },
    document: { singular: 'documento', plural: 'Documenti', title: 'Titolo del documento', placeholder: 'Es. Regolamento interno' }
  };
  const categoryLabels = {
    libri: 'Libri di testo',
    regolamenti: 'Regolamenti e documenti',
    benessere: 'Benessere e inclusione',
    privacy: 'Privacy e segnalazioni'
  };
  const publicOrigin = config.publicOrigin || 'https://www.collegiodimesse.org';

  const dateField = form?.querySelector('[name="date"]');
  if (dateField) dateField.value = new Date().toISOString().slice(0, 10);

  function showStatus(message, isError = false) {
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function setSubmitLabel() {
    const submitLabel = form?.querySelector('[data-submit-label]');
    if (!submitLabel) return;
    if (mode === 'update') submitLabel.textContent = 'Salva modifiche';
    else if (mode === 'replace') submitLabel.textContent = 'Sostituisci PDF';
    else submitLabel.textContent = `Pubblica ${labels[kind].singular}`;
  }

  function setBusy(busy) {
    form?.querySelectorAll('button,input,select,textarea').forEach(control => { control.disabled = busy; });
    if (busy) form.querySelector('[data-submit-label]').textContent = 'Salvataggio…';
    else setSubmitLabel();
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
    fileDetail.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · pronto per il salvataggio`;
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
    const filtered = collections[kind].filter(item => !term || `${item.title} ${item.description || ''} ${audienceLabel(item.audience)} ${categoryLabels[item.category] || ''}`.toLocaleLowerCase('it').includes(term));
    const ordered = [...filtered].sort(kind === 'notice'
      ? (a, b) => b.date.localeCompare(a.date)
      : (a, b) => `${a.category}-${a.title}`.localeCompare(`${b.category}-${b.title}`, 'it'));
    list.innerHTML = '';
    ordered.forEach(item => {
      const article = document.createElement('article');
      article.className = 'admin-notice';
      article.dataset.adminContent = '';
      article.dataset.id = item.id;
      const detail = kind === 'notice'
        ? `Pubblicato il ${formatDate(item.date)}`
        : `${categoryLabels[item.category] || 'Documenti'}${item.meta ? ` · ${item.meta}` : ''}`;
      article.innerHTML = `<div class="admin-notice-pdf" aria-hidden="true">PDF</div>
        <div class="admin-notice-copy"><div><span class="admin-state ${item.active ? 'is-live' : 'is-hidden'}">${item.active ? 'Pubblicato' : 'Nascosto'}</span><span class="admin-audience">${escapeHtml(audienceLabel(item.audience))}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(detail)}</p></div>
        <div class="admin-notice-actions"><button type="button" data-action="copy">Copia link</button><button type="button" data-action="edit">Modifica</button><button type="button" data-action="replace">Sostituisci PDF</button><button type="button" data-action="hide">${item.active ? 'Nascondi' : 'Ripubblica'}</button><button class="is-danger" type="button" data-action="delete">Elimina</button></div>`;
      list.append(article);
    });
    if (empty) empty.hidden = ordered.length !== 0;
  }

  function updateKindUi() {
    const current = labels[kind];
    kindButtons.forEach(button => {
      const active = button.dataset.adminKind === kind;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('[data-compose-title]').textContent = mode === 'publish' ? `Nuovo ${current.singular}` : `${mode === 'replace' ? 'Sostituisci' : 'Modifica'} ${current.singular}`;
    document.querySelector('[data-title-label]').textContent = current.title;
    form.elements.title.placeholder = current.placeholder;
    document.querySelector('[data-list-title]').textContent = `${current.plural} pubblicati`;
    search.placeholder = `Cerca ${kind === 'notice' ? 'un avviso' : 'un documento'}…`;
    document.querySelectorAll('[data-document-field]').forEach(field => { field.hidden = kind !== 'document'; });
    document.querySelectorAll('[data-notice-field]').forEach(field => { field.hidden = kind !== 'notice'; });
    form.elements.category.required = kind === 'document';
    form.elements.date.required = kind === 'notice';
    input.required = mode !== 'update';
    dropzone.hidden = mode === 'update';
    setSubmitLabel();
    render();
  }

  async function loadCollections() {
    try {
      const [noticesResponse, documentsResponse] = await Promise.all([
        fetch('/data/avvisi.json', { cache: 'no-store' }),
        fetch('/data/documenti.json', { cache: 'no-store' })
      ]);
      if (!noticesResponse.ok || !documentsResponse.ok) throw new Error('Elenco non disponibile');
      const [noticesData, documentsData] = await Promise.all([noticesResponse.json(), documentsResponse.json()]);
      collections.notice = Array.isArray(noticesData.items) ? noticesData.items : [];
      collections.document = Array.isArray(documentsData.items) ? documentsData.items : [];
      render();
    } catch (error) {
      showStatus('Non riesco a caricare i contenuti attuali. Riprova tra poco.', true);
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
    publisherWindow.document.title = 'Salvataggio Area famiglie';
    publisherWindow.document.body.innerHTML = '<p style="font:16px system-ui;padding:32px">Preparazione del salvataggio…</p>';
    return publisherWindow;
  }

  function callPublisher(action, payload, publisherWindow) {
    if (!config.endpoint) return Promise.reject(new Error('Il collegamento protetto non è ancora configurato.'));
    return new Promise((resolve, reject) => {
      const requestId = `contenuto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
        if (!message.result?.ok) finish(new Error(message.result?.error || 'Salvataggio non riuscito'));
        else finish(null, message.result);
      }

      window.addEventListener('message', receive);
      addField('requestId', requestId);
      addField('request', JSON.stringify({ kind, action, payload }));
      document.body.append(transport);
      transport.submit();
    });
  }

  function resetForm() {
    form.reset();
    if (dateField) dateField.value = new Date().toISOString().slice(0, 10);
    mode = 'publish';
    editingId = '';
    dropzone.classList.remove('has-file');
    dropzone.hidden = false;
    fileTitle.textContent = 'Trascina qui il PDF';
    fileDetail.textContent = 'oppure premi per sceglierlo dal dispositivo';
    updateKindUi();
  }

  function fillForm(item) {
    form.elements.title.value = item.title;
    form.elements.description.value = item.description || '';
    form.elements.audience.value = item.audience;
    if (kind === 'notice') form.elements.date.value = item.date;
    if (kind === 'document') {
      form.elements.category.value = item.category;
      form.elements.meta.value = item.meta || '';
    }
  }

  kindButtons.forEach(button => button.addEventListener('click', () => {
    kind = button.dataset.adminKind;
    if (search) search.value = '';
    resetForm();
    status.hidden = true;
  }));

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const file = input.files[0];
    const needsPdf = mode === 'publish' || mode === 'replace';
    if (needsPdf && !file) { showStatus('Prima scegli il PDF da pubblicare.', true); dropzone.focus(); return; }
    const data = new FormData(form);
    let publisherWindow;
    try {
      publisherWindow = openPublisherWindow();
      setBusy(true);
      const payload = {
        id: editingId || undefined,
        title: String(data.get('title')).trim(),
        description: String(data.get('description')).trim(),
        audience: String(data.get('audience')),
        date: String(data.get('date') || ''),
        category: String(data.get('category') || ''),
        meta: String(data.get('meta') || ''),
        fileName: file?.name || ''
      };
      if (needsPdf) payload.pdfBase64 = await fileAsBase64(file);
      const result = await callPublisher(mode, payload, publisherWindow);
      collections[kind] = result.items;
      const completedMode = mode;
      resetForm();
      showStatus(completedMode === 'publish'
        ? `${labels[kind].singular[0].toUpperCase()}${labels[kind].singular.slice(1)} pubblicato. Link diretto: ${result.url}`
        : 'Modifiche salvate.');
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
    const item = collections[kind].find(entry => entry.id === button.closest('[data-admin-content]').dataset.id);
    if (!item) return;
    const action = button.dataset.action;
    if (action === 'copy') {
      const publicUrl = new URL(item.file, publicOrigin).href;
      await navigator.clipboard.writeText(publicUrl);
      showStatus(`Link copiato: ${publicUrl}`);
      return;
    }
    if (action === 'edit' || action === 'replace') {
      editingId = item.id;
      mode = action === 'edit' ? 'update' : 'replace';
      fillForm(item);
      updateKindUi();
      showStatus(action === 'edit' ? `Modifica i dati di “${item.title}”.` : `Scegli il nuovo PDF per “${item.title}”.`);
      if (action === 'replace') dropzone.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'delete' && !confirm(`Eliminare definitivamente “${item.title}”?`)) return;
    let publisherWindow;
    try {
      publisherWindow = openPublisherWindow();
      button.disabled = true;
      const result = await callPublisher(action, { id: item.id }, publisherWindow);
      collections[kind] = result.items;
      render();
      showStatus(action === 'delete' ? `${labels[kind].singular[0].toUpperCase()}${labels[kind].singular.slice(1)} eliminato.` : (item.active ? 'Contenuto nascosto.' : 'Contenuto ripubblicato.'));
    } catch (error) {
      if (publisherWindow && !publisherWindow.closed) publisherWindow.close();
      showStatus(error.message, true);
      button.disabled = false;
    }
  });

  search?.addEventListener('input', render);
  updateKindUi();
  loadCollections();
})();
