const DATA_PATH = 'public/data/avvisi.json';
const PDF_DIRECTORY = 'public/documenti-files/avvisi';
const PUBLIC_ORIGIN = 'https://www.collegiodimesse.org';

function doGet() {
  assertAuthorized_();
  return HtmlService.createHtmlOutput('<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Gestione avvisi</title></head><body><p>Collegamento attivo. Puoi tornare alla pagina Gestione avvisi del sito.</p></body></html>');
}

function doPost(event) {
  const requestId = event.parameter.requestId || '';
  let result;
  try {
    assertAuthorized_();
    const request = JSON.parse(event.parameter.request || '{}');
    result = handleRequest_(request);
  } catch (error) {
    result = { ok: false, error: error.message || String(error) };
  }
  const message = JSON.stringify({ source: 'dimesse-avvisi', requestId: requestId, result: result })
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\u003e');
  return HtmlService.createHtmlOutput(`<script>window.parent.postMessage(${message}, '*');</script><p>Operazione completata. Puoi chiudere questa pagina.</p>`);
}

function handleRequest_(request) {
  const action = String(request.action || '');
  const payload = request.payload || {};
  if (!['publish', 'replace', 'hide', 'delete'].includes(action)) throw new Error('Operazione non riconosciuta.');

  const state = readRepositoryState_();
  const data = state.data;
  const items = Array.isArray(data.items) ? data.items : [];
  const changes = [];
  let publicUrl = '';

  if (action === 'publish') {
    validateNotice_(payload, true);
    const id = uniqueId_(slugify_(`${payload.date}-${payload.title}`), items);
    const filePath = `${PDF_DIRECTORY}/${id}.pdf`;
    changes.push({ path: filePath, content: payload.pdfBase64, encoding: 'base64' });
    items.push({
      id: id,
      title: cleanText_(payload.title, 120),
      description: cleanText_(payload.description || '', 240),
      date: payload.date,
      audience: payload.audience,
      file: `/${filePath.replace(/^public\//, '')}`,
      active: true
    });
    publicUrl = PUBLIC_ORIGIN + `/${filePath.replace(/^public\//, '')}`;
  }

  if (action === 'replace') {
    validateNotice_(payload, true);
    const notice = findNotice_(items, payload.id);
    notice.title = cleanText_(payload.title, 120);
    notice.description = cleanText_(payload.description || '', 240);
    notice.date = payload.date;
    notice.audience = payload.audience;
    notice.active = true;
    changes.push({ path: `public${notice.file}`, content: payload.pdfBase64, encoding: 'base64' });
    publicUrl = PUBLIC_ORIGIN + notice.file;
  }

  if (action === 'hide') {
    const notice = findNotice_(items, payload.id);
    notice.active = !notice.active;
    publicUrl = PUBLIC_ORIGIN + notice.file;
  }

  if (action === 'delete') {
    const index = items.findIndex(item => item.id === payload.id);
    if (index < 0) throw new Error('Avviso non trovato.');
    changes.push({ path: `public${items[index].file}`, delete: true });
    items.splice(index, 1);
  }

  data.version = Number(data.version || 0) + 1;
  data.updatedAt = new Date().toISOString();
  data.items = items;
  changes.push({ path: DATA_PATH, content: Utilities.base64Encode(JSON.stringify(data, null, 2) + '\n'), encoding: 'base64' });

  commitChanges_(state, changes, commitMessage_(action, payload, items));
  return { ok: true, items: items, url: publicUrl };
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
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
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

function readRepositoryState_() {
  const config = repositoryConfig_();
  const ref = github_(config, `/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const commit = github_(config, `/git/commits/${ref.object.sha}`);
  const file = github_(config, `/contents/${DATA_PATH}?ref=${encodeURIComponent(config.branch)}`);
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

function validateNotice_(payload, requirePdf) {
  if (!cleanText_(payload.title || '', 120)) throw new Error('Inserisci il titolo.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ''))) throw new Error('Data non valida.');
  if (!['comune', 'primaria', 'secondaria'].includes(payload.audience)) throw new Error('Destinatari non validi.');
  if (requirePdf && !payload.pdfBase64) throw new Error('PDF mancante.');
  if (requirePdf && Utilities.base64Decode(payload.pdfBase64).length > 20 * 1024 * 1024) throw new Error('Il PDF supera 20 MB.');
}

function findNotice_(items, id) {
  const notice = items.find(item => item.id === id);
  if (!notice) throw new Error('Avviso non trovato.');
  return notice;
}

function cleanText_(value, maxLength) {
  return String(value).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function slugify_(value) {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90) || 'avviso';
}

function uniqueId_(base, items) {
  let id = base;
  let number = 2;
  while (items.some(item => item.id === id)) id = `${base}-${number++}`;
  return id;
}

function commitMessage_(action, payload, items) {
  if (action === 'publish') return `Pubblica avviso: ${cleanText_(payload.title, 70)}`;
  if (action === 'replace') return `Aggiorna avviso: ${cleanText_(payload.title, 70)}`;
  const notice = items.find(item => item.id === payload.id);
  if (action === 'hide') return `${notice && notice.active ? 'Ripubblica' : 'Nascondi'} avviso: ${payload.id}`;
  return `Elimina avviso: ${payload.id}`;
}
