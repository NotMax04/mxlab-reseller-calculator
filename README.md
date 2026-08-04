# MXLAB Reseller Hub v2.1

App web installabile su iPhone per il progetto MXLAB.

## Moduli

- Calcolatore prezzi multipiattaforma con formule ufficiali MXLAB
- Inventario operativo con workflow e registrazione vendite
- Storico di 117 vendite multipiattaforma importate da Google Sheets
- Dashboard con inventario corrente e storico separati
- Dati di lotti, fornitori, spese e checklist
- Esportazione CSV e backup JSON
- Funzionamento offline tramite PWA

## Importazione Google

I dati del 4 agosto 2026 sono inclusi in `seed-data.js`. Al primo avvio su un dispositivo senza dati, l’importazione viene eseguita automaticamente. In seguito può essere ripetuta dalla sezione **Dati > Google Sheets** senza creare duplicati.

## Test

```bash
npm test
```

## Pubblicazione

Caricare tutti i file nella radice del repository GitHub Pages.

## Correzioni dati v2.1

- Compilazione automatica di marca e categoria dal nome dell’articolo quando riconoscibili.
- Correzione delle marche mancanti negli articoli Modori importati.
- Distinzione tra data di acquisto del lotto e data di ricezione.
- Condizioni non presenti nel foglio indicate come `Non indicato`, senza inventare informazioni.
- Riparazione automatica dei dati già salvati sul dispositivo, senza cancellare inventario o storico.
