# Motore di gestione dell’Area famiglie

Questo progetto Google Apps Script riceve le operazioni dalla pagina Gestione Area famiglie e crea un unico commit su GitHub contenente il PDF e l’elenco aggiornato. Gestisce sia gli avvisi sia i documenti: pubblicazione, modifica dei dati, sostituzione del PDF, sospensione e cancellazione.

Proprietà riservate richieste:

- `GITHUB_TOKEN`: credenziale fine-grained limitata al repository e ai Contents in scrittura.
- `GITHUB_REPOSITORY`: `matteodelfabbro/sito-collegio-dimesse`.
- `GITHUB_BRANCH`: inizialmente `refactor`.
- `ALLOWED_USERS`: indirizzi Google autorizzati separati da virgola.

Il deployment deve essere una Web app, eseguita come proprietario e accessibile soltanto agli utenti del dominio `collegiodimesse.org`.
