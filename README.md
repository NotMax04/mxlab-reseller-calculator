# MXLAB Reseller Hub v2.3.2

App web installabile su iPhone per gestire il progetto MXLAB.

## Moduli

- Calcolatore prezzi multipiattaforma con formule ufficiali MXLAB
- Inventario operativo con workflow e registrazione vendite
- Storico di 117 vendite multipiattaforma importate da Google Sheets
- Dashboard con inventario corrente e storico separati
- Dati di lotti, fornitori, spese e checklist
- Esportazione CSV e backup JSON
- Funzionamento offline tramite PWA

## Novità v2.3

- Inserimento articolo diviso in tre passaggi stabili: Articolo, Acquisto e Vendita
- Intestazione e pulsanti di navigazione fissi durante l'uso della tastiera su iPhone
- Altezza dell'interfaccia sincronizzata con la viewport mobile per ridurre salti e spostamenti
- Rimozione della selezione manuale delle piattaforme di pubblicazione
- La piattaforma viene richiesta soltanto quando si registra la vendita
- Il target rappresenta sempre quanto si vuole ottenere, non il prezzo dell'annuncio
- Aggiornamento rapido del target con pulsanti di ribasso
- Ricalcolo immediato dei prezzi Vinted, eBay, Depop e Grailed
- Storico automatico dei target e dei ribassi per ogni articolo
- Memorizzazione dell'ultima piattaforma usata durante la registrazione di una vendita
- Sincronizzazione automatica dell'incasso netto per le piattaforme senza trattenute dirette
- Compatibilità con inventario e backup creati dalle versioni precedenti

## Importazione Google

I dati del 4 agosto 2026 sono inclusi in `seed-data.js`. Al primo avvio su un dispositivo senza dati, l'importazione viene eseguita automaticamente. In seguito può essere ripetuta dalla sezione **Dati > Google Sheets** senza creare duplicati.

## Test

```bash
npm test
```

## Pubblicazione

Caricare tutti i file nella radice del repository GitHub Pages.


## Correzione v2.3

- Stabilizzato il modulo articolo quando si apre la tastiera su Safari iPhone.
- Allineamento del modulo al Visual Viewport, inclusi gli spostamenti verticali di iOS.
- Blocco dello scorrimento della pagina sottostante durante la compilazione.
- Campi focalizzati mantenuti visibili senza spostare l’intera schermata.
- Tastiera chiusa prima del passaggio alla schermata successiva.
- Layout compatto automatico mentre la tastiera è aperta.


## Correzione v2.3.2

- Corretta la versione mostrata nella sezione Dati, rimasta erroneamente su Hub v2.2.
- Versione visualizzata ora derivata automaticamente da APP_VERSION.
- Aggiornamento PWA forzato con updateViaCache disabilitato e ricaricamento al cambio del service worker.
- Aggiornati i parametri anti-cache delle risorse alla revisione 10.


## Correzione v2.3.2

- Barra inferiore corretta da quattro a cinque colonne.
- La sezione Dati resta sulla stessa riga delle altre sezioni.
- Eliminato lo scorrimento orizzontale accidentale della Dashboard.
- Schede, liste e testi lunghi restano entro la larghezza dello schermo.
- Spaziatura inferiore adattata alla barra di navigazione a riga singola.
