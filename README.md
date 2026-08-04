# MXLAB Reseller Hub v3.0

PWA gratuita e installabile su iPhone per gestire il progetto MXLAB in un unico posto.

## Moduli

- Calcolatore prezzi multipiattaforma con formule ufficiali MXLAB
- Inventario operativo e registrazione vendite
- Studio annunci e cross-listing assistito
- Archivio fotografico locale tramite IndexedDB
- Generazione locale di titoli e descrizioni per piattaforma
- Prezzi automatici per Vinted, eBay, Wallapop, Subito, Facebook Marketplace, Vestiaire, Depop e Grailed
- Sessione guidata di pubblicazione con copia, condivisione, apertura e stato completato
- Checklist di rimozione degli altri annunci dopo una vendita
- Storico vendite, dashboard, lotti, fornitori, spese e checklist
- Esportazione CSV e backup JSON
- Funzionamento offline

## Cross-listing assistito

L'app non usa bot o scraping. Prepara contenuti e fotografie, apre la piattaforma ufficiale e registra il completamento del passaggio. La pubblicazione finale resta manuale sulle piattaforme che non offrono integrazioni ufficiali.

Le fotografie sono compresse a un massimo di 1600 px e salvate soltanto sul dispositivo in IndexedDB. Il backup JSON contiene dati e testi, non i file fotografici.

## Test

```bash
npm test
```

## Pubblicazione

Caricare tutti i file nella radice del repository GitHub Pages.
