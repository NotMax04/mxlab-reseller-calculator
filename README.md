# MXLAB Reseller Hub

Web app mobile-first e installabile su iPhone per gestire l'attività di reselling MX LAB.

## Moduli

- Calcolatore prezzi multipiattaforma con formule ufficiali MXLAB.
- Inventario con codice progressivo, workflow, ricerca e filtri.
- Registrazione delle vendite con profitto e moltiplicatore reali.
- Dashboard con capitale investito, valore target, pipeline e articoli fermi.
- Esportazione CSV e backup/ripristino JSON.
- Salvataggio locale e funzionamento offline.

## Pubblicazione su GitHub Pages

Caricare tutti i file nella radice del repository e usare:

- Source: Deploy from a branch
- Branch: main
- Folder: / (root)

## Aggiornamento dalla precedente versione

I dati del calcolatore già salvati vengono mantenuti. L'inventario utilizza una nuova area di archiviazione locale.

## Test

```bash
npm test
```

## Privacy

I dati dell'inventario restano nel browser del dispositivo. È consigliato scaricare periodicamente un backup JSON.
