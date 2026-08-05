import { isGeneratedTitleSet, normalizeGeneratedTitles } from './mxlab-ai.js';

const PLATFORM_DEFINITIONS = [
  {
    id: 'vinted', label: 'Vinted', badge: 'V', currency: 'EUR',
    webUrl: 'https://www.vinted.it/items/new',
  },
  {
    id: 'ebay', label: 'eBay', badge: 'eB', currency: 'EUR',
    webUrl: 'https://www.ebay.it/sl/sell',
  },
  {
    id: 'wallapop', label: 'Wallapop', badge: 'W', currency: 'EUR',
    // La PWA di iOS usa un contenitore separato da Safari. Forziamo quindi Safari reale,
    // così la sessione web di Wallapop resta disponibile tra una pubblicazione e l'altra.
    safariUrl: 'x-safari-https://it.wallapop.com/app/catalog/upload',
    webUrl: 'https://it.wallapop.com/app/catalog/upload',
    launchMode: 'safari',
  },
  {
    id: 'subito', label: 'Subito', badge: 'S', currency: 'EUR',
    webUrl: 'https://www.subito.it/vendere/',
  },
  {
    id: 'facebook', label: 'Facebook Marketplace', badge: 'FB', currency: 'EUR',
    appUrl: 'fb://marketplace/create',
    webUrl: 'https://www.facebook.com/marketplace/create/item',
  },
  {
    id: 'vestiaire', label: 'Vestiaire Collective', badge: 'VC', currency: 'EUR',
    // Il vecchio schema personalizzato non è registrato dall'app iOS e produceva un errore.
    // Usiamo il link ufficiale di vendita come Universal Link, nello stesso gesto dell'utente:
    // se Vestiaire lo associa all'app, iOS apre direttamente l'app già autenticata.
    universalUrl: 'https://it.vestiairecollective.com/vendita-online-abbigliamento/',
    webUrl: 'https://it.vestiairecollective.com/vendita-online-abbigliamento/',
    launchMode: 'universal',
  },
  {
    id: 'depop', label: 'Depop', badge: 'D', currency: 'EUR',
    webUrl: 'https://www.depop.com/sell/',
  },
  {
    id: 'grailed', label: 'Grailed', badge: 'G', currency: 'USD',
    webUrl: 'https://www.grailed.com/sell',
  },
];

export const PUBLISH_PLATFORMS = Object.freeze(PLATFORM_DEFINITIONS.map((platform) => Object.freeze(platform)));
export const STANDARD_PLATFORM_IDS = Object.freeze(['vinted', 'ebay', 'wallapop', 'subito', 'depop', 'grailed']);

/**
 * Profilo editoriale MXLAB, allineato al progetto annunci del 25 luglio 2026:
 * - il testo inserito dall'utente ha priorità su ogni deduzione automatica;
 * - non inventare dati e omettere ciò che è incerto, salvo la gestione esplicita del materiale;
 * - tre titoli consecutivi: Vinted max 100, Wallapop/Subito max 50, eBay max 80;
 * - descrizione composta soltanto dalle righe disponibili: Misure, Materiale, Taglia, Colore, Condizioni;
 * - taglia esatta da etichetta; vestibilità soltanto se diversa; stima indicata come “(stimata da misure)”; mai “circa”;
 * - condizioni espresse come stato o difetto breve; vietate formule come “nessun difetto” e “senza difetti”;
 * - chiusura con spedizione/ritiro, contatto, prezzo trattabile e 3–5 hashtag;
 * - nessuna sezione prezzi dentro il testo dell'annuncio.
 */
export const MXLAB_LISTING_RULES = Object.freeze({
  userTextPriority: true,
  onlyVerifiable: true,
  omitUncertain: true,
  titleLimits: Object.freeze({ vinted: 100, wallapopSubito: 50, ebay: 80 }),
  descriptionFields: Object.freeze(['Misure', 'Materiale', 'Taglia', 'Colore', 'Condizioni']),
  titleCount: 3,
  noApproximateSizeWord: true,
  forbiddenConditionPhrases: Object.freeze(['nessun difetto', 'senza difetti']),
  hashtagMinimum: 3,
  hashtagMaximum: 5,
});

const platformMap = new Map(PUBLISH_PLATFORMS.map((platform) => [platform.id, platform]));

export const PLATFORM_PROGRESS_STATES = Object.freeze(['todo', 'draft', 'live']);

function normalizePlatformState(value) {
  return PLATFORM_PROGRESS_STATES.includes(value) ? value : 'todo';
}

function words(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function sentence(value) {
  const clean = words(value);
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function uniqueParts(parts) {
  const seen = new Set();
  return parts.filter((part) => {
    const clean = words(part);
    if (!clean) return false;
    const key = clean.toLocaleLowerCase('it-IT');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function truncate(value, maximum) {
  const clean = words(value);
  if (clean.length <= maximum) return clean;
  const sliced = clean.slice(0, maximum + 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return sliced.slice(0, lastSpace > maximum * 0.65 ? lastSpace : maximum).trim();
}

function stripDuplicateTokens(value, removals = []) {
  let result = words(value);
  removals.filter(Boolean).forEach((removal) => {
    const escaped = words(removal).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) return;
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'ig'), ' ');
  });
  return words(result.replace(/\btaglia\s*[A-Z0-9./-]+\b/ig, ' '));
}

function extractKnownDetail(description, patterns) {
  const text = words(description);
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return words(match[1]);
  }
  return '';
}

function legacyDescriptionLines(listing) {
  const lines = [];
  if (listing.color) lines.push(`Colore: ${words(listing.color)}.`);
  if (listing.material) lines.push(`Materiale: ${words(listing.material)}.`);
  if (listing.measurements) lines.push(`Misure: ${words(listing.measurements)}.`);
  if (listing.defects) lines.push(`Difetti: ${sentence(listing.defects)}`);
  return lines;
}

export function normalizeListing(value = {}) {
  const listing = value && typeof value === 'object' ? value : {};
  const legacy = {
    color: String(listing.color || '').trim(),
    material: String(listing.material || '').trim(),
    measurements: String(listing.measurements || '').trim(),
    defects: String(listing.defects || '').trim(),
  };
  let baseDescription = String(listing.baseDescription || '').trim();
  if (!baseDescription) baseDescription = legacyDescriptionLines(legacy).join('\n');
  const titleVariantIndex = Number.isInteger(Number(listing.titleVariantIndex))
    ? Math.min(2, Math.max(0, Number(listing.titleVariantIndex)))
    : 0;

  return {
    ...legacy,
    baseDescription,
    aiNotes: String(listing.aiNotes || '').trim(),
    generatedTitles: normalizeGeneratedTitles(listing.generatedTitles),
    aiGeneratedAt: String(listing.aiGeneratedAt || ''),
    aiSource: String(listing.aiSource || ''),
    titleVariantIndex,
    vestiaireEnabled: Boolean(listing.vestiaireEnabled),
    excludedPlatforms: Array.isArray(listing.excludedPlatforms)
      ? [...new Set(listing.excludedPlatforms.map(String).filter((id) => platformMap.has(id)))]
      : [],
    platformStates: (() => {
      const states = listing.platformStates && typeof listing.platformStates === 'object'
        ? Object.fromEntries(Object.entries(listing.platformStates)
            .filter(([id]) => platformMap.has(id))
            .map(([id, state]) => [id, normalizePlatformState(state)]))
        : {};
      if (listing.completedPlatforms && typeof listing.completedPlatforms === 'object') {
        Object.entries(listing.completedPlatforms).forEach(([id, done]) => {
          if (platformMap.has(id) && Boolean(done) && states[id] !== 'live') states[id] = 'live';
        });
      }
      return states;
    })(),
    completedPlatforms: listing.completedPlatforms && typeof listing.completedPlatforms === 'object'
      ? Object.fromEntries(Object.entries(listing.completedPlatforms)
          .filter(([id, done]) => platformMap.has(id) && Boolean(done))
          .map(([id]) => [id, true]))
      : {},
    listingUrls: listing.listingUrls && typeof listing.listingUrls === 'object'
      ? Object.fromEntries(Object.entries(listing.listingUrls)
          .filter(([id, url]) => platformMap.has(id) && typeof url === 'string')
          .map(([id, url]) => [id, url.trim()]))
      : {},
    removalChecklist: Array.isArray(listing.removalChecklist)
      ? listing.removalChecklist
          .filter((entry) => entry && platformMap.has(entry.platformId))
          .map((entry) => ({ platformId: entry.platformId, done: Boolean(entry.done) }))
      : [],
    photoCount: Math.max(0, Math.trunc(Number(listing.photoCount) || 0)),
    vintedSearchQuery: String(listing.vintedSearchQuery || '').trim(),
    vintedResearchStarted: Boolean(listing.vintedResearchStarted),
    vintedVideoReady: Boolean(listing.vintedVideoReady),
    vintedSuggestedTarget: Math.max(0, Number(String(listing.vintedSuggestedTarget ?? '').replace(',', '.')) || 0),
    vintedResearchUpdatedAt: String(listing.vintedResearchUpdatedAt || ''),
    pricesConfirmed: Boolean(listing.pricesConfirmed),
    publishedAt: String(listing.publishedAt || ''),
    updatedAt: String(listing.updatedAt || ''),
  };
}

export function getPlatform(id) {
  return platformMap.get(id) || null;
}

export function getPublishPlan(item, preferences = {}) {
  const listing = normalizeListing(item?.listing);
  const ids = [...STANDARD_PLATFORM_IDS];
  if (preferences.facebookEnabled !== false) ids.splice(4, 0, 'facebook');
  if (listing.vestiaireEnabled) ids.splice(ids.indexOf('depop'), 0, 'vestiaire');
  return ids
    .filter((id) => !listing.excludedPlatforms.includes(id))
    .map((id) => platformMap.get(id))
    .filter(Boolean);
}

function baseIdentity(item) {
  const brand = words(item?.brand);
  const category = words(item?.category);
  const size = words(item?.size);
  const original = stripDuplicateTokens(item?.title, [brand, category, size]);
  return { brand, category, size, original };
}

function keywordFromDescription(item) {
  const listing = normalizeListing(item?.listing);
  const description = listing.baseDescription;
  const color = listing.color || extractKnownDetail(description, [
    /(?:colore|colorazione)\s*:\s*([^.;\n]+)/i,
    /\b(nero|nera|bianco|bianca|blu(?: navy)?|rosso|rossa|verde|grigio|grigia|beige|marrone|giallo|gialla|rosa|viola|arancione|azzurro|azzurra)\b/i,
  ]);
  const material = listing.material || extractKnownDetail(description, [
    /(?:materiale|composizione)\s*:\s*([^.;\n]+)/i,
  ]);
  return { color, material };
}

export function generateTitleVariants(item) {
  const stored = normalizeListing(item?.listing).generatedTitles;
  if (isGeneratedTitleSet(stored)) return [...stored];
  const { brand, category, size, original } = baseIdentity(item);
  const { color } = keywordFromDescription(item);
  const sizePart = size ? `Taglia ${size}` : '';
  const detail = original || words(item?.title);

  // Ordine richiesto dal progetto MXLAB:
  // 1. Vinted (massimo 100 caratteri)
  // 2. Wallapop / Subito (massimo 50 caratteri)
  // 3. eBay (massimo 80 caratteri)
  const vinted = truncate(uniqueParts([brand, category || detail, detail && category ? detail : '', color, sizePart]).join(' '), 100);
  const short = truncate(uniqueParts([brand, category || detail, color, sizePart]).join(' '), 50);
  const ebay = truncate(uniqueParts([brand, category || detail, detail && category ? detail : '', color, sizePart]).join(' '), 80);
  const fallback = truncate(uniqueParts([brand, words(item?.title), sizePart]).join(' '), 100) || 'Articolo MXLAB';
  return [vinted || fallback, short || truncate(fallback, 50), ebay || truncate(fallback, 80)];
}

export function getPreferredTitle(item) {
  return generateTitleVariants(item)[0];
}

export function getUniversalTitle(item) {
  return getPreferredTitle(item);
}


export function getVintedSearchQuery(item) {
  const listing = normalizeListing(item?.listing);
  if (listing.vintedSearchQuery) return listing.vintedSearchQuery;
  const { brand, category, original } = baseIdentity(item);
  const detail = original || words(item?.title) || category;
  return uniqueParts([brand, detail]).join(' ') || getPreferredTitle(item);
}

export function buildVintedSearchUrl(item) {
  const query = getVintedSearchQuery(item);
  const params = new URLSearchParams();
  if (query) params.set('search_text', query);
  return `https://www.vinted.it/catalog${params.size ? `?${params.toString()}` : ''}`;
}

export function getVintedFilterSummary(item) {
  const listing = normalizeListing(item?.listing);
  const description = listing.baseDescription || generateBaseDescription(item);
  const filters = [
    ['Categoria', words(item?.category)],
    ['Brand', words(item?.brand)],
    ['Taglia', words(item?.size) || lineValue(description, 'Taglia')],
    ['Condizioni', words(item?.condition) || lineValue(description, 'Condizioni')],
    ['Colore', listing.color || lineValue(description, 'Colore')],
    ['Materiale', listing.material || lineValue(description, 'Materiale')],
  ];
  return filters.filter(([, value]) => Boolean(value)).map(([label, value]) => ({ label, value }));
}

export function buildVintedPriceAnalysisPrompt(item) {
  const listing = normalizeListing(item?.listing);
  const filters = getVintedFilterSummary(item).map(({ label, value }) => `${label}: ${value}`).join(' · ');
  const identity = [words(item?.brand), words(item?.title), words(item?.size)].filter(Boolean).join(' · ');
  return `Analizza il video dei risultati Vinted e stima il prezzo target per questo articolo: ${identity || 'articolo MXLAB'}.

Filtri usati: ${filters || 'non indicati'}.

Dimmi il prezzo che compare più spesso tra gli articoli realmente simili al mio. Considera con maggiore importanza quelli con più cuori, ma escludi gli annunci chiaramente non comparabili per modello, condizioni, taglia o caratteristiche. Non usare il prezzo comprensivo della Protezione acquisti.

Restituisci in prima riga soltanto: PREZZO TARGET: [importo] €. Poi aggiungi una spiegazione molto breve.`;
}

export function getPlatformState(item, platformId) {
  const listing = normalizeListing(item?.listing);
  if (listing.platformStates[platformId]) return listing.platformStates[platformId];
  return listing.completedPlatforms[platformId] ? 'live' : 'todo';
}

export function setPlatformState(item, platformId, state = 'todo') {
  const listing = normalizeListing(item?.listing);
  if (!platformMap.has(platformId)) return listing;
  const normalized = normalizePlatformState(state);
  if (normalized === 'todo') delete listing.platformStates[platformId];
  else listing.platformStates[platformId] = normalized;
  if (normalized === 'live') listing.completedPlatforms[platformId] = true;
  else delete listing.completedPlatforms[platformId];
  listing.updatedAt = new Date().toISOString();
  return listing;
}

function lineValue(text, label) {
  const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, 'i');
  return words(String(text || '').match(pattern)?.[1] || '');
}

function safeCondition(item, listing) {
  const state = words(item?.condition);
  const defect = words(listing.defects);
  const parts = [];
  if (state && !/non indicat/i.test(state)) parts.push(state);
  if (defect && !/nessun difetto|senza difetti/i.test(defect)) parts.push(defect);
  return parts.join('. ');
}

export function generateBaseDescription(item) {
  const listing = normalizeListing(item?.listing);
  const existing = words(listing.baseDescription);
  const notes = String(item?.notes || '');
  const lines = [];

  const measurements = listing.measurements || lineValue(notes, 'Misure');
  const material = listing.material || lineValue(notes, 'Materiale');
  const color = listing.color || lineValue(notes, 'Colore');
  const size = words(item?.size) || lineValue(notes, 'Taglia');
  const condition = safeCondition(item, listing) || lineValue(notes, 'Condizioni');

  if (measurements) lines.push(`Misure: ${measurements}`);
  if (material) lines.push(`Materiale: ${material}`);
  if (size) lines.push(`Taglia: ${size}`);
  if (color) lines.push(`Colore: ${color}`);
  if (condition) lines.push(`Condizioni: ${condition}`);

  // Se l'utente ha già scritto un testo qualitativo che non è soltanto una lista di campi,
  // lo preserviamo prima delle righe strutturate.
  if (existing && !/^(misure|materiale|taglia|colore|condizioni)\s*:/i.test(existing)) {
    lines.unshift(String(listing.baseDescription).trim());
  }

  lines.push('Spedizione veloce 🚚 o ritiro a mano a Burago di Molgora 📍');
  lines.push('Scrivimi per info, misure o altro');
  lines.push('Prezzo trattabile!');

  const tags = hashtags(item);
  if (tags) lines.push(tags);
  return lines.filter(Boolean).join('\n');
}

function hashtags(item) {
  const candidates = [item?.brand, item?.category, item?.size]
    .flatMap((value) => words(value).split(' '))
    .map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, ''))
    .filter((value) => value.length >= 2);
  return [...new Set(candidates.map((value) => `#${value}`))].slice(0, 5).join(' ');
}

function standardizeDescription(item, value) {
  let text = String(value || '').trim();
  // Rimuove formule vietate dal progetto senza inventare una condizione alternativa.
  text = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !/(?:nessun difetto|senza difetti)/i.test(part))
    .join('\n')
    .trim();

  const additions = [];
  if (!/Spedizione veloce|ritiro a mano/i.test(text)) additions.push('Spedizione veloce 🚚 o ritiro a mano a Burago di Molgora 📍');
  if (!/Scrivimi per info|informazioni|foto aggiuntive|contatt/i.test(text)) additions.push('Scrivimi per info, misure o altro');
  if (!/prezzo trattabile/i.test(text)) additions.push('Prezzo trattabile!');
  if (!/(?:^|\s)#[A-Za-z0-9]/.test(text)) {
    const tags = hashtags(item);
    if (tags) additions.push(tags);
  }
  return [text, ...additions].filter(Boolean).join('\n');
}

export function generatePlatformContent(item, priceModel) {
  const listing = normalizeListing(item?.listing);
  const base = standardizeDescription(item, listing.baseDescription || generateBaseDescription(item));
  const [vintedTitle, shortTitle, ebayTitle] = generateTitleVariants(item);
  const prices = priceModel?.prices || {};

  return {
    vinted: { title: vintedTitle, description: base, price: prices.vinted, currency: 'EUR' },
    ebay: { title: ebayTitle, description: base, price: prices.ebay, currency: 'EUR' },
    wallapop: { title: shortTitle, description: base, price: prices.wallapop, currency: 'EUR' },
    subito: { title: shortTitle, description: base, price: prices.subito, currency: 'EUR' },
    facebook: { title: vintedTitle, description: base, price: prices.facebook, currency: 'EUR' },
    vestiaire: { title: vintedTitle, description: base, price: prices.vestiaire, currency: 'EUR' },
    depop: { title: truncate(vintedTitle, 80), description: base, price: prices.depop, boostPrice: prices.depopBoost, currency: 'EUR' },
    grailed: { title: truncate(vintedTitle, 80), description: base, price: prices.grailed, currency: 'USD' },
  };
}

export function listingReadiness(item, photoCount = 0) {
  const listing = normalizeListing(item?.listing);
  const checks = [
    { id: 'identity', label: 'Titolo e marca', done: Boolean(words(item?.title) && words(item?.brand)) },
    { id: 'details', label: 'Categoria, taglia e condizioni', done: Boolean(words(item?.category) && words(item?.condition) && words(item?.size)) },
    { id: 'price', label: 'Prezzo target', done: Number(item?.target) > 0 },
    { id: 'description', label: 'Descrizione principale', done: Boolean(words(listing.baseDescription || generateBaseDescription(item))) },
    { id: 'photos', label: 'Almeno 5 fotografie', done: Number(photoCount) >= 5 },
  ];
  const completed = checks.filter((check) => check.done).length;
  return {
    checks,
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    ready: completed === checks.length,
  };
}

export function formatListingText(platformId, content) {
  const platform = platformMap.get(platformId);
  if (!platform || !content) return '';
  const currency = content.currency === 'USD' ? '$' : '€';
  const price = content.price == null ? '' : `${content.price} ${currency}`;
  return `${content.title}\n\n${content.description}\n\nPrezzo: ${price}`.trim();
}

export function markPlatformComplete(item, platformId, complete = true) {
  return setPlatformState(item, platformId, complete ? 'live' : 'todo');
}

export function createRemovalChecklist(item, soldPlatformLabel) {
  const listing = normalizeListing(item?.listing);
  const normalizedSoldLabel = soldPlatformLabel === 'Depop con boost' ? 'Depop' : soldPlatformLabel;
  const sold = PUBLISH_PLATFORMS.find((platform) => platform.label === normalizedSoldLabel)?.id || '';
  return Object.keys(listing.completedPlatforms)
    .filter((platformId) => listing.completedPlatforms[platformId] && platformId !== sold)
    .map((platformId) => ({ platformId, done: false }));
}
