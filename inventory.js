import { normalizeListing } from './listing.js';

export const ITEM_STATUSES = Object.freeze({
  prep: { label: 'Da preparare', short: 'Preparare', order: 0 },
  photo: { label: 'Foto pronte', short: 'Foto', order: 1 },
  publish: { label: 'Da pubblicare', short: 'Pubblicare', order: 2 },
  live: { label: 'Pubblicato', short: 'Online', order: 3 },
  sold: { label: 'Venduto', short: 'Venduto', order: 4 },
});

export const SELLING_PLATFORMS = Object.freeze([
  'Vinted',
  'Wallapop',
  'eBay',
  'Subito',
  'Facebook Marketplace',
  'Vestiaire Collective',
  'Depop',
  'Depop con boost',
  'Grailed',
]);


const BRAND_INFERENCE_RULES = Object.freeze([
  [/\btommy\s+jeans\b/i, 'Tommy Jeans'],
  [/\btommy\s+hilfiger\b/i, 'Tommy Hilfiger'],
  [/\bpolo\s+(?:by\s+)?ralph\s+lauren\b/i, 'Polo Ralph Lauren'],
  [/\bu\.?s\.?\s+polo\s+assn\.?\b/i, 'U.S. Polo Assn.'],
  [/\breebok\s+classic\b/i, 'Reebok Classic'],
  [/\bg\.?a\.?p\.?\s+company\b/i, 'G.A.P. Company'],
  [/\bralph\s+lauren\b/i, 'Ralph Lauren'],
  [/\bcarhartt\b/i, 'Carhartt'],
  [/\baustralian\b/i, 'Australian'],
  [/\badidas\b/i, 'Adidas'],
  [/\blacoste\b/i, 'Lacoste'],
  [/\blevi(?:’|'|)s\b/i, 'Levi’s'],
  [/\btommy\b/i, 'Tommy Hilfiger'],
]);

const CATEGORY_INFERENCE_RULES = Object.freeze([
  [/\bt[- ]?shirt\b/i, 'T-shirt'],
  [/\bpolo\b/i, 'Polo'],
  [/\bcamicia\b/i, 'Camicia'],
  [/\bgilet\b|\bsmanicato\b/i, 'Gilet'],
  [/\bbermuda\b|\bpantaloncini\b|\bshorts?\b/i, 'Shorts'],
  [/\bjeans?\b/i, 'Jeans'],
  [/\bpantaloni?\b/i, 'Pantaloni'],
  [/\bfelpa\b/i, 'Felpa'],
  [/\bmaglione\b|\bcardigan\b/i, 'Maglione'],
  [/\bgiacca\b|\bgiubbotto\b|\bblazer\b|\bbomber\b/i, 'Giacca'],
  [/\bscarpe\b|\bsneakers?\b|\bstivali?\b|\bsandali?\b|\bd[ée]collet[ée]\b/i, 'Scarpe'],
  [/\bborsa\b|\bsciarpa\b|\bfoulard\b|\bcintura\b|\bportafoglio\b/i, 'Accessorio'],
]);

export function isPlaceholderBrand(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'senza marca' || normalized === 'non indicata' || normalized === 'non indicato';
}

export function inferBrandFromTitle(title) {
  const value = String(title || '').trim();
  if (!value) return '';
  return BRAND_INFERENCE_RULES.find(([pattern]) => pattern.test(value))?.[1] || '';
}

export function inferCategoryFromTitle(title) {
  const value = String(title || '').trim();
  if (!value) return '';
  return CATEGORY_INFERENCE_RULES.find(([pattern]) => pattern.test(value))?.[1] || '';
}

export function safeNumber(value, fallback = 0) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function roundMoney(value) {
  return Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;
}

export function localDateISO(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function createItemCode(items = []) {
  const maximum = items.reduce((current, item) => {
    const match = String(item.code ?? '').match(/MX-(\d+)/i);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `MX-${String(maximum + 1).padStart(4, '0')}`;
}

export function normalizeTargetHistory(value, currentTarget = 0, fallbackDate = localDateISO()) {
  const entries = Array.isArray(value) ? value : [];
  const normalized = entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      target: Math.max(0, roundMoney(entry.target)),
      date: String(entry.date || fallbackDate).slice(0, 10),
      kind: entry.kind === 'initial' ? 'initial' : 'change',
    }))
    .filter((entry) => entry.target > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  if (!normalized.length && currentTarget > 0) {
    normalized.push({ target: Math.max(0, roundMoney(currentTarget)), date: String(fallbackDate || localDateISO()).slice(0, 10), kind: 'initial' });
  }
  return normalized;
}

export function createInventoryItem(input, items = []) {
  const now = new Date().toISOString();
  const id = input.id || globalThis.crypto?.randomUUID?.() || `mx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const status = ITEM_STATUSES[input.status] ? input.status : 'prep';
  const cost = Math.max(0, roundMoney(input.cost));
  const target = Math.max(0, roundMoney(input.target));
  const targetHistory = normalizeTargetHistory(input.targetHistory, target, String(input.createdAt || now).slice(0, 10));
  const platforms = Array.isArray(input.platforms) ? [...new Set(input.platforms.map(String))] : [];
  const listing = normalizeListing(input.listing);
  if (status === 'live' && !Object.keys(listing.completedPlatforms).length && platforms.length) {
    const ids = { Vinted: 'vinted', Wallapop: 'wallapop', eBay: 'ebay', Subito: 'subito', 'Facebook Marketplace': 'facebook', 'Vestiaire Collective': 'vestiaire', Depop: 'depop', 'Depop con boost': 'depop', Grailed: 'grailed' };
    platforms.forEach((platform) => { if (ids[platform]) listing.completedPlatforms[ids[platform]] = true; });
    if (listing.completedPlatforms.vestiaire) listing.vestiaireEnabled = true;
  }
  const sale = input.sale && status === 'sold'
    ? {
        platform: String(input.sale.platform || 'Vinted'),
        price: Math.max(0, roundMoney(input.sale.price)),
        net: Math.max(0, roundMoney(input.sale.net)),
        date: input.sale.date || '',
        currency: input.sale.currency === 'USD' ? 'USD' : 'EUR',
      }
    : null;

  return {
    id,
    code: input.code || createItemCode(items),
    brand: String(input.brand || inferBrandFromTitle(input.title) || '').trim(),
    title: String(input.title || '').trim(),
    category: String((!input.category || input.category === 'Altro') ? (inferCategoryFromTitle(input.title) || 'Altro') : input.category).trim(),
    size: String(input.size || '').trim(),
    condition: String(input.condition || 'Ottime').trim(),
    cost,
    target,
    targetHistory,
    listing,
    source: String(input.source || '').trim(),
    purchaseDate: input.purchaseDate || localDateISO(),
    receivedDate: input.receivedDate || '',
    status,
    platforms,
    notes: String(input.notes || '').trim(),
    lotCode: String(input.lotCode || '').trim(),
    costProvisional: Boolean(input.costProvisional),
    listingPrice: input.listingPrice == null || input.listingPrice === '' ? null : Math.max(0, roundMoney(input.listingPrice)),
    minimumPrice: input.minimumPrice == null || input.minimumPrice === '' ? null : Math.max(0, roundMoney(input.minimumPrice)),
    photosDone: Boolean(input.photosDone),
    removedElsewhere: Boolean(input.removedElsewhere),
    lastPriceDrop: input.lastPriceDrop || '',
    nextAction: String(input.nextAction || '').trim(),
    targetInferred: Boolean(input.targetInferred),
    targetSource: String(input.targetSource || '').trim(),
    migrationRevision: Math.max(0, Math.trunc(safeNumber(input.migrationRevision, 0))),
    sale,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

export function normalizeInventory(items) {
  if (!Array.isArray(items)) return [];
  const normalized = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = createInventoryItem(raw, normalized);
    item.createdAt = raw.createdAt || item.createdAt;
    item.updatedAt = raw.updatedAt || item.updatedAt;
    normalized.push(item);
  }
  return normalized;
}

export function daysBetween(startDate, endDate = localDateISO()) {
  if (!startDate) return 0;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export function daysInStock(item, today = localDateISO()) {
  const end = item.status === 'sold' && item.sale?.date ? item.sale.date : today;
  return daysBetween(item.receivedDate || item.purchaseDate, end);
}

export function getItemProfit(item) {
  if (item.status !== 'sold' || !item.sale) return null;
  return roundMoney(item.sale.net - item.cost);
}

export function getItemMultiplier(item) {
  if (item.status !== 'sold' || !item.sale || item.cost <= 0) return null;
  return Math.round((item.sale.net / item.cost) * 100) / 100;
}

export function getInventoryMetrics(items, today = localDateISO()) {
  const unsold = items.filter((item) => item.status !== 'sold');
  const sold = items.filter((item) => item.status === 'sold' && item.sale);
  const invested = roundMoney(unsold.reduce((sum, item) => sum + item.cost, 0));
  const targetValue = roundMoney(unsold.reduce((sum, item) => sum + item.target, 0));
  const realizedProfit = roundMoney(sold.reduce((sum, item) => sum + (getItemProfit(item) || 0), 0));
  const soldWithDays = sold.filter((item) => item.purchaseDate && item.sale?.date);
  const averageDays = soldWithDays.length
    ? Math.round(soldWithDays.reduce((sum, item) => sum + daysInStock(item, today), 0) / soldWithDays.length)
    : null;
  const soldWithMultiplier = sold.filter((item) => getItemMultiplier(item) != null);
  const averageMultiplier = soldWithMultiplier.length
    ? Math.round((soldWithMultiplier.reduce((sum, item) => sum + getItemMultiplier(item), 0) / soldWithMultiplier.length) * 100) / 100
    : null;

  const byStatus = Object.fromEntries(Object.keys(ITEM_STATUSES).map((status) => [status, 0]));
  items.forEach((item) => { byStatus[item.status] = (byStatus[item.status] || 0) + 1; });

  return {
    total: items.length,
    available: unsold.length,
    sold: sold.length,
    invested,
    targetValue,
    expectedProfit: roundMoney(targetValue - invested),
    realizedProfit,
    averageDays,
    averageMultiplier,
    byStatus,
  };
}

export function getSlowMovers(items, minimumDays = 30, today = localDateISO()) {
  return items
    .filter((item) => item.status !== 'sold' && daysInStock(item, today) >= minimumDays)
    .sort((a, b) => daysInStock(b, today) - daysInStock(a, today));
}

export function getPlatformPerformance(items) {
  const map = new Map();
  items.filter((item) => item.status === 'sold' && item.sale).forEach((item) => {
    const key = item.sale.platform || 'Altro';
    const current = map.get(key) || { platform: key, sales: 0, revenue: 0, profit: 0 };
    current.sales += 1;
    current.revenue = roundMoney(current.revenue + item.sale.net);
    current.profit = roundMoney(current.profit + (getItemProfit(item) || 0));
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => b.profit - a.profit || b.sales - a.sales);
}

export function nextStatus(status) {
  const flow = ['prep', 'photo', 'publish', 'live'];
  const index = flow.indexOf(status);
  if (index < 0 || index === flow.length - 1) return status;
  return flow[index + 1];
}

export function inventoryToCsv(items) {
  const headers = [
    'Codice', 'Marca', 'Descrizione', 'Categoria', 'Taglia', 'Condizioni', 'Costo acquisto', 'Prezzo target',
    'Fornitore', 'Data acquisto', 'Data ricezione', 'Stato', 'Data vendita', 'Piattaforma vendita',
    'Prezzo vendita', 'Valuta vendita', 'Incasso netto', 'Profitto', 'Moltiplicatore', 'Giorni in stock', 'Note',
  ];

  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = items.map((item) => [
    item.code, item.brand, item.title, item.category, item.size, item.condition,
    item.cost, item.target, item.source, item.purchaseDate, item.receivedDate || '', ITEM_STATUSES[item.status]?.label || item.status,
    item.sale?.date || '', item.sale?.platform || '', item.sale?.price ?? '', item.sale?.currency || '', item.sale?.net ?? '',
    getItemProfit(item) ?? '', getItemMultiplier(item) ?? '', daysInStock(item), item.notes,
  ]);

  return [headers, ...rows].map((row) => row.map(escape).join(';')).join('\n');
}
