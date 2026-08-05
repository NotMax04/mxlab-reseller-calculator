# MXLAB Reseller Hub v3.4.0

PWA locale per iPhone che organizza il processo MXLAB nello stesso ordine operativo usato per creare e pubblicare gli annunci.

## Flusso principale

1. **Lavorazione**
   - importa le fotografie definitive già create in ChatGPT;
   - registra dati, misure e condizioni;
   - mantiene costo, data e fornitore in una sezione facoltativa, compilabile anche alla vendita;
   - genera o importa tre titoli e descrizione con `MXLAB Annuncio`;
   - apre la ricerca Vinted e prepara il messaggio per l'analisi del video;
   - inserisce il target una volta sola e calcola i prezzi multipiattaforma;
   - prepara bozze e pubblica gli annunci.
2. **Pubblicati**
   - raccoglie gli articoli online;
   - permette di registrarne la vendita.
3. **Venduti**
   - salva la vendita soltanto dopo che è avvenuta;
   - permette di completare il costo di acquisto in quel momento;
   - calcola profitto e moltiplicatore;
   - copia una riga pronta per Fogli Google.
4. **Messaggi**
   - contiene le risposte rapide per preferiti, offerte, ritiro e recensione.
5. **Dati**
   - backup, CSV, impostazioni e calcolatore manuale secondario.

La generazione delle fotografie non è inclusa: rimane nel progetto ChatGPT dedicato perché il passaggio dentro l'app non riduceva il tempo di lavoro.

## Principi della versione 3.4

- Nessuna sezione Prezzi iniziale.
- Nessuna sezione Inventario collocata prima della pubblicazione.
- Un solo percorso lineare per ciascun articolo: `Dati → Annuncio → Ricerca → Prezzi → Pubblica`.
- Titoli e descrizione restano nella scheda dell'articolo, senza passare dalle Note.
- Le formule ufficiali MXLAB non sono state modificate.
- Wallapop continua ad aprirsi nel Safari reale; Vestiaire usa il collegamento HTTPS di vendita.
- Dati, fotografie, storico e backup delle versioni precedenti restano compatibili.
- Funzionamento locale, senza server e senza costi aggiuntivi.

## Test

```bash
npm test
```

## Pubblicazione

Caricare i file nella radice del repository GitHub Pages e pubblicare dalla branch `main`, cartella `/ (root)`.
