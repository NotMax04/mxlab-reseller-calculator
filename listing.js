const PLATFORM_DEFINITIONS = [
  { id: 'vinted', label: 'Vinted', badge: 'V', currency: 'EUR', openUrl: 'https://www.vinted.it/items/new' },
  { id: 'ebay', label: 'eBay', badge: 'eB', currency: 'EUR', openUrl: 'https://www.ebay.it/sl/sell' },
  { id: 'wallapop', label: 'Wallapop', badge: 'W', currency: 'EUR', openUrl: 'https://it.wallapop.com/' },
  { id: 'subito', label: 'Subito', badge: 'S', currency: 'EUR', openUrl: 'https://www.subito.it/vendere/' },
  { id: 'facebook', label: 'Facebook Marketplace', badge: 'FB', currency: 'EUR', openUrl: 'https://www.facebook.com/marketplace/create/item' },
  { id: 'vestiaire', label: 'Vestiaire Collective', badge: 'VC', currency: 'EUR', openUrl: 'https://www.vestiairecollective.com/sell/' },
  { id: 'depop', label: 'Depop', badge: 'D', currency: 'EUR', openUrl: 'https://www.depop.com/sell/' },
  { id: 'grailed', label: 'Grailed', badge: 'G', currency: 'USD', openUrl: 'https://www.grailed.com/sell' },
];

export const PUBLISH_PLATFORMS = Object.freeze(PLATFORM_DEFINITIONS.map((platform) => Object.freeze(platform)));
export const STANDARD_PLATFORM_IDS = Object.freeze(['vinted', 'ebay', 'wallapop', 'subito', 'depop', 'grailed']);

const platformMap = new Map(PUBLISH_PLATFORMS.map((platform) => [platform.id, platform]));

export function normalizeListing(value = {}) {
  const listing = value && typeof value === 'object' ? value : {};
  return {
    color: String(listing.color || '').trim(),
    material: String(listing.material || '').trim(),
    measurements: String(listing.measurements || '').trim(),
    defects: String(listing.defects || '').trim(),
    baseDescription: String(listing.baseDescription || '').trim(),
    vestiaireEnabled: Boolean(listing.vestiaireEnabled),
    excludedPlatforms: Array.isArray(listing.excludedPlatforms)
      ? [...new Set(listing.excludedPlatforms.map(String).filter((id) => platformMap.has(id)))]
      : [],
    completedPlatforms: listing.completedPlatforms && typeof listing.completedPlatforms === 'object'
      ? Object.fromEntries(Object.entries(listing.completedPlatforms).filter(([id, done]) => platformMap.has(id) && Boolean(done)).map(([id]) => [id, true]))
      : {},
    listingUrls: listing.listingUrls && typeof listing.listingUrls === 'object'
      ? Object.fromEntries(Object.entries(listing.listingUrls).filter(([id, url]) => platformMap.has(id) && typeof url === 'string').map(([id, url]) => [id, url.trim()]))
      : {},
    removalChecklist: Array.isArray(listing.removalChecklist)
      ? listing.removalChecklist
          .filter((entry) => entry && platformMap.has(entry.platformId))
          .map((entry) => ({ platformId: entry.platformId, done: Boolean(entry.done) }))
      : [],
    photoCount: Math.max(0, Math.trunc(Number(listing.photoCount) || 0)),
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

function words(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function brandAlreadyInTitle(item) {
  const brand = words(item?.brand).toLowerCase();
  const title = words(item?.title).toLowerCase();
  return Boolean(brand && title.includes(brand));
}

export function getUniversalTitle(item) {
  const parts = [];
  if (item?.brand && !brandAlreadyInTitle(item)) parts.push(words(item.brand));
  if (item?.title) parts.push(words(item.title));
  if (item?.size) parts.push(`taglia ${words(item.size)}`);
  return words(parts.join(' '));
}

function sentence(value) {
  const clean = words(value);
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

export function generateBaseDescription(item) {
  const listing = normalizeListing(item?.listing);
  const lines = [sentence(getUniversalTitle(item))];
  if (item?.condition) lines.push(`Condizioni: ${words(item.condition)}.`);
  if (listing.color) lines.push(`Colore: ${listing.color}.`);
  if (listing.material) lines.push(`Materiale: ${listing.material}.`);
  if (listing.measurements) lines.push(`Misure: ${listing.measurements}.`);
  if (listing.defects) lines.push(`Difetti: ${sentence(listing.defects)}`);
  else lines.push('Nessun difetto rilevante oltre ai normali segni eventualmente visibili in foto.');
  if (item?.notes) lines.push(sentence(item.notes));
  lines.push('Articolo controllato prima della pubblicazione. Foto reali del prodotto.');
  return lines.filter(Boolean).join('\n');
}

function truncate(value, maximum) {
  const clean = words(value);
  if (clean.length <= maximum) return clean;
  const sliced = clean.slice(0, maximum + 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return sliced.slice(0, lastSpace > maximum * 0.65 ? lastSpace : maximum).trim();
}

function hashtags(item) {
  const candidates = [item?.brand, item?.category, item?.title, item?.size]
    .flatMap((value) => words(value).split(' '))
    .map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, ''))
    .filter((value) => value.length >= 3);
  return [...new Set(candidates.map((value) => `#${value}`))].slice(0, 5).join(' ');
}

function grailedDescription(item) {
  const listing = normalizeListing(item?.listing);
  const lines = [getUniversalTitle(item)];
  if (item?.condition) lines.push(`Condition: ${words(item.condition)}.`);
  if (listing.color) lines.push(`Color: ${listing.color}.`);
  if (listing.material) lines.push(`Material: ${listing.material}.`);
  if (listing.measurements) lines.push(`Measurements: ${listing.measurements}.`);
  if (listing.defects) lines.push(`Flaws: ${sentence(listing.defects)}`);
  else lines.push('No major flaws beyond what is visible in the photos.');
  lines.push('Authentic photos of the actual item.');
  return lines.filter(Boolean).join('\n');
}

export function generatePlatformContent(item, priceModel) {
  const listing = normalizeListing(item?.listing);
  const base = listing.baseDescription || generateBaseDescription(item);
  const universal = getUniversalTitle(item);
  const depopTags = hashtags(item);
  const prices = priceModel?.prices || {};

  return {
    vinted: { title: truncate(universal, 100), description: base, price: prices.vinted, currency: 'EUR' },
    ebay: { title: truncate(universal, 80), description: `${base}\n\nCodice articolo interno: ${item?.code || 'MXLAB'}`, price: prices.ebay, currency: 'EUR' },
    wallapop: { title: truncate(universal, 50), description: base, price: prices.wallapop, currency: 'EUR' },
    subito: { title: truncate(universal, 70), description: base, price: prices.subito, currency: 'EUR' },
    facebook: { title: truncate(universal, 100), description: base, price: prices.facebook, currency: 'EUR' },
    vestiaire: { title: truncate(universal, 100), description: `${base}\n\nDettagli verificabili nelle fotografie: etichette, materiali, condizioni e difetti.`, price: prices.vestiaire, currency: 'EUR' },
    depop: { title: truncate(universal, 80), description: `${base}\n\n${depopTags}`.trim(), price: prices.depop, boostPrice: prices.depopBoost, currency: 'EUR' },
    grailed: { title: truncate(universal, 80), description: grailedDescription(item), price: prices.grailed, currency: 'USD' },
  };
}

export function listingReadiness(item, photoCount = 0) {
  const listing = normalizeListing(item?.listing);
  const checks = [
    { id: 'identity', label: 'Titolo e marca', done: Boolean(words(item?.title) && words(item?.brand)) },
    { id: 'details', label: 'Categoria, taglia e condizioni', done: Boolean(words(item?.category) && words(item?.condition) && words(item?.size)) },
    { id: 'price', label: 'Prezzo target', done: Number(item?.target) > 0 },
    { id: 'description', label: 'Descrizione annuncio', done: Boolean(listing.baseDescription || generateBaseDescription(item)) },
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
  const listing = normalizeListing(item?.listing);
  listing.completedPlatforms[platformId] = Boolean(complete);
  if (!complete) delete listing.completedPlatforms[platformId];
  listing.updatedAt = new Date().toISOString();
  return listing;
}

export function createRemovalChecklist(item, soldPlatformLabel) {
  const listing = normalizeListing(item?.listing);
  const normalizedSoldLabel = soldPlatformLabel === 'Depop con boost' ? 'Depop' : soldPlatformLabel;
  const sold = PUBLISH_PLATFORMS.find((platform) => platform.label === normalizedSoldLabel)?.id || '';
  return Object.keys(listing.completedPlatforms)
    .filter((platformId) => listing.completedPlatforms[platformId] && platformId !== sold)
    .map((platformId) => ({ platformId, done: false }));
}
