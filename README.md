# MXLAB Price Calculator

Web app gratuita e installabile su iPhone che applica le formule ufficiali del progetto MXLAB a uno o più Prezzi Target.

## Funzioni

- uno o più Prezzi Target, inseriti uno per riga;
- prezzi per Vinted, Wallapop, eBay, Subito, Facebook Marketplace, Vestiaire Collective, Depop, Depop con boost e Grailed;
- minimi accettabili per eBay, Depop, Depop con boost e Grailed;
- offerte automatiche per eBay, Depop e Depop con boost;
- spedizione eBay modificabile, con minimo obbligatorio di 5,35 euro;
- cambio Grailed fisso: 1 euro = 1,138 dollari;
- copia dei risultati nel formato ufficiale MXLAB;
- salvataggio locale dei dati;
- PWA utilizzabile offline;
- nessun account, server, database o API.

## Regole incorporate

Le formule, le percentuali e il cambio sono fissi nel codice e non vengono aggiornati automaticamente.

### Vinted e Wallapop

```text
V = R90(T × 1,20 + 1)
```

### Subito e Facebook Marketplace

```text
S = INT(T × 1,20 + 1)
```

### Vestiaire Collective

```text
Vestiaire = INT(V + 15)
```

### eBay

```text
E = C90(((V + SPe + 0,35) ÷ 0,8157) − SPe)
Emin = C90(((T + SPe + 0,35) ÷ 0,8157) − SPe)
Eoff = R90(E × 0,93), limitata tra Emin ed E
```

### Depop

```text
D = C90(V × 1,155 + 1,45)
Dmin = V
Doff = R90(D × 0,93), limitata tra Dmin e D
```

### Depop con boost

```text
DB = C90(V × 1,272 + 2,20)
DBmin = C90(V × 1,06 + 1)
DBoff = R90(DB × 0,93), limitata tra DBmin e DB
```

### Grailed

```text
G = SUP(((((V × 1,138) + 20 + 0,49) ÷ 0,8901) − 20))
Gmin = SUP(((((T × 1,138) + 20 + 0,49) ÷ 0,8901) − 20))
```

## Pubblicazione gratuita con GitHub Pages

1. Crea un repository pubblico chiamato `mxlab-reseller-calculator`.
2. Carica tutti i file direttamente nella cartella principale del repository.
3. Apri `Settings`, poi `Pages`.
4. In `Build and deployment`, scegli `Deploy from a branch`.
5. Seleziona `main` e `/ (root)`.
6. Salva.

## Installazione su iPhone

1. Apri il sito con Safari.
2. Premi Condividi.
3. Seleziona `Aggiungi alla schermata Home`.

## Test

```bash
npm test
```

## Privacy

I dati vengono salvati esclusivamente nel `localStorage` del browser.

## Licenza

MIT.
