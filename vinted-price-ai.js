const clean = (value) => String(value ?? '').trim();
const moneyNumber = (value) => {
  const match = clean(value).replace(/\s/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  const number = match ? Number(match[0]) : NaN;
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
};

export const MXLAB_PRICE_SHORTCUT_NAME = 'MXLAB Prezzo';

export const MXLAB_PRICE_SHORTCUT_PROMPT = `Analizza tutte le immagini ricevute come Input rapido. Sono fotogrammi cronologici estratti automaticamente da una registrazione dei risultati Vinted. Leggi anche gli Appunti: contengono le istruzioni vincolanti e i dati dell'articolo da valutare. Deduplica gli annunci che ricompaiono in più immagini e restituisci esclusivamente il formato richiesto, senza commenti prima o dopo.`;

export const MXLAB_PRICE_ANALYSIS_RULES = `AGISCI COME ANALISTA PREZZI VINTED PER RESELLING.

OBIETTIVO

Analizza la sequenza di fotogrammi dei risultati Vinted e determina un prezzo target realistico per l'articolo indicato. Il prezzo target deve rappresentare il valore centrale degli annunci realmente comparabili, con maggiore importanza per quelli che hanno più cuori, senza lasciare che un singolo annuncio molto popolare alteri da solo il risultato.

ANALISI DEI FOTOGRAMMI

1. Esamina tutte le immagini nell'ordine ricevuto e considera tutti gli annunci leggibili. I nomi dei file indicano ordine e momento della registrazione.
2. Deduplica gli annunci: lo stesso annuncio può ricomparire in fotogrammi consecutivi durante lo scorrimento e va contato una sola volta usando foto, titolo, prezzo e posizione come riferimenti.
3. Leggi soltanto il prezzo dell'articolo. Ignora Protezione acquisti, spedizione, totale, prezzo barrato precedente e rate.
4. Leggi il numero di cuori quando visibile. Se non è leggibile, non inventarlo.
5. Non inventare prezzi, cuori o caratteristiche nascoste.

COMPARABILITÀ

Classifica mentalmente ogni annuncio:

• ALTA: stesso brand e stessa tipologia precisa o modello molto vicino; taglia, condizioni, destinazione, fantasia e caratteristiche compatibili.
• MEDIA: stesso brand e stessa tipologia, ma con differenze non decisive.
• BASSA / DA ESCLUDERE: brand diverso quando il brand conta, categoria diversa, uomo/donna/bambino errato, lotto o bundle, accessorio invece del capo, condizioni molto differenti, difetti importanti, articolo non autenticamente simile o risultato pubblicitario.

Usa soprattutto gli annunci ad alta comparabilità. Gli annunci medi servono soltanto per ampliare un campione piccolo. Escludi quelli bassi.

PESO DEI CUORI

I cuori sono un segnale di interesse, non una prova di vendita. Usali come correzione moderata:

• 0 o non leggibili: nessun bonus
• 1–4: bonus minimo
• 5–14: bonus leggero
• 15–39: bonus medio
• 40 o più: bonus alto ma limitato

Un annuncio con molti cuori non deve prevalere se è poco comparabile o ha un prezzo isolato.

CALCOLO

1. Individua il prezzo o la fascia di 1 € che ricorre più spesso tra gli annunci validi.
2. Calcola mentalmente anche una mediana ponderata per comparabilità e cuori, più robusta della media.
3. Escludi gli outlier chiaramente lontani dal gruppo centrale, salvo siano molto comparabili e sostenuti da più annunci.
4. PREZZO_TARGET:
   • usa il prezzo più frequente ponderato quando emerge chiaramente;
   • altrimenti usa la mediana ponderata;
   • arrotonda soltanto a 0,50 € o 1 €;
   • non aggiungere il margine MXLAB e non applicare formule multipiattaforma.
5. FASCIA_CENTRALE deve contenere la zona in cui si concentra la maggioranza dei comparabili validi, non il minimo e massimo assoluti.

AFFIDABILITÀ

• ALTA: almeno 12 annunci validi, testo leggibile e risultati coerenti.
• MEDIA: 6–11 annunci validi oppure qualche incertezza.
• BASSA: meno di 6 annunci validi, fotogrammi poco leggibili o comparabili molto eterogenei.

Se i fotogrammi non consentono una valutazione seria, non inventare un prezzo. Usa STATO: INSUFFICIENTE e PREZZO_TARGET: 0 €.

OUTPUT OBBLIGATORIO

STATO: OK oppure INSUFFICIENTE
PREZZO_TARGET: [importo] €
PREZZO_PIU_FREQUENTE: [importo] €
PREZZO_PONDERATO: [importo] €
FASCIA_CENTRALE: [minimo]-[massimo] €
ANNUNCI_LETTI: [numero]
ANNUNCI_VALIDI: [numero]
ANNUNCI_SCARTATI: [numero]
AFFIDABILITA: ALTA oppure MEDIA oppure BASSA
MOTIVO: [una sola frase breve e concreta]

Non usare tabelle, markdown, elenchi aggiuntivi o spiegazioni del ragionamento.`;

function itemDetails(item = {}) {
  const listing = item.listing && typeof item.listing === 'object' ? item.listing : {};
  const titles = Array.isArray(listing.generatedTitles) ? listing.generatedTitles.filter(Boolean) : [];
  return [
    `Codice: ${clean(item.code) || 'non indicato'}`,
    `Brand: ${clean(item.brand) || 'non indicato'}`,
    `Tipologia: ${clean(item.category) || 'non indicata'}`,
    `Nome interno: ${clean(item.title) || 'non indicato'}`,
    `Taglia: ${clean(item.size) || 'non indicata'}`,
    `Condizioni: ${clean(item.condition) || 'non indicate'}`,
    `Titolo Vinted: ${clean(titles[0]) || 'non disponibile'}`,
    `Descrizione completa:\n${clean(listing.baseDescription) || 'non disponibile'}`,
    `Misure e note prioritarie:\n${clean(listing.aiNotes) || 'nessuna'}`,
  ].join('\n');
}

export function buildMXLABPriceAIInput(item = {}) {
  return `${MXLAB_PRICE_ANALYSIS_RULES}\n\nARTICOLO DA VALUTARE\n\n${itemDetails(item)}\n\nAnalizza tutti i fotogrammi ricevuti insieme a questi dati. Le informazioni scritte sull'articolo hanno priorità. Restituisci soltanto le dieci righe dell'OUTPUT OBBLIGATORIO.`;
}

function field(raw, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return clean(raw.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.+?)\\s*$`, 'im'))?.[1]);
}

function count(raw, label) {
  const number = Number.parseInt(field(raw, label).replace(/\D/g, ''), 10);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function range(value) {
  const numbers = clean(value).replace(/,/g, '.').match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  if (numbers.length < 2) return { min: 0, max: 0 };
  return { min: Math.min(numbers[0], numbers[1]), max: Math.max(numbers[0], numbers[1]) };
}

export function parseMXLABPriceAIOutput(value) {
  const raw = clean(value)
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/\r/g, '');
  if (!raw) throw new Error('Gli appunti sono vuoti');
  if (/AGISCI COME ANALISTA PREZZI VINTED/i.test(raw) && /OUTPUT OBBLIGATORIO/i.test(raw)) {
    throw new Error('Negli appunti ci sono ancora le istruzioni, non il risultato');
  }

  const statusRaw = field(raw, 'STATO').toUpperCase();
  const status = statusRaw.includes('INSUFFICIENTE') ? 'insufficient' : statusRaw.includes('OK') ? 'ok' : '';
  const target = moneyNumber(field(raw, 'PREZZO_TARGET'));
  const mode = moneyNumber(field(raw, 'PREZZO_PIU_FREQUENTE'));
  const weighted = moneyNumber(field(raw, 'PREZZO_PONDERATO'));
  const centralRange = range(field(raw, 'FASCIA_CENTRALE'));
  const confidenceRaw = field(raw, 'AFFIDABILITA').toUpperCase();
  const confidence = confidenceRaw.includes('ALTA') ? 'Alta' : confidenceRaw.includes('MEDIA') ? 'Media' : confidenceRaw.includes('BASSA') ? 'Bassa' : '';
  const result = {
    status,
    target,
    mode,
    weighted,
    rangeMin: centralRange.min,
    rangeMax: centralRange.max,
    readCount: count(raw, 'ANNUNCI_LETTI'),
    validCount: count(raw, 'ANNUNCI_VALIDI'),
    excludedCount: count(raw, 'ANNUNCI_SCARTATI'),
    confidence,
    reason: field(raw, 'MOTIVO'),
    raw,
  };

  if (!status) throw new Error('Manca la riga STATO');
  if (status === 'ok' && !target) throw new Error('Manca un PREZZO_TARGET valido');
  if (!confidence) throw new Error('Manca l’AFFIDABILITA');
  if (!result.reason) throw new Error('Manca il MOTIVO');
  return result;
}

export function normalizeVintedAnalysis(value = {}) {
  const analysis = value && typeof value === 'object' ? value : {};
  return {
    status: analysis.status === 'insufficient' ? 'insufficient' : analysis.status === 'ok' ? 'ok' : '',
    target: moneyNumber(analysis.target),
    mode: moneyNumber(analysis.mode),
    weighted: moneyNumber(analysis.weighted),
    rangeMin: moneyNumber(analysis.rangeMin),
    rangeMax: moneyNumber(analysis.rangeMax),
    readCount: Math.max(0, Math.trunc(Number(analysis.readCount) || 0)),
    validCount: Math.max(0, Math.trunc(Number(analysis.validCount) || 0)),
    excludedCount: Math.max(0, Math.trunc(Number(analysis.excludedCount) || 0)),
    confidence: ['Alta', 'Media', 'Bassa'].includes(analysis.confidence) ? analysis.confidence : '',
    reason: clean(analysis.reason),
    raw: clean(analysis.raw),
    analyzedAt: clean(analysis.analyzedAt),
  };
}
