# Sito Collegio Dimesse

Sito istituzionale statico del Collegio Dimesse di Udine, pubblicato tramite Firebase Hosting.

**Sito online:** [https://sito-scuola-1e42f.web.app/](https://sito-scuola-1e42f.web.app/)

> **Stato:** versione pronta per la pubblicazione sul dominio ufficiale.

## Contenuti principali

- presentazione del Collegio e dei suoi spazi;
- pagine dedicate alla Scuola Primaria e alla Scuola Secondaria di primo grado;
- informazioni sul convitto universitario;
- Area famiglie con avvisi, modulistica e documenti scaricabili;
- pagina dei contatti e pagina personalizzata per gli errori 404;
- metadati SEO, Open Graph, sitemap, file `robots.txt` e icone per browser e dispositivi mobili.

## Tecnologie e funzionamento

Il progetto usa HTML, CSS e JavaScript senza un processo di compilazione. Firebase Hosting pubblica direttamente il contenuto della cartella `public/` e gestisce URL puliti, redirect e intestazioni di cache tramite `firebase.json`.

## Struttura del progetto

| Percorso | Contenuto |
| --- | --- |
| `public/` | Pagine HTML, fogli di stile, JavaScript, icone e file SEO pubblicati online |
| `public/assets/collegio/` | Immagini e loghi del sito |
| `public/documenti-files/` | Avvisi, modulistica e documenti PDF dell'Area famiglie |
| `docs/storico/` | Note storiche sulle revisioni effettuate |
| `firebase.json` | Configurazione di Hosting, cache e redirect |
| `.firebaserc` | Associazione al progetto Firebase `sito-scuola-1e42f` |

## Anteprima locale

### Prerequisiti

- [Node.js](https://nodejs.org/) 18 o successivo;
- [Firebase CLI](https://firebase.google.com/docs/cli).

Se Firebase CLI non è già disponibile:

```bash
npm install -g firebase-tools
firebase login
```

Dalla cartella principale del progetto, avviare l'emulatore di Hosting:

```bash
firebase serve --only hosting
```

Firebase mostrerà nel terminale l'indirizzo locale da aprire nel browser. L'emulatore è preferibile a un server statico generico perché rispetta gli URL puliti e i redirect definiti in `firebase.json`.

## Pubblicazione

Prima di pubblicare, verificare di aver selezionato il progetto corretto:

```bash
firebase use sito-scuola-1e42f
```

Per creare un canale temporaneo di anteprima:

```bash
firebase hosting:channel:deploy bozza --project sito-scuola-1e42f
```

Per pubblicare sul sito stabile:

```bash
firebase deploy --only hosting --project sito-scuola-1e42f
```

Se sul computer sono configurati più account Firebase, aggiungere `--account indirizzo@example.com` al comando scelto.

## Manutenzione dei contenuti

Quando si aggiornano pagine, documenti o immagini:

1. verificare i collegamenti interni e i pulsanti di apertura o download;
2. controllare il risultato su desktop e dispositivi mobili;
3. aggiornare avvisi e documenti relativi agli anni scolastici;
4. mantenere coerenti i riferimenti ai file versionati, come `styles-v28.css` e `script-v16.js`;
5. usare prima un canale di anteprima e pubblicare sul sito stabile solo dopo la verifica.

L'avviso attualmente presente nell'Area famiglie si trova nella sezione `#avvisi` di `public/documenti.html`. I file associati sono conservati in `public/documenti-files/`.

## Dominio e indicizzazione

I collegamenti canonici, le immagini Open Graph, `robots.txt` e `sitemap.xml` usano il dominio definitivo previsto `https://www.collegiodimesse.org/`. Il dominio Firebase indicato sopra resta l'indirizzo operativo della distribuzione corrente.
