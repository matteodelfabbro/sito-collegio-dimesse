# Sito Collegio Dimesse

Versione pronta per Firebase Hosting, aggiornata il 22 luglio 2026 a partire dall'ultima cartella del progetto recuperata da Google Drive.

## Modifiche di questa revisione

- mantenute tutte le revisioni grafiche, informative e responsive già presenti;
- mantenute le icone con sfondo blu e logo bianco, mentre il logo ordinario resta nel sito;
- ampliata la pagina Primaria con una galleria dedicata agli spazi condivisi realmente pertinenti: aula informatica, aula di scienze, palestra, impianti esterni e auditorium;
- mantenuta l'Aula di Arte e Tecnologia soltanto nella pagina Secondaria;
- aggiornato il collegamento “Documenti e modulistica” della Primaria verso `/documenti?scuola=primaria`;
- aggiornato il collegamento “Documenti e modulistica” della Secondaria verso `/documenti?scuola=secondaria`;
- aggiunta una sezione locale “Avvisi” nell'Area famiglie con l'avviso “Inizio scuola — anno scolastico 2026/27”, disponibile per apertura e download;
- aggiornati i collegamenti “Avvisi” di Primaria e Secondaria verso la nuova sezione locale;
- verificata la presenza dei 19 documenti PDF dell'archivio e del PDF dell'avviso;
- aggiornato il foglio di stile attivo a `styles-v27.css` per evitare il recupero della versione precedente dalla cache.

## Collegamenti e contenuti da aggiornare nel tempo

Non restano collegamenti di navigazione ad Avvisi o Documenti sul vecchio sito. Il redirect `/scuola/avvisi` presente in `firebase.json` ora raggiunge una sezione locale reale.

L'Area famiglie contiene attualmente un solo avviso. I nuovi avvisi dovranno essere aggiunti alla sezione `#avvisi` e i documenti legati agli anni scolastici dovranno essere sostituiti quando verranno pubblicate le versioni aggiornate.

I collegamenti canonici e le immagini Open Graph che usano `https://www.collegiodimesse.org/...` non sono residui di navigazione: descrivono gli indirizzi definitivi previsti per i motori di ricerca e le condivisioni social.

## Pubblicazione

Anteprima:

```bash
firebase hosting:channel:deploy bozza --account delfabbro@collegiodimesse.org
```

Sito stabile Firebase:

```bash
firebase deploy --only hosting --account delfabbro@collegiodimesse.org
```
