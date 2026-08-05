# MXLAB Reseller Hub v3.2.1

App web installabile su iPhone per gestire inventario, prezzi, fotografie, generazione annunci e cross-listing MXLAB.

## Novità v3.2

- Generazione completamente gratuita dei tre titoli e della descrizione tramite Apple Intelligence e Comandi Rapidi.
- Istruzioni complete del progetto annunci MXLAB incorporate automaticamente nel brief.
- Le fotografie vengono condivise dal relativo articolo senza passare da Galleria o ChatGPT.
- Campo unico per misure e informazioni scritte prioritarie.
- Importazione del risultato dagli appunti con riconoscimento automatico dei tre titoli e della descrizione.
- Titoli modificabili direttamente nell'app con limiti 100, 50 e 80 caratteri.
- Nessuna chiave API, nessun server e nessun costo per generazione.
- Compatibilità con inventario, fotografie e backup delle versioni precedenti.

## Configurazione gratuita

La prima volta si crea sul proprio iPhone un comando rapido denominato `MXLAB Annuncio` con le azioni indicate nella guida integrata. In seguito il flusso è: Foto → Genera → seleziona il comando → Importa risultato.

## Test

```bash
npm test
```

## Pubblicazione

Caricare tutti i file nella radice del repository GitHub Pages.


## Correzione v3.2.1

- Wallapop viene aperto nel Safari reale tramite un collegamento dedicato, così usa la sessione web persistente anziché il contenitore isolato della PWA.
- Rimosso il collegamento personalizzato non valido di Vestiaire Collective che causava l'errore iniziale.
- Vestiaire viene aperto tramite il collegamento HTTPS ufficiale di vendita nello stesso gesto dell'utente, consentendo a iOS di gestirlo come Universal Link e aprire l'app quando supportato.
- Nessuna modifica ai dati, alle fotografie, al generatore IA o alle formule dei prezzi.
