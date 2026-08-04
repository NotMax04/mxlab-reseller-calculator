export const ITEM_STATUSES = Object.freeze({
  prep: { label: 'Da preparare', short: 'Preparare', order: 0 },
  photo: { label: 'Da fotografare', short: 'Foto', order: 1 },
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

export function createInventoryItem(input, items = []) {
  const now = new Date().toISOString();
  const id = input.id || globalThis.crypto?.randomUUID?.() || `mx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const status = ITEM_STATUSES[input.status] ? input.status : 'prep';
  const cost = Math.max(0, roundMoney(input.cost));
  const target = Math.max(0, roundMoney(input.target));
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
    brand: String(input.brand || '').trim(),
    title: String(input.title || '').trim(),
    category: String(input.category || 'Altro').trim(),
    size: String(input.size || '').trim(),
    condition: String(input.condition || 'Ottime').trim(),
    cost,
    target,
    source: String(input.source || '').trim(),
    purchaseDate: input.purchaseDate || localDateISO(),
    status,
    platforms: Array.isArray(input.platforms) ? [...new Set(input.platforms.map(String))] : [],
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
  return daysBetween(item.purchaseDate, end);
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
    'Fornitore', 'Data acquisto', 'Stato', 'Piattaforme', 'Data vendita', 'Piattaforma vendita',
    'Prezzo vendita', 'Valuta vendita', 'Incasso netto', 'Profitto', 'Moltiplicatore', 'Giorni in stock', 'Note',
  ];

  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = items.map((item) => [
    item.code, item.brand, item.title, item.category, item.size, item.condition,
    item.cost, item.target, item.source, item.purchaseDate, ITEM_STATUSES[item.status]?.label || item.status,
    item.platforms.join(' | '), item.sale?.date || '', item.sale?.platform || '', item.sale?.price ?? '', item.sale?.currency || '', item.sale?.net ?? '',
    getItemProfit(item) ?? '', getItemMultiplier(item) ?? '', daysInStock(item), item.notes,
  ]);

  return [headers, ...rows].map((row) => row.map(escape).join(';')).join('\n');
}
