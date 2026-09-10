const PUBLIC_ORIGIN = 'https://www.collegiodimesse.org';
const CONTENT_TYPES = {
  notice: { label: 'avviso', dataPath: 'public/data/avvisi.json', pdfDirectory: 'public/documenti-files/avvisi' },
  document: { label: 'documento', dataPath: 'public/data/documenti.json', pdfDirectory: 'public/documenti-files' }
};

function doGet() {
  assertAuthorized_();
  return HtmlService.createHtmlOutput('<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Gestione Area famiglie</title></head><body><p>Collegamento attivo. Puoi tornare alla pagina Gestione Area famiglie del sito.</p></body></html>');
}

function doPost(event) {
  const requestId = event.parameter.requestId || '';
  let result;
  try {
    assertAuthorized_();
    result = handleRequest_(JSON.parse(event.parameter.request || '{}'));
  } catch (error) {
    result = { ok: false, error: error.message || String(error) };
  }
  const message = JSON.stringify({ source: 'dimesse-avvisi', requestId: requestId, result: result })
    .replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
  return HtmlService.createHtmlOutput(`<script>
    const receiver = window.top.opener && !window.top.opener.closed ? window.top.opener : window.parent;
    receiver.postMessage(${message}, '*');
    window.setTimeout(() => window.top.close(), 300);
  </script><p>Operazione completata. Questa finestra si chiuderà automaticamente.</p>`);
}

function handleRequest_(request) {
  const kind = String(request.kind || 'notice');
  const content = CONTENT_TYPES[kind];
  const action = String(request.action || '');
  const payload = request.payload || {};
  if (!content) throw new Error('Tipo di contenuto non riconosciuto.');
  if (!['publish', 'update', 'replace', 'hide', 'delete'].includes(action)) throw new Error('Operazione non riconosciuta.');

  const state = readRepositoryState_(content);
  const data = state.data;
  const items = Array.isArray(data.items) ? data.items : [];
  const changes = [];
  let publicUrl = '';
  let changedItem = null;

  if (action === 'publish') {
    validatePayload_(kind, payload, true);
    const idSource = kind === 'notice' ? `${payload.date}-${payload.title}` : payload.title;
    const id = uniqueId_(slugify_(idSource), items);
    const filePath = `${content.pdfDirectory}/${id}.pdf`;
    changedItem = buildItem_(kind, payload, id, `/${filePath.replace(/^public\//, '')}`);
    changes.push({ path: filePath, content: payload.pdfBase64, encoding: 'base64' });
    items.push(changedItem);
    publicUrl = PUBLIC_ORIGIN + changedItem.file;
  }

  if (action === 'update' || action === 'replace') {
    validatePayload_(kind, payload, action === 'replace');
    changedItem = findItem_(items, payload.id, content.label);
    updateItem_(kind, changedItem, payload);
    changedItem.active = true;
    if (action === 'replace') changes.push({ path: repositoryPdfPath_(changedItem.file), content: payload.pdfBase64, encoding: 'base64' });
    publicUrl = PUBLIC_ORIGIN + changedItem.file;
  }

  if (action === 'hide') {
    changedItem = findItem_(items, payload.id, content.label);
    changedItem.active = !changedItem.active;
    publicUrl = PUBLIC_ORIGIN + changedItem.file;
  }

  if (action === 'delete') {
    const index = items.findIndex(item => item.id === payload.id);
    if (index < 0) throw new Error(`${capitalize_(content.label)} non trovato.`);
    changedItem = items[index];
    changes.push({ path: repositoryPdfPath_(changedItem.file), delete: true });
    items.splice(index, 1);
  }

  data.version = Number(data.version || 0) + 1;
  data.updatedAt = new Date().toISOString();
  data.items = items;
  changes.push({ path: content.dataPath, content: Utilities.base64Encode(JSON.stringify(data, null, 2) + '\n', Utilities.Charset.UTF_8), encoding: 'base64' });
  commitChanges_(state, changes, commitMessage_(content.label, action, payload, changedItem));
  return { ok: true, items: items, url: publicUrl };
}

function buildItem_(kind, payload, id, file) {
  const item = { id: id, title: '', description: '', audience: '', file: file, active: true };
  updateItem_(kind, item, payload);
  return item;
}

function updateItem_(kind, item, payload) {
  item.title = cleanText_(payload.title, 120);
  item.description = cleanText_(payload.description || '', 240);
  item.audience = payload.audience;
  if (kind === 'notice') item.date = payload.date;
  else {
    item.category = payload.category;
    item.meta = cleanText_(payload.meta || '', 120);
  }
}

function validatePayload_(kind, payload, requirePdf) {
  if (!cleanText_(payload.title || '', 120)) throw new Error('Inserisci il titolo.');
  if (!['comune', 'primaria', 'secondaria'].includes(payload.audience)) throw new Error('Destinatari non validi.');
  if (kind === 'notice' && !/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ''))) throw new Error('Data non valida.');
  if (kind === 'document' && !['libri', 'regolamenti', 'benessere', 'privacy'].includes(payload.category)) throw new Error('Categoria non valida.');
  if (requirePdf && !payload.pdfBase64) throw new Error('PDF mancante.');
  if (requirePdf && Utilities.base64Decode(payload.pdfBase64).length > 20 * 1024 * 1024) throw new Error('Il PDF supera 20 MB.');
}

function assertAuthorized_() {
  const properties = PropertiesService.getScriptProperties();
  const allowed = String(properties.getProperty('ALLOWED_USERS') || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email || !allowed.includes(email)) throw new Error('Account Google non autorizzato.');
}

function repositoryConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty('GITHUB_TOKEN');
  const repository = properties.getProperty('GITHUB_REPOSITORY') || 'matteodelfabbro/sito-collegio-dimesse';
  const branch = properties.getProperty('GITHUB_BRANCH') || 'refactor';
  if (!token) throw new Error('Credenziale GitHub non configurata.');
  return { token: token, repository: repository, branch: branch };
}

function github_(config, path, options) {
  const response = UrlFetchApp.fetch(`https://api.github.com/repos/${config.repository}${path}`, {
    method: options && options.method ? options.method : 'get',
    contentType: 'application/json',
    payload: options && options.payload ? JSON.stringify(options.payload) : undefined,
    headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) {
    let detail = body;
    try { detail = JSON.parse(body).message || body; } catch (_) {}
    throw new Error(`GitHub: ${detail}`);
  }
  return body ? JSON.parse(body) : {};
}

function readRepositoryState_(content) {
  const config = repositoryConfig_();
  const ref = github_(config, `/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const commit = github_(config, `/git/commits/${ref.object.sha}`);
  const file = github_(config, `/contents/${content.dataPath}?ref=${encodeURIComponent(config.branch)}`);
  const text = Utilities.newBlob(Utilities.base64Decode(String(file.content).replace(/\s/g, ''))).getDataAsString('UTF-8');
  return { config: config, headSha: ref.object.sha, treeSha: commit.tree.sha, data: JSON.parse(text) };
}

function commitChanges_(state, changes, message) {
  const tree = changes.map(change => {
    if (change.delete) return { path: change.path, mode: '100644', type: 'blob', sha: null };
    const blob = github_(state.config, '/git/blobs', { method: 'post', payload: { content: change.content, encoding: change.encoding } });
    return { path: change.path, mode: '100644', type: 'blob', sha: blob.sha };
  });
  const newTree = github_(state.config, '/git/trees', { method: 'post', payload: { base_tree: state.treeSha, tree: tree } });
  const commit = github_(state.config, '/git/commits', { method: 'post', payload: { message: message, tree: newTree.sha, parents: [state.headSha] } });
  github_(state.config, `/git/refs/heads/${encodeURIComponent(state.config.branch)}`, { method: 'patch', payload: { sha: commit.sha, force: false } });
}

function repositoryPdfPath_(publicPath) {
  const path = `public${String(publicPath || '')}`;
  if (!/^public\/documenti-files\/[a-zA-Z0-9_./-]+\.pdf$/.test(path)) throw new Error('Percorso del PDF non valido.');
  return path;
}

function findItem_(items, id, label) {
  const item = items.find(entry => entry.id === id);
  if (!item) throw new Error(`${capitalize_(label)} non trovato.`);
  return item;
}

function cleanText_(value, maxLength) {
  return String(value).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function slugify_(value) {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90) || 'contenuto';
}

function uniqueId_(base, items) {
  let id = base;
  let number = 2;
  while (items.some(item => item.id === id)) id = `${base}-${number++}`;
  return id;
}

function capitalize_(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function commitMessage_(label, action, payload, item) {
  const verbs = { publish: 'Pubblica', update: 'Modifica', replace: 'Sostituisce PDF', hide: item && item.active ? 'Ripubblica' : 'Nasconde', delete: 'Elimina' };
  const subject = cleanText_(payload.title || (item && item.title) || payload.id || '', 70);
  return `${verbs[action]} ${label}: ${subject}`;
}
