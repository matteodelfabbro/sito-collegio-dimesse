# Motore di pubblicazione degli avvisi

Questo progetto Google Apps Script riceve le operazioni dalla pagina Gestione avvisi e crea un unico commit su GitHub contenente il PDF e l'elenco aggiornato.

Proprietà riservate richieste:

- `GITHUB_TOKEN`: credenziale fine-grained limitata al repository e ai Contents in scrittura.
- `GITHUB_REPOSITORY`: `matteodelfabbro/sito-collegio-dimesse`.
- `GITHUB_BRANCH`: inizialmente `refactor`.
- `ALLOWED_USERS`: indirizzi Google autorizzati separati da virgola.

Il deployment deve essere una Web app, eseguita come proprietario e accessibile soltanto agli utenti del dominio `collegiodimesse.org`.
