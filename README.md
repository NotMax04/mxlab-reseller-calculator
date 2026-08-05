# MXLAB Reseller Hub v3.3.0

App web installabile su iPhone per gestire il flusso operativo MXLAB dall'articolo con fotografie pronte fino alla pubblicazione e alla vendita.

## Flusso v3.3

1. Crea l'articolo; il prezzo target può restare vuoto.
2. Lo Studio annuncio si apre automaticamente.
3. Importa le fotografie definitive dalla galleria.
4. Genera e importa i tre titoli e la descrizione tramite il comando rapido gratuito `MXLAB Annuncio`.
5. Avvia la ricerca Vinted: l'app apre una ricerca testuale già compilata e copia negli appunti la richiesta per l'analisi del video in ChatGPT.
6. Registra i risultati Vinted, allega il video nella stessa chat e incolla la richiesta già copiata.
7. Inserisci nell'app il prezzo target restituito: tutti i prezzi multipiattaforma vengono calcolati automaticamente.
8. Prepara le bozze e imposta ogni piattaforma su `Da fare`, `Bozza` oppure `Online`.
9. Usa i quattro messaggi rapidi per preferiti, offerta accettata, ritiro e recensione.

## Principi

- La generazione delle fotografie resta fuori dall'app perché il flusso gratuito interno sarebbe più lento.
- Titoli, descrizione, target, prezzi, bozze e stato delle piattaforme restano nella scheda dell'articolo: non serve usare Note.
- La ricerca Vinted resta assistita e controllata dall'utente per non perdere qualità.
- Nessuna API a pagamento e nessun server.
- Dati e fotografie restano archiviati localmente sul dispositivo.

## Compatibilità

L'aggiornamento mantiene inventario, storico, fotografie, formule, impostazioni e dati delle versioni precedenti. I vecchi stati `completato` delle piattaforme vengono interpretati come `Online`.

## Test

```bash
npm test
```

## Pubblicazione

Caricare tutti i file nella radice del repository GitHub Pages.
