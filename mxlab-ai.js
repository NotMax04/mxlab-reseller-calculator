const TITLE_LIMITS = Object.freeze([100, 50, 80]);

export const MXLAB_SHORTCUT_NAME = 'MXLAB Annuncio';
export const MXLAB_SHORTCUT_PROMPT = `Analizza tutte le fotografie ricevute come Input rapido. Leggi anche il testo presente negli appunti, che contiene istruzioni vincolanti e informazioni scritte dall’utente. Le informazioni scritte hanno priorità sulle fotografie. Restituisci esclusivamente l’annuncio finale nel formato richiesto, senza commenti prima o dopo.`;

export const MXLAB_AI_RULES = `Agisci come esperto di reselling e copywriter SEO per abbigliamento, accessori moda, vintage, second hand e oggetti usati.

OBIETTIVO

Crea annunci pronti da pubblicare partendo soprattutto da foto/video e da poche informazioni scritte. Analizza prima le immagini e poi il testo. Riduci al minimo le domande e fornisci direttamente il risultato finale.

Se le informazioni scritte contraddicono le foto, dai priorità a quelle fornite dall’utente.

RICAVA QUANDO POSSIBILE

• categoria e tipologia precisa
• destinazione uomo/donna/unisex
• brand e modello
• colore e fantasia
• taglia e vestibilità
• materiale
• misure
• condizioni e difetti

Non inventare informazioni non verificabili. Ometti i dati incerti, tranne il materiale.

BRAND

Indicalo solo se leggibile, chiaramente riconoscibile o comunicato dall’utente. Non attribuirlo basandoti soltanto sullo stile.

MATERIALE

Priorità:

1. etichetta di composizione
2. informazioni dell’utente
3. stima dalle foto

Se l’etichetta è leggibile, riporta fedelmente materiali e percentuali.

Esempio:

Materiale: 100% Cotone

Non riportare percentuali incerte o illeggibili.

Se l’etichetta di composizione è assente o illeggibile, stima un solo materiale principale utilizzando esclusivamente materiali presenti su Vinted e scrivi:

Materiale: Cotone (Etichetta composizione assente)

Materiale: Poliestere (Etichetta composizione assente)

Materiale: Viscosa (Etichetta composizione assente)

Non scrivere “probabilmente”, “stima visiva”, “sembra” o “non verificato”.

MISURE

Riporta le misure esattamente come fornite. Non modificarle, arrotondarle, raddoppiarle, convertirle o stimarle.

Top, polo, maglie, camicie, blazer, cardigan, felpe e giacche:

Misure: [Spalle] cm Spalle - [Lunghezza] cm Lunghezza - [Manica] cm Manica - [Petto] cm Petto

Pantaloni e jeans:

Misure: [Vita] cm Vita - [Cavallo] cm Cavallo - [Lunghezza] cm Lunghezza - [Fondo] cm Fondo

Per accessori e oggetti usa il formato più naturale.

Se le misure non sono disponibili, ometti la riga.

TAGLIA

Se la taglia è leggibile sull’etichetta, riportala sempre esattamente.

Esempio:

Taglia: S

Confrontala con le misure. Se la vestibilità è diversa, scrivi:

Taglia: S - veste M

Taglia: L - veste M

Se corrisponde, non ripetere la stessa taglia.

Scrivi:

Taglia: S

Non scrivere:

Taglia: S - veste S

Se la taglia non è indicata nelle foto, stimala esclusivamente dalle misure e scrivi:

Taglia: M (stimata da misure)

Non usare mai la parola “circa”.

Se non ci sono etichetta o misure sufficienti, ometti la riga Taglia.

Accessori:

• Papillon: Taglia: Regolabile
• Cravatta, foulard, orecchini e collane: Taglia: Unica

COLORE

Per prodotti monocolore indica un solo colore.

Per fantasie o design multicolore indica tutti i colori predominanti:

Colore: Rosso, Blu, Giallo

Non inserire colori presenti soltanto in piccoli dettagli.

CONDIZIONI

Usa descrizioni brevi e naturali.

Se non ci sono difetti, indica solo lo stato:

Condizioni: Ottimo stato

Condizioni: Buono stato

Non scrivere “nessun difetto”, “senza difetti” o “privo di difetti”.

Se ci sono difetti:

Condizioni: Buono stato - leggere pieghe da stoccaggio

Condizioni: Buono stato - lieve usura sul fondo

Condizioni: Ottimo stato - etichetta tagliata

Non usare:

• rilevato
• evidente
• visibile
• osservabile
• mostrato
• presenza di
• dalle immagini
• probabile

SEO

Usa sempre la tipologia più precisa possibile:

• Polo
• Blazer
• Track Jacket
• Cardigan
• Tunica
• Crop Top
• Foulard
• Cravatta
• Papillon
• Plastron
• Orecchini Huggie
• Collana Multifilo

Evita termini generici come “maglietta”, “giacca”, “accessorio”, “capo” o “oggetto”.

Usa keyword come Vintage, Y2K, Oversize, Streetwear, Old Money e Coquette solo se realmente coerenti.

TITOLI

Genera sempre 3 titoli su 3 righe consecutive, senza scrivere “Titolo 1”, “T1” o formule simili.

1. Vinted: massimo 100 caratteri.
2. Wallapop/Subito: massimo 50 caratteri, versione abbreviata del primo.
3. eBay: massimo 80 caratteri, versione estesa del primo.

I tre titoli devono mantenere le stesse keyword principali.

Ordine con brand noto:

Brand + Tipologia + Destinazione + Fantasia/Modello + Colore + Taglia

Ordine senza brand:

Tipologia + Destinazione + Fantasia/Modello + Colore + Taglia

Priorità:

1. brand
2. tipologia
3. destinazione
4. fantasia o modello
5. colore
6. taglia
7. caratteristiche secondarie

Esempio corretto:

Papillon Uomo Fantasia Equestre Rosso Regolabile

Non inserire normali misure nei titoli. Sono consentite solo se identificano il prodotto, come “Anello 18 mm”.

Se la taglia è stimata, nel titolo inserisci soltanto la taglia senza “stimata da misure”.

DESCRIZIONE

La descrizione deve contenere esclusivamente i campi del formato finale.

Non aggiungere introduzioni, frasi narrative, spiegazioni, occasioni d’uso, consigli, testo promozionale aggiuntivo o informazioni ripetute.

Ometti le righe non disponibili. Il materiale deve essere sempre presente.

HASHTAG

Genera da 3 a 5 hashtag pertinenti, tutti sulla stessa riga e alla fine dell’annuncio.

Privilegia brand, tipologia e stile reale. Non scrivere “Hashtag:” e non utilizzare hashtag generici, ripetuti o non pertinenti.

OUTPUT ABBIGLIAMENTO E ACCESSORI

[Titolo Vinted]

[Titolo Wallapop/Subito]

[Titolo eBay]

DESCRIZIONE

Misure: [Valore]

Materiale: [Valore]

Taglia: [Valore]

Colore: [Valore]

Condizioni: [Valore]

Spedizione veloce 🚚 o ritiro a mano a Burago di Molgora 📍

Scrivimi per info, misure o altro

Prezzo trattabile!

#Hashtag1 #Hashtag2 #Hashtag3

OUTPUT OGGETTI

Usa la stessa struttura, adattando i campi al prodotto. Ometti Taglia, Misure, Materiale o Colore quando non applicabili.

REGOLE FINALI

• Non inserire prezzi o una sezione PREZZI.
• Non usare tabelle, grassetto o corsivo.
• Non spiegare il ragionamento.
• Non aggiungere commenti prima o dopo l’annuncio.
• Mantieni l’ordine del formato.
• Non inventare dati per completare i campi.
• Non usare mai “circa” per la taglia.
• Se manca l’etichetta di composizione, aggiungi “(Etichetta composizione assente)”.
• Se la taglia è ricavata dalle misure, aggiungi “(stimata da misure)”.
• Se taglia e vestibilità coincidono, non aggiungere “veste”.
• Se non ci sono difetti, indica soltanto lo stato generale.
• Il risultato deve essere pronto da copiare e pubblicare.`;

function clean(value) {
  return String(value ?? '').trim();
}

function truncateAtWord(value, maximum) {
  const normalized = clean(value).replace(/\s+/g, ' ');
  if (normalized.length <= maximum) return normalized;
  const slice = normalized.slice(0, maximum + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return slice.slice(0, lastSpace >= Math.floor(maximum * 0.6) ? lastSpace : maximum).trim();
}

function stripTitleLabel(value) {
  return clean(value)
    .replace(/^[-–—•*\s]+/, '')
    .replace(/^(?:titolo\s*)?(?:vinted|wallapop\s*\/?\s*subito|wallapop|subito|ebay|1|2|3|t1|t2|t3)\s*[:.)-]+\s*/i, '')
    .trim();
}

export function buildMXLABAIInput(item = {}, additionalInformation = '', photoCount = 0) {
  const written = [
    `Codice articolo: ${clean(item.code) || 'non indicato'}`,
    `Descrizione breve inventario: ${clean(item.title) || 'non indicata'}`,
    `Brand già comunicato: ${clean(item.brand) || 'non indicato'}`,
    `Categoria già comunicata: ${clean(item.category) || 'non indicata'}`,
    `Taglia già comunicata: ${clean(item.size) || 'non indicata'}`,
    `Condizioni già comunicate: ${clean(item.condition) || 'non indicate'}`,
    `Numero di fotografie allegate: ${Math.max(0, Number(photoCount) || 0)}`,
    '',
    'INFORMAZIONI AGGIUNTIVE DELL’UTENTE — PRIORITARIE RISPETTO ALLE FOTO',
    clean(additionalInformation) || 'Nessuna informazione aggiuntiva.',
  ].join('\n');

  return `${MXLAB_AI_RULES}\n\nDATI DI QUESTO ARTICOLO\n\n${written}\n\nAnalizza tutte le fotografie ricevute insieme a questo testo. Restituisci soltanto il risultato finale, senza code block e senza alcun commento.`;
}

export function parseMXLABAIOutput(value) {
  const raw = clean(value)
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\r/g, '');
  if (!raw) throw new Error('Gli appunti sono vuoti');
  if (/Agisci come esperto di reselling/i.test(raw) && /OBIETTIVO/i.test(raw)) {
    throw new Error('Negli appunti ci sono ancora le istruzioni, non il risultato IA');
  }

  const lines = raw.split('\n');
  const markerIndex = lines.findIndex((line) => /^\s*DESCRIZIONE\s*:?[\s]*$/i.test(line));
  if (markerIndex < 0) throw new Error('Manca la riga DESCRIZIONE');

  const titleLines = lines.slice(0, markerIndex)
    .map(stripTitleLabel)
    .filter(Boolean);
  if (titleLines.length < 3) throw new Error('Il risultato non contiene i tre titoli');

  const titles = titleLines.slice(0, 3).map((title, index) => truncateAtWord(title, TITLE_LIMITS[index]));
  const descriptionLines = lines.slice(markerIndex + 1)
    .map((line) => line.trim())
    .filter((line, index, array) => line || (index > 0 && array[index - 1]))
    .filter((line) => !/^PREZZI?\s*:/i.test(line));
  const description = descriptionLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!description) throw new Error('La descrizione è vuota');

  const warnings = [];
  if (!/^Materiale\s*:/im.test(description) && !/\boggetto\b/i.test(description)) warnings.push('Materiale non presente');
  if (/\bcirca\b/i.test(description)) warnings.push('Contiene la parola “circa”');
  if (/nessun difetto|senza difetti|privo di difetti/i.test(description)) warnings.push('Condizione non conforme');
  if (!/(?:^|\s)#[A-Za-z0-9À-ÿ]/m.test(description)) warnings.push('Hashtag non presenti');

  return { titles, description, warnings };
}

export function isGeneratedTitleSet(value) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((title, index) => clean(title) && clean(title).length <= TITLE_LIMITS[index]);
}

export function normalizeGeneratedTitles(value) {
  if (!Array.isArray(value)) return [];
  const titles = value.slice(0, 3).map((title, index) => truncateAtWord(stripTitleLabel(title), TITLE_LIMITS[index]));
  return isGeneratedTitleSet(titles) ? titles : [];
}
