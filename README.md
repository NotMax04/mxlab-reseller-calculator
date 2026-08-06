# MXLAB Reseller Hub v3.5.5

PWA locale per iPhone che segue il processo operativo MXLAB dalle foto già pronte fino alla vendita.

## Flusso principale

1. **Foto e dati** — importa le immagini definitive e registra brand, tipologia, taglia, condizioni, misure e note.
2. **Titoli e descrizione** — usa `MXLAB Annuncio` e conserva i testi nella scheda dell'articolo.
3. **Comparabili Vinted** — seleziona la registrazione schermo; MXHUB estrae fotogrammi statici e `MXLAB Prezzo` restituisce target, fascia e affidabilità.
4. **Prezzi** — applica le formule ufficiali MXLAB.
5. **Pubblicazione** — copia titolo e descrizione, apre le piattaforme e registra Da fare, Bozza e Online.
6. **Vendita** — registra la vendita soltanto quando avviene e prepara la riga per Fogli Google.

## Apertura piattaforme su iPhone

- **eBay:** apre direttamente l'app eBay. Non esiste un collegamento pubblico stabile al modulo Nuova inserzione, quindi occorre toccare `Vendi` nell'app.
- **Facebook Marketplace:** apre Marketplace nell'app Facebook tramite `fb://marketplace`, senza fallback automatico verso Safari. Occorre poi toccare `Vendi`.
- **Depop:** usa il collegamento universale `/sell/`, che apre l'app senza la schermata di errore causata da `/products/create/`; occorre poi toccare `+`.
- **Wallapop:** continua a usare Safari esterno per conservare la sessione web.
- **Vestiaire:** continua a usare il collegamento universale già verificato.

Ogni scheda mostra direttamente il limite reale della piattaforma, così il flusso non promette un'apertura del modulo che l'app non espone.

## Backup completo

Dalla v3.5.5 il backup JSON include e verifica:

- articoli;
- vendite;
- impostazioni;
- tutte le fotografie archiviate in IndexedDB.

Durante esportazione e importazione il pulsante mostra il progresso delle foto. Prima del ripristino tutte le immagini vengono validate; un backup corrotto non cancella più l'archivio locale. I backup precedenti senza immagini preservano le foto già presenti sul dispositivo, ma non possono ricrearle su un'installazione vuota.

## Principi

- nessuna API a pagamento;
- nessun server;
- dati conservati sul dispositivo;
- formule ufficiali MXLAB invariate;
- compatibilità con i dati testuali delle versioni precedenti.

## Test

```bash
npm test
```

## Pubblicazione

Caricare i file nella radice del repository GitHub Pages e pubblicare dalla branch `main`, cartella `/ (root)`.
