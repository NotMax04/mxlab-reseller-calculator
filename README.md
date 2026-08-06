# MXLAB Reseller Hub v3.5.1

PWA locale per iPhone che segue il processo operativo MXLAB dalla fotografia già pronta fino alla vendita.

## Flusso principale

1. **Foto e dati**
   - importa le fotografie definitive già create nel progetto ChatGPT;
   - registra brand, tipologia, taglia, condizioni, misure e note;
   - mantiene costo, data e fornitore facoltativi e compilabili anche alla vendita.
2. **Titoli e descrizione**
   - genera o importa i tre titoli e la descrizione tramite `MXLAB Annuncio`;
   - conserva tutto nella scheda dell'articolo, senza usare Note.
3. **Comparabili Vinted**
   - l'utente esegue la ricerca manuale su Vinted con i filtri più precisi;
   - registra lo scorrimento dei risultati;
   - seleziona il video direttamente nella scheda;
   - il comando `MXLAB Prezzo` analizza l'intero video, deduplica gli annunci, pesa somiglianza e cuori, esclude gli outlier e restituisce un risultato strutturato;
   - l'app importa target, fascia centrale, prezzo più frequente, prezzo ponderato, campione e affidabilità.
4. **Prezzi**
   - usa il target confermato una sola volta;
   - applica le formule ufficiali MXLAB a tutte le piattaforme.
5. **Pubblicazione**
   - copia titoli, descrizione e prezzi;
   - apre le piattaforme;
   - registra gli stati Da fare, Bozza e Online.
6. **Vendita**
   - viene registrata soltanto quando avviene;
   - calcola profitto e moltiplicatore;
   - copia la riga pronta per Fogli Google.

## Comandi Rapidi

### MXLAB Annuncio

Riceve le fotografie definitive, usa il prompt negli appunti e restituisce tre titoli più descrizione.

### MXLAB Prezzo

Riceve il video dei comparabili Vinted, usa il prompt negli appunti e copia negli appunti un output con dieci righe:

- stato;
- prezzo target;
- prezzo più frequente;
- prezzo ponderato;
- fascia centrale;
- annunci letti;
- annunci validi;
- annunci scartati;
- affidabilità e motivo.

Il video non viene duplicato nell'archivio della PWA: resta nell'app Foto o in File. La PWA conserva soltanto nome, dimensione, durata e risultato dell'analisi.

## Principi

- Nessuna generazione fotografica dentro MXHUB.
- Nessuna ricerca Vinted automatica o filtro URL fragile.
- Il metodo manuale di selezione dei comparabili resta invariato per non perdere qualità.
- L'automazione interviene soltanto nell'analisi dei fotogrammi estratti dal video e nella gestione del risultato.
- Le formule ufficiali MXLAB non sono state modificate.
- I dati delle versioni precedenti restano compatibili.
- Funzionamento locale, senza server e senza API a pagamento.

## Test

```bash
npm test
```

## Pubblicazione

Caricare i file nella radice del repository GitHub Pages e pubblicare dalla branch `main`, cartella `/ (root)`.
