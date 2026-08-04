import { MIN_EBAY_SHIPPING, calculateMXLABPrices } from './calculator.js';
import { GOOGLE_MIGRATION } from './seed-data.js';
import {
  ITEM_STATUSES,
  SELLING_PLATFORMS,
  createInventoryItem,
  daysInStock,
  getInventoryMetrics,
  getItemMultiplier,
  getItemProfit,
  getPlatformPerformance,
  getSlowMovers,
  inventoryToCsv,
  localDateISO,
  nextStatus,
  normalizeInventory,
  roundMoney,
  safeNumber,
} from './inventory.js';

const APP_VERSION = '2.0.0';
const CALC_STORAGE_KEY = 'mxlab-reseller-calculator-v4';
const CALC_HISTORY_KEY = 'mxlab-reseller-target-history-v1';
const HUB_PREFS_KEY = 'mxlab-reseller-hub-prefs-v1';
const INVENTORY_KEY = 'mxlab-reseller-hub-inventory-v1';
const SALES_HISTORY_KEY = 'mxlab-reseller-hub-sales-history-v1';
const BUSINESS_DATA_KEY = 'mxlab-reseller-hub-business-v1';
const GOOGLE_MIGRATION_KEY = 'mxlab-google-migration-2026-08-04-v2';

const DEFAULT_CALCULATOR = Object.freeze({
  targets: [15],
  ebayShipping: MIN_EBAY_SHIPPING,
  filter: 'all',
});

const DEFAULT_PREFS = Object.freeze({
  theme: 'dark',
  view: 'calculator',
  inventoryStatus: 'all',
  inventorySort: 'newest',
  historyPlatform: 'all',
});

const platformMeta = Object.freeze({
  vinted: { label: 'Vinted', badge: 'V' },
  wallapop: { label: 'Wallapop', badge: 'W' },
  ebay: { label: 'eBay', badge: 'eB' },
  subito: { label: 'Subito', badge: 'S' },
  facebook: { label: 'Facebook Marketplace', badge: 'FB' },
  vestiaire: { label: 'Vestiaire Collective', badge: 'VC' },
  depop: { label: 'Depop', badge: 'D' },
  depopBoost: { label: 'Depop con boost', badge: 'D+' },
  grailed: { label: 'Grailed', badge: 'G' },
});

const viewMeta = Object.freeze({
  calculator: { title: 'Calcolatore', subtitle: 'Prezzi pronti per ogni piattaforma.' },
  inventory: { title: 'Inventario', subtitle: 'Ogni capo sotto controllo.' },
  history: { title: 'Storico', subtitle: '117 vendite reali, sempre consultabili.' },
  dashboard: { title: 'Dashboard', subtitle: 'Numeri reali, decisioni migliori.' },
  data: { title: 'Dati', subtitle: 'Backup e impostazioni.' },
});

const formatters = {
  input: new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  x90: new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  whole: new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  money: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  moneyFixed: new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  date: new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
};

const elements = {
  pageTitle: document.getElementById('pageTitle'),
  pageSubtitle: document.getElementById('pageSubtitle'),
  themeIcon: document.getElementById('themeIcon'),
  toast: document.getElementById('toast'),
  calculatorSticky: document.getElementById('calculatorStickyActions'),
  targetInputs: document.getElementById('targetInputs'),
  targetTemplate: document.getElementById('targetInputTemplate'),
  ebayShipping: document.getElementById('ebayShipping'),
  results: document.getElementById('resultsContainer'),
  calculatorEmpty: document.getElementById('calculatorEmptyState'),
  recentSection: document.getElementById('recentSection'),
  recentRow: document.getElementById('recentRow'),
  resultFilter: document.getElementById('resultFilter'),
  calculatorAdvanced: document.getElementById('calculatorAdvancedSettings'),
  calculatorSettingsButton: document.getElementById('calculatorSettingsButton'),
  statusPill: document.getElementById('statusPill'),
  inventorySearch: document.getElementById('inventorySearch'),
  inventoryStatusFilters: document.getElementById('inventoryStatusFilters'),
  inventorySort: document.getElementById('inventorySort'),
  inventoryList: document.getElementById('inventoryList'),
  inventoryEmpty: document.getElementById('inventoryEmpty'),
  inventoryResultCount: document.getElementById('inventoryResultCount'),
  historySearch: document.getElementById('historySearch'),
  historyPlatformFilter: document.getElementById('historyPlatformFilter'),
  historyList: document.getElementById('historyList'),
  historyEmpty: document.getElementById('historyEmpty'),
  historyResultCount: document.getElementById('historyResultCount'),
  itemDialog: document.getElementById('itemDialog'),
  itemForm: document.getElementById('itemForm'),
  itemActionsDialog: document.getElementById('itemActionsDialog'),
  saleDialog: document.getElementById('saleDialog'),
  saleForm: document.getElementById('saleForm'),
  installDialog: document.getElementById('installDialog'),
  backupFileInput: document.getElementById('backupFileInput'),
};

let toastTimer;
let historyTimer;
let activeTargetIndex = 0;
let selectedItemId = null;
let calculator = loadCalculatorState();
let prefs = loadPrefs();
let history = loadHistory();
let inventory = loadInventory();
let salesHistory = loadSalesHistory();
let businessData = loadBusinessData();

function parseLocaleNumber(value) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function normalizeTarget(value) {
  const numeric = parseLocaleNumber(value);
  return numeric == null ? null : Math.round(numeric * 100) / 100;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function loadCalculatorState() {
  const stored = loadJson(CALC_STORAGE_KEY, null);
  const targets = Array.isArray(stored?.targets)
    ? stored.targets.map(normalizeTarget).filter((value) => value != null).slice(0, 10)
    : [...DEFAULT_CALCULATOR.targets];
  return {
    targets: targets.length ? targets : [...DEFAULT_CALCULATOR.targets],
    ebayShipping: Math.max(MIN_EBAY_SHIPPING, normalizeTarget(stored?.ebayShipping) ?? MIN_EBAY_SHIPPING),
    filter: ['all', 'prices', 'minimums', 'offers'].includes(stored?.filter) ? stored.filter : 'all',
  };
}

function loadPrefs() {
  const stored = loadJson(HUB_PREFS_KEY, {});
  const oldCalculator = loadJson(CALC_STORAGE_KEY, {});
  return {
    theme: ['dark', 'light'].includes(stored.theme) ? stored.theme : (['dark', 'light'].includes(oldCalculator.theme) ? oldCalculator.theme : DEFAULT_PREFS.theme),
    view: Object.hasOwn(viewMeta, stored.view) ? stored.view : DEFAULT_PREFS.view,
    inventoryStatus: Object.hasOwn(ITEM_STATUSES, stored.inventoryStatus) || stored.inventoryStatus === 'all' ? stored.inventoryStatus : 'all',
    inventorySort: ['newest', 'oldest', 'target-desc', 'cost-desc', 'slowest'].includes(stored.inventorySort) ? stored.inventorySort : 'newest',
    historyPlatform: typeof stored.historyPlatform === 'string' ? stored.historyPlatform : 'all',
  };
}

function loadHistory() {
  const values = loadJson(CALC_HISTORY_KEY, []);
  return Array.isArray(values) ? values.map(normalizeTarget).filter((value) => value != null).slice(0, 8) : [];
}

function loadInventory() {
  return normalizeInventory(loadJson(INVENTORY_KEY, []));
}

function normalizeSalesHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((sale) => sale && typeof sale === 'object' && sale.title && sale.platform).map((sale, index) => ({
    id: String(sale.id || `sale-${index + 1}`),
    date: String(sale.date || ''),
    platform: String(sale.platform || 'Altro'),
    title: String(sale.title || '').trim(),
    price: Math.max(0, roundMoney(sale.price)),
    country: String(sale.country || '').trim(),
    currency: sale.currency === 'USD' ? 'USD' : 'EUR',
    source: String(sale.source || '').trim(),
  }));
}

function loadSalesHistory() {
  return normalizeSalesHistory(loadJson(SALES_HISTORY_KEY, []));
}

function loadBusinessData() {
  const stored = loadJson(BUSINESS_DATA_KEY, null);
  return stored && typeof stored === 'object' ? stored : { lots: [], suppliers: [], expenses: [], checklist: [] };
}

function saveCalculator() {
  const previous = loadJson(CALC_STORAGE_KEY, {});
  try {
    localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify({ ...previous, ...calculator, theme: prefs.theme }));
  } catch { /* localStorage may be unavailable. */ }
}

function savePrefs() {
  try { localStorage.setItem(HUB_PREFS_KEY, JSON.stringify(prefs)); } catch { /* App remains usable. */ }
  saveCalculator();
}

function saveHistory() {
  try { localStorage.setItem(CALC_HISTORY_KEY, JSON.stringify(history)); } catch { /* App remains usable. */ }
}

function saveInventory() {
  try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); } catch {
    showToast('Spazio locale insufficiente');
  }
}

function saveSalesHistory() {
  try { localStorage.setItem(SALES_HISTORY_KEY, JSON.stringify(salesHistory)); } catch { showToast('Spazio locale insufficiente'); }
}

function saveBusinessData() {
  try { localStorage.setItem(BUSINESS_DATA_KEY, JSON.stringify(businessData)); } catch { showToast('Spazio locale insufficiente'); }
}

function formatTarget(value) { return formatters.input.format(value); }
function euroX90(value) { return `${formatters.x90.format(value)} €`; }
function euroWhole(value) { return `${formatters.whole.format(value)} €`; }
function dollarWhole(value) { return `${formatters.whole.format(value)} $`; }
function formatMoney(value, fixed = false) { return (fixed ? formatters.moneyFixed : formatters.money).format(value || 0); }

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : formatters.date.format(date);
}

function platformValue(key, value) {
  if (key === 'grailed') return dollarWhole(value);
  if (['subito', 'facebook', 'vestiaire'].includes(key)) return euroWhole(value);
  return euroX90(value);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 1900);
}

async function copyText(text, successMessage = 'Copiato') {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  showToast(successMessage);
}

async function shareText(text, title = 'MXLAB') {
  if (!text) return;
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copyText(text, 'Condivisione non disponibile: copiato');
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  document.body.classList.add('dialog-open');
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  if (![elements.itemDialog, elements.itemActionsDialog, elements.saleDialog, elements.installDialog].some((item) => item.open)) {
    document.body.classList.remove('dialog-open');
  }
}

function navigate(view, options = {}) {
  if (!Object.hasOwn(viewMeta, view)) return;
  prefs.view = view;
  savePrefs();
  document.querySelectorAll('.view').forEach((section) => {
    const active = section.dataset.view === view;
    section.hidden = !active;
    section.classList.toggle('active', active);
  });
  document.querySelectorAll('.bottom-nav [data-nav]').forEach((button) => {
    const active = button.dataset.nav === view;
    button.classList.toggle('active', active);
    active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
  });
  elements.pageTitle.textContent = viewMeta[view].title;
  elements.pageSubtitle.textContent = viewMeta[view].subtitle;
  elements.calculatorSticky.hidden = view !== 'calculator' || getCalculatorModels().length === 0;
  if (view === 'inventory') renderInventory();
  if (view === 'history') renderSalesHistory();
  if (view === 'dashboard') renderDashboard();
  if (view === 'data') renderSettings();
  if (!options.keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

function applyTheme() {
  document.documentElement.dataset.theme = prefs.theme;
  elements.themeIcon.textContent = prefs.theme === 'dark' ? '☀' : '☾';
  document.getElementById('themeSettingLabel').textContent = prefs.theme === 'dark' ? 'Scuro' : 'Chiaro';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', prefs.theme === 'dark' ? '#090b10' : '#f4f5f7');
}

function toggleTheme() {
  prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
  savePrefs();
  applyTheme();
}

// CALCULATOR
function addToHistory(value) {
  const normalized = normalizeTarget(value);
  if (normalized == null || normalized <= 0) return;
  history = [normalized, ...history.filter((item) => item !== normalized)].slice(0, 8);
  saveHistory();
  renderHistory();
}

function scheduleHistory(value) {
  window.clearTimeout(historyTimer);
  historyTimer = window.setTimeout(() => addToHistory(value), 700);
}

function createTargetInput(value, index) {
  const fragment = elements.targetTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.target-input-row');
  const input = fragment.querySelector('.target-input');
  const badge = fragment.querySelector('.target-number');
  const remove = fragment.querySelector('.remove-target-button');
  row.dataset.index = String(index);
  badge.textContent = String(index + 1);
  input.value = value == null ? '' : formatTarget(value);
  input.setAttribute('aria-label', `Prezzo target ${index + 1}`);
  input.addEventListener('focus', () => { activeTargetIndex = index; });
  input.addEventListener('input', () => {
    activeTargetIndex = index;
    calculator.targets[index] = normalizeTarget(input.value);
    saveCalculator();
    renderCalculatorResults();
    scheduleHistory(calculator.targets[index]);
  });
  input.addEventListener('blur', () => {
    const normalized = normalizeTarget(input.value);
    calculator.targets[index] = normalized;
    input.value = normalized == null ? '' : formatTarget(normalized);
    saveCalculator();
    renderCalculatorResults();
    addToHistory(normalized);
  });
  remove.addEventListener('click', () => {
    calculator.targets.splice(index, 1);
    if (!calculator.targets.length) calculator.targets = [15];
    activeTargetIndex = Math.min(activeTargetIndex, calculator.targets.length - 1);
    saveCalculator();
    renderTargetInputs();
    renderCalculatorResults();
    showToast('Target rimosso');
  });
  return fragment;
}

function renderTargetInputs(focusLast = false) {
  elements.targetInputs.replaceChildren(...calculator.targets.map(createTargetInput));
  if (focusLast) elements.targetInputs.querySelectorAll('.target-input')[calculator.targets.length - 1]?.focus();
}

function setTarget(index, value) {
  const normalized = Math.max(0, Math.round(value * 100) / 100);
  calculator.targets[index] = normalized;
  saveCalculator();
  addToHistory(normalized);
  renderTargetInputs();
  renderCalculatorResults();
}

function getCalculatorModels() {
  return calculator.targets
    .map(normalizeTarget)
    .filter((target) => target != null)
    .map((target) => calculateMXLABPrices(target, calculator.ebayShipping));
}

function calculatorRowMarkup({ key, value, kind, labelPrefix = '' }) {
  const meta = platformMeta[key];
  const formatted = platformValue(key, value);
  const label = `${labelPrefix}${meta.label}`;
  return `
    <button class="result-row" type="button" data-copy-value="${formatted}" data-kind="${kind}" aria-label="Copia ${escapeHtml(label)}: ${formatted}">
      <span class="platform-badge" aria-hidden="true">${meta.badge}</span>
      <span class="platform-name">${escapeHtml(label)}</span>
      <strong>${formatted}</strong>
      <span class="copy-row-button" aria-hidden="true">⧉</span>
    </button>`;
}

function calculatorCardMarkup(model, index) {
  const { prices, minimums, offers } = model;
  const targetText = `${formatTarget(model.target)} €`;
  const priceRows = [
    ['vinted', prices.vinted], ['wallapop', prices.wallapop], ['ebay', prices.ebay], ['subito', prices.subito],
    ['facebook', prices.facebook], ['vestiaire', prices.vestiaire], ['depop', prices.depop],
    ['depopBoost', prices.depopBoost], ['grailed', prices.grailed],
  ].map(([key, value]) => calculatorRowMarkup({ key, value, kind: 'price' })).join('');
  const minimumRows = [
    ['ebay', minimums.ebay], ['depop', minimums.depop], ['depopBoost', minimums.depopBoost], ['grailed', minimums.grailed],
  ].map(([key, value]) => calculatorRowMarkup({ key, value, kind: 'minimum', labelPrefix: 'Minimo ' })).join('');
  const offerRows = [
    ['ebay', offers.ebay], ['depop', offers.depop], ['depopBoost', offers.depopBoost],
  ].map(([key, value]) => calculatorRowMarkup({ key, value, kind: 'offer', labelPrefix: 'Offerta ' })).join('');

  return `
    <article class="result-card" data-target-index="${index}">
      <header class="result-card-head">
        <div><p class="target-label">TARGET ${index + 1}</p><h3>${targetText}</h3></div>
        <div class="card-actions">
          <button class="card-action add-target-item" type="button" data-target-index="${index}" aria-label="Crea articolo con target ${targetText}">＋</button>
          <button class="card-action share-target" type="button" data-target-index="${index}" aria-label="Condividi risultati">↗</button>
          <button class="card-action copy-target" type="button" data-target-index="${index}" aria-label="Copia risultati">⧉</button>
        </div>
      </header>
      <div class="summary-grid" aria-label="Prezzi principali">
        <div class="summary-item"><span>Vinted</span><strong>${euroX90(prices.vinted)}</strong></div>
        <div class="summary-item"><span>eBay</span><strong>${euroX90(prices.ebay)}</strong></div>
        <div class="summary-item"><span>Depop</span><strong>${euroX90(prices.depop)}</strong></div>
        <div class="summary-item"><span>Grailed</span><strong>${dollarWhole(prices.grailed)}</strong></div>
      </div>
      <section class="result-group" data-group="prices"><p class="group-title">PREZZI DI PUBBLICAZIONE</p>${priceRows}</section>
      <section class="result-group" data-group="minimums"><p class="group-title">MINIMI ACCETTABILI</p>${minimumRows}</section>
      <section class="result-group" data-group="offers"><p class="group-title">OFFERTE AUTOMATICHE</p>${offerRows}</section>
    </article>`;
}

function buildCalculatorText(model) {
  const { prices, minimums, offers } = model;
  return [
    'PREZZI', '', `Prezzo Target: ${formatTarget(model.target)} €`, '',
    `• Vinted: ${euroX90(prices.vinted)}`, `• Wallapop: ${euroX90(prices.wallapop)}`,
    `• eBay: ${euroX90(prices.ebay)}`, `• Subito: ${euroWhole(prices.subito)}`,
    `• Facebook Marketplace: ${euroWhole(prices.facebook)}`, `• Vestiaire Collective: ${euroWhole(prices.vestiaire)}`,
    `• Depop: ${euroX90(prices.depop)}`, `• Depop con boost: ${euroX90(prices.depopBoost)}`,
    `• Grailed: ${dollarWhole(prices.grailed)}`, '', 'MINIMI ACCETTABILI', '',
    `• Minimo eBay: ${euroX90(minimums.ebay)}`, `• Minimo Depop: ${euroX90(minimums.depop)}`,
    `• Minimo Depop con boost: ${euroX90(minimums.depopBoost)}`, `• Minimo Grailed: ${dollarWhole(minimums.grailed)}`, '',
    'OFFERTE AUTOMATICHE', '', `• Offerta automatica eBay: ${euroX90(offers.ebay)}`,
    `• Offerta automatica Depop: ${euroX90(offers.depop)}`, `• Offerta automatica Depop con boost: ${euroX90(offers.depopBoost)}`,
  ].join('\n');
}

function allCalculatorText() {
  return getCalculatorModels().map(buildCalculatorText).join('\n\n────────────────────\n\n');
}

function applyCalculatorFilter() {
  document.querySelectorAll('.result-group').forEach((group) => {
    group.hidden = calculator.filter !== 'all' && group.dataset.group !== calculator.filter;
  });
  document.querySelectorAll('.summary-grid').forEach((summary) => {
    summary.hidden = !['all', 'prices'].includes(calculator.filter);
  });
  elements.resultFilter.querySelectorAll('button').forEach((button) => {
    const active = button.dataset.filter === calculator.filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function renderCalculatorResults() {
  const models = getCalculatorModels();
  elements.calculatorEmpty.hidden = models.length > 0;
  elements.calculatorSticky.hidden = prefs.view !== 'calculator' || models.length === 0;
  elements.results.classList.toggle('multi', models.length > 1);
  elements.results.innerHTML = models.map(calculatorCardMarkup).join('');
  elements.results.querySelectorAll('.result-row').forEach((row) => row.addEventListener('click', () => copyText(row.dataset.copyValue, 'Prezzo copiato')));
  elements.results.querySelectorAll('.copy-target').forEach((button) => button.addEventListener('click', () => copyText(buildCalculatorText(models[Number(button.dataset.targetIndex)]), 'Scheda copiata')));
  elements.results.querySelectorAll('.share-target').forEach((button) => button.addEventListener('click', () => shareText(buildCalculatorText(models[Number(button.dataset.targetIndex)]), 'Prezzi MXLAB')));
  elements.results.querySelectorAll('.add-target-item').forEach((button) => button.addEventListener('click', () => openItemDialog(null, models[Number(button.dataset.targetIndex)].target)));
  applyCalculatorFilter();
}

function renderHistory() {
  elements.recentSection.hidden = history.length === 0;
  elements.recentRow.innerHTML = history.map((value) => `<button type="button" data-history="${value}">${formatTarget(value)} €</button>`).join('');
  elements.recentRow.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => setTarget(activeTargetIndex, Number(button.dataset.history))));
}

// INVENTORY
function renderPlatformToggles(selected = []) {
  const container = document.getElementById('itemPlatforms');
  container.innerHTML = SELLING_PLATFORMS.map((platform) => `
    <label class="platform-toggle">
      <input type="checkbox" value="${escapeHtml(platform)}" ${selected.includes(platform) ? 'checked' : ''} />
      <span>${escapeHtml(platform)}</span>
    </label>`).join('');
}

function resetItemForm() {
  elements.itemForm.reset();
  document.getElementById('itemId').value = '';
  document.getElementById('itemCategory').value = 'Polo';
  document.getElementById('itemCondition').value = 'Ottime';
  document.getElementById('itemPurchaseDate').value = localDateISO();
  document.getElementById('itemStatus').value = 'prep';
  document.getElementById('itemDialogTitle').textContent = 'Nuovo articolo';
  renderPlatformToggles([]);
  updateItemTargetPreview();
}

function openItemDialog(item = null, presetTarget = null) {
  closeDialog(elements.itemActionsDialog);
  resetItemForm();
  if (item) {
    document.getElementById('itemDialogTitle').textContent = `Modifica ${item.code}`;
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemBrand').value = item.brand;
    document.getElementById('itemTitle').value = item.title;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemSize').value = item.size;
    document.getElementById('itemCondition').value = item.condition;
    document.getElementById('itemCost').value = formatTarget(item.cost);
    document.getElementById('itemTarget').value = formatTarget(item.target);
    document.getElementById('itemSource').value = item.source;
    document.getElementById('itemPurchaseDate').value = item.purchaseDate;
    document.getElementById('itemStatus').value = item.status;
    document.getElementById('itemNotes').value = item.notes;
    renderPlatformToggles(item.platforms);
  } else if (presetTarget != null) {
    document.getElementById('itemTarget').value = formatTarget(presetTarget);
  }
  updateItemTargetPreview();
  openDialog(elements.itemDialog);
  window.setTimeout(() => document.getElementById('itemBrand').focus(), 100);
}

function updateItemTargetPreview() {
  const target = normalizeTarget(document.getElementById('itemTarget').value);
  const preview = document.getElementById('itemTargetPreview');
  const value = preview.querySelector('strong');
  if (target == null) {
    value.textContent = '—';
    return;
  }
  value.textContent = euroX90(calculateMXLABPrices(target, calculator.ebayShipping).prices.vinted);
}

function collectItemForm() {
  const existingId = document.getElementById('itemId').value;
  const existing = inventory.find((item) => item.id === existingId);
  const selectedPlatforms = [...document.querySelectorAll('#itemPlatforms input:checked')].map((input) => input.value);
  return {
    ...(existing || {}),
    id: existingId || undefined,
    brand: document.getElementById('itemBrand').value,
    title: document.getElementById('itemTitle').value,
    category: document.getElementById('itemCategory').value,
    size: document.getElementById('itemSize').value,
    condition: document.getElementById('itemCondition').value,
    cost: document.getElementById('itemCost').value,
    target: document.getElementById('itemTarget').value,
    source: document.getElementById('itemSource').value,
    purchaseDate: document.getElementById('itemPurchaseDate').value,
    status: document.getElementById('itemStatus').value,
    platforms: selectedPlatforms,
    notes: document.getElementById('itemNotes').value,
    sale: existing?.sale || null,
  };
}

function inventoryCardMarkup(item) {
  const age = daysInStock(item);
  const status = ITEM_STATUSES[item.status];
  const prices = calculateMXLABPrices(item.target, calculator.ebayShipping).prices;
  const profit = getItemProfit(item);
  const multiplier = getItemMultiplier(item);
  const agingClass = item.status !== 'sold' && age >= 90 ? 'critical' : item.status !== 'sold' && age >= 60 ? 'warning' : item.status !== 'sold' && age >= 30 ? 'aging' : '';
  const platformChips = item.platforms.slice(0, 3).map((platform) => `<span>${escapeHtml(platform)}</span>`).join('');
  const extraPlatforms = item.platforms.length > 3 ? `<span>+${item.platforms.length - 3}</span>` : '';
  const provisional = item.costProvisional ? '<em class="provisional-badge">PROVVISORIO</em>' : '';
  const soldMeta = item.status === 'sold' && item.sale
    ? `<div class="inventory-financial sold-financial"><span>Profitto ${provisional}<strong>${formatMoney(profit)}</strong></span><span>${multiplier ? `${formatTarget(multiplier)}×` : '—'}</span></div>`
    : `<div class="inventory-financial"><span>Costo ${provisional}<strong>${formatMoney(item.cost)}</strong></span><span>${item.targetInferred ? 'Target stimato' : 'Target'} <strong>${item.target > 0 ? formatMoney(item.target) : 'Da inserire'}</strong></span><span>Vinted <strong>${item.target > 0 ? euroX90(prices.vinted) : '—'}</strong></span></div>`;

  return `
    <article class="inventory-card ${item.status === 'sold' ? 'sold-card' : ''}" data-item-id="${item.id}">
      <button class="inventory-card-main" type="button" data-item-action="open">
        <div class="inventory-card-topline">
          <div class="item-identity">
            <span class="item-avatar">${escapeHtml((item.brand || '?').slice(0, 2).toUpperCase())}</span>
            <div>
              <p>${escapeHtml(item.code)} · ${escapeHtml(item.category)}</p>
              <h3>${escapeHtml(item.brand)}</h3>
              <span>${escapeHtml(item.title)}${item.size ? ` · Taglia ${escapeHtml(item.size)}` : ''}</span>
            </div>
          </div>
          <span class="status-badge status-${item.status}">${escapeHtml(status.label)}</span>
        </div>
        ${soldMeta}
        <div class="inventory-card-bottom">
          <div class="platform-chips">${item.lotCode ? `<span>${escapeHtml(item.lotCode)}</span>` : ''}${platformChips}${extraPlatforms || (!item.platforms.length ? '<span>Nessuna piattaforma</span>' : '')}</div>
          <span class="age-label ${agingClass}">${item.status === 'sold' && item.sale?.date ? `Venduto in ${age}g` : item.status === 'sold' ? 'Data vendita assente' : `${age}g in stock`}</span>
        </div>
      </button>
      <button class="inventory-more" type="button" data-item-action="more" aria-label="Azioni per ${escapeHtml(item.code)}">•••</button>
    </article>`;
}

function getFilteredInventory() {
  const query = elements.inventorySearch.value.trim().toLowerCase();
  let result = inventory.filter((item) => prefs.inventoryStatus === 'all' || item.status === prefs.inventoryStatus);
  if (query) {
    result = result.filter((item) => [item.code, item.brand, item.title, item.category, item.size, item.source]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }
  result.sort((a, b) => {
    if (prefs.inventorySort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (prefs.inventorySort === 'target-desc') return b.target - a.target;
    if (prefs.inventorySort === 'cost-desc') return b.cost - a.cost;
    if (prefs.inventorySort === 'slowest') return daysInStock(b) - daysInStock(a);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  return result;
}

function renderInventoryCounts() {
  const metrics = getInventoryMetrics(inventory);
  document.getElementById('countAll').textContent = metrics.total;
  document.getElementById('countPrep').textContent = metrics.byStatus.prep;
  document.getElementById('countPhoto').textContent = metrics.byStatus.photo;
  document.getElementById('countPublish').textContent = metrics.byStatus.publish;
  document.getElementById('countLive').textContent = metrics.byStatus.live;
  document.getElementById('countSold').textContent = metrics.byStatus.sold;
  document.getElementById('inventoryAvailableKpi').textContent = metrics.available;
  document.getElementById('inventoryInvestedKpi').textContent = formatMoney(metrics.invested);
  document.getElementById('inventoryTargetKpi').textContent = formatMoney(metrics.targetValue);
}

function bindInventoryCards() {
  elements.inventoryList.querySelectorAll('[data-item-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('[data-item-id]');
      const item = inventory.find((entry) => entry.id === card?.dataset.itemId);
      if (!item) return;
      if (button.dataset.itemAction === 'open') openItemDialog(item);
      else openItemActions(item);
    });
  });
}

function renderInventory() {
  renderInventoryCounts();
  elements.inventoryStatusFilters.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.status === prefs.inventoryStatus));
  elements.inventorySort.value = prefs.inventorySort;
  const filtered = getFilteredInventory();
  elements.inventoryEmpty.hidden = inventory.length > 0;
  elements.inventoryList.hidden = filtered.length === 0;
  elements.inventoryResultCount.textContent = filtered.length === 1 ? '1 articolo' : `${filtered.length} articoli`;
  if (inventory.length > 0 && filtered.length === 0) {
    elements.inventoryList.hidden = false;
    elements.inventoryList.innerHTML = '<div class="empty-state">Nessun articolo corrisponde ai filtri.</div>';
    return;
  }
  elements.inventoryList.innerHTML = filtered.map(inventoryCardMarkup).join('');
  bindInventoryCards();
}

function openItemActions(item) {
  selectedItemId = item.id;
  document.getElementById('actionsItemCode').textContent = item.code;
  document.getElementById('actionsItemTitle').textContent = `${item.brand} · ${item.title}`;
  const next = nextStatus(item.status);
  const advance = document.getElementById('advanceStatusButton');
  advance.disabled = item.status === 'live' || item.status === 'sold';
  document.getElementById('advanceStatusLabel').textContent = advance.disabled ? 'Nessun passaggio successivo' : `Passa a “${ITEM_STATUSES[next].label}”`;
  document.getElementById('markSoldButton').disabled = item.status === 'sold';
  openDialog(elements.itemActionsDialog);
}

function selectedItem() {
  return inventory.find((item) => item.id === selectedItemId) || null;
}

function openSaleDialog(item) {
  if (!item) return;
  closeDialog(elements.itemActionsDialog);
  selectedItemId = item.id;
  document.getElementById('salePlatform').value = item.platforms[0] || 'Vinted';
  syncSaleCurrencyAndPrice(true);
  document.getElementById('saleNet').value = formatTarget(item.target);
  document.getElementById('saleDate').value = localDateISO();
  updateSalePreview();
  openDialog(elements.saleDialog);
}

function updateSalePreview() {
  const item = selectedItem();
  if (!item) return;
  const net = safeNumber(document.getElementById('saleNet').value, 0);
  const profit = roundMoney(net - item.cost);
  const multiplier = item.cost > 0 ? Math.round((net / item.cost) * 100) / 100 : null;
  document.getElementById('saleProfitPreview').textContent = formatMoney(profit, true);
  document.getElementById('saleProfitPreview').classList.toggle('negative', profit < 0);
  document.getElementById('saleMultiplierPreview').textContent = multiplier == null ? '—' : `${formatTarget(multiplier)}×`;
}

function calculateItemInCalculator(item) {
  if (!item) return;
  calculator.targets = [item.target];
  activeTargetIndex = 0;
  saveCalculator();
  renderTargetInputs();
  renderCalculatorResults();
  closeDialog(elements.itemActionsDialog);
  closeDialog(elements.itemDialog);
  navigate('calculator');
  showToast(`${item.code} aperto nel calcolatore`);
}


function recommendedSalePrice(item, platform) {
  const prices = calculateMXLABPrices(item.target, calculator.ebayShipping).prices;
  const map = {
    Vinted: prices.vinted,
    Wallapop: prices.wallapop,
    eBay: prices.ebay,
    Subito: prices.subito,
    'Facebook Marketplace': prices.facebook,
    'Vestiaire Collective': prices.vestiaire,
    Depop: prices.depop,
    'Depop con boost': prices.depopBoost,
    Grailed: prices.grailed,
  };
  return map[platform] ?? item.target;
}

function syncSaleCurrencyAndPrice(resetPrice = false) {
  const item = selectedItem();
  if (!item) return;
  const platform = document.getElementById('salePlatform').value;
  const isDollar = platform === 'Grailed';
  document.getElementById('salePricePrefix').textContent = isDollar ? '$' : '€';
  if (resetPrice) document.getElementById('salePrice').value = formatTarget(recommendedSalePrice(item, platform));
}


// SALES HISTORY + GOOGLE SHEETS MIGRATION
function getSalesMetrics(sales = salesHistory) {
  const revenue = roundMoney(sales.reduce((sum, sale) => sum + safeNumber(sale.price), 0));
  const byPlatformMap = new Map();
  const byCountryMap = new Map();
  sales.forEach((sale) => {
    const platform = sale.platform || 'Altro';
    const current = byPlatformMap.get(platform) || { platform, sales: 0, revenue: 0 };
    current.sales += 1;
    current.revenue = roundMoney(current.revenue + sale.price);
    byPlatformMap.set(platform, current);
    if (sale.country) byCountryMap.set(sale.country, (byCountryMap.get(sale.country) || 0) + 1);
  });
  const byPlatform = [...byPlatformMap.values()].sort((a, b) => b.sales - a.sales || b.revenue - a.revenue);
  const byCountry = [...byCountryMap.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
  const prices = sales.map((sale) => sale.price).filter(Number.isFinite);
  return {
    count: sales.length,
    revenue,
    average: sales.length ? roundMoney(revenue / sales.length) : 0,
    highest: prices.length ? Math.max(...prices) : 0,
    lowest: prices.length ? Math.min(...prices) : 0,
    byPlatform,
    byCountry,
  };
}

function salesHistoryToCsv(sales = salesHistory) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [['Data', 'Piattaforma', 'Articolo', 'Prezzo vendita', 'Paese'], ...sales.map((sale) => [sale.date, sale.platform, sale.title, sale.price, sale.country])];
  return rows.map((row) => row.map(escape).join(';')).join('\n');
}

function populateHistoryPlatformFilter() {
  const platforms = [...new Set(salesHistory.map((sale) => sale.platform))].sort((a, b) => a.localeCompare(b, 'it'));
  elements.historyPlatformFilter.innerHTML = '<option value="all">Tutte le piattaforme</option>' + platforms.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`).join('');
  if (platforms.includes(prefs.historyPlatform)) elements.historyPlatformFilter.value = prefs.historyPlatform;
  else { prefs.historyPlatform = 'all'; elements.historyPlatformFilter.value = 'all'; savePrefs(); }
}

function getFilteredSalesHistory() {
  const query = elements.historySearch.value.trim().toLowerCase();
  return salesHistory
    .filter((sale) => prefs.historyPlatform === 'all' || sale.platform === prefs.historyPlatform)
    .filter((sale) => !query || [sale.title, sale.platform, sale.country, sale.date].some((value) => String(value || '').toLowerCase().includes(query)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.price - a.price);
}

function renderSalesHistory() {
  populateHistoryPlatformFilter();
  const metrics = getSalesMetrics(salesHistory);
  document.getElementById('historySalesKpi').textContent = metrics.count;
  document.getElementById('historyRevenueKpi').textContent = formatMoney(metrics.revenue);
  document.getElementById('historyAverageKpi').textContent = formatMoney(metrics.average);
  document.getElementById('historyPlatformChips').innerHTML = metrics.byPlatform.map((item) => `
    <button class="history-platform-chip" type="button" data-history-platform="${escapeHtml(item.platform)}">
      <strong>${escapeHtml(item.platform)}</strong><span>${item.sales} vendite</span><b>${formatMoney(item.revenue)}</b>
    </button>`).join('');
  document.querySelectorAll('[data-history-platform]').forEach((button) => button.addEventListener('click', () => {
    prefs.historyPlatform = button.dataset.historyPlatform;
    savePrefs();
    renderSalesHistory();
  }));

  const filtered = getFilteredSalesHistory();
  elements.historyResultCount.textContent = filtered.length === 1 ? '1 vendita' : `${filtered.length} vendite`;
  elements.historyEmpty.hidden = filtered.length > 0;
  elements.historyList.hidden = filtered.length === 0;
  elements.historyList.innerHTML = filtered.map((sale) => `
    <article class="history-sale-card">
      <span class="history-sale-avatar">${escapeHtml((sale.platform || '?').slice(0, 2).toUpperCase())}</span>
      <div class="history-sale-main"><h3>${escapeHtml(sale.title)}</h3><p>${escapeHtml(sale.platform)} · ${escapeHtml(sale.country || 'Paese non indicato')}</p></div>
      <div class="history-sale-price"><strong>${formatMoney(sale.price)}</strong><span>${formatDate(sale.date)}</span></div>
    </article>`).join('');
}

function mergeGoogleMigration({ silent = false } = {}) {
  const importedItems = normalizeInventory(GOOGLE_MIGRATION.inventory || []);
  const itemIndex = new Map(inventory.map((item, index) => [String(item.code).toLowerCase(), index]));
  let addedItems = 0;
  importedItems.forEach((item) => {
    const key = String(item.code).toLowerCase();
    if (itemIndex.has(key)) {
      const index = itemIndex.get(key);
      const current = inventory[index];
      inventory[index] = createInventoryItem({ ...item, ...current, id: current.id, code: current.code, createdAt: current.createdAt }, inventory);
    } else {
      inventory.push(item);
      itemIndex.set(key, inventory.length - 1);
      addedItems += 1;
    }
  });

  const saleIndex = new Map(salesHistory.map((sale, index) => [sale.id, index]));
  let addedSales = 0;
  normalizeSalesHistory(GOOGLE_MIGRATION.salesHistory || []).forEach((sale) => {
    if (saleIndex.has(sale.id)) salesHistory[saleIndex.get(sale.id)] = sale;
    else { salesHistory.push(sale); saleIndex.set(sale.id, salesHistory.length - 1); addedSales += 1; }
  });
  businessData = typeof structuredClone === 'function' ? structuredClone(GOOGLE_MIGRATION.business || {}) : JSON.parse(JSON.stringify(GOOGLE_MIGRATION.business || {}));
  saveInventory();
  saveSalesHistory();
  saveBusinessData();
  try { localStorage.setItem(GOOGLE_MIGRATION_KEY, GOOGLE_MIGRATION.generatedAt || new Date().toISOString()); } catch { /* no-op */ }
  renderInventory();
  renderSalesHistory();
  renderDashboard();
  renderBusinessData();
  if (!silent) showToast(`Importati ${addedItems} articoli e ${addedSales} vendite`);
}

function ensureGoogleMigration() {
  const migrated = localStorage.getItem(GOOGLE_MIGRATION_KEY);
  if (!migrated) mergeGoogleMigration({ silent: true });
}

function renderBusinessData() {
  const lots = Array.isArray(businessData.lots) ? businessData.lots : [];
  const suppliers = Array.isArray(businessData.suppliers) ? businessData.suppliers : [];
  const expenses = Array.isArray(businessData.expenses) ? businessData.expenses : [];
  const checklist = Array.isArray(businessData.checklist) ? businessData.checklist : [];
  const openHigh = checklist.filter((task) => String(task.status).toLowerCase() !== 'fatto' && String(task.priority).toLowerCase() === 'alta').length;
  const expenseTotal = roundMoney(expenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0));
  const netLots = roundMoney(lots.reduce((sum, lot) => sum + safeNumber(lot.netCost || lot.grossCost), 0));
  document.getElementById('businessSummaryGrid').innerHTML = `
    <article><span>Costo netto lotti</span><strong>${formatMoney(netLots)}</strong></article>
    <article><span>Spese generali</span><strong>${formatMoney(expenseTotal)}</strong></article>
    <article><span>Task alta priorità</span><strong>${openHigh}</strong></article>`;
  const details = [];
  lots.forEach((lot) => details.push(`<article class="business-detail-card"><header><h4>Lotto ${escapeHtml(lot.code)}</h4><span>${escapeHtml(lot.status || '')}</span></header><p>${lot.quantity} articoli · costo netto ${formatMoney(lot.netCost || lot.grossCost)} · rimborso ${formatMoney(lot.refund)} · media provvisoria ${formatMoney(lot.provisionalUnitCost)}</p></article>`));
  suppliers.forEach((supplier) => details.push(`<article class="business-detail-card"><header><h4>${escapeHtml(supplier.name)}</h4><span>${escapeHtml(supplier.status || '')}</span></header><p>${escapeHtml(supplier.order)} · ${supplier.receivedItems} ricevuti · ${supplier.soldItems} venduti · ${formatMoney(supplier.revenue)} ricavi registrati</p></article>`));
  expenses.forEach((expense) => details.push(`<article class="business-detail-card"><header><h4>${escapeHtml(expense.category)}</h4><span>${formatMoney(expense.amount)}</span></header><p>${escapeHtml(expense.description)}</p></article>`));
  document.getElementById('businessDetailList').innerHTML = details.join('') || '<p class="dashboard-empty">Nessun dato attività importato.</p>';
  const status = document.getElementById('googleImportStatus');
  if (status) status.textContent = `${inventory.length} articoli operativi, ${salesHistory.length} vendite storiche, ${lots.length} lotti e ${suppliers.length} fornitori.`;
}

// DASHBOARD
function pipelineMarkup(metrics) {
  const statuses = ['prep', 'photo', 'publish', 'live', 'sold'];
  const maximum = Math.max(1, ...statuses.map((status) => metrics.byStatus[status]));
  return statuses.map((status) => {
    const count = metrics.byStatus[status];
    const width = count === 0 ? 0 : Math.max(8, (count / maximum) * 100);
    return `
      <button type="button" data-pipeline-status="${status}">
        <span class="pipeline-label"><span>${escapeHtml(ITEM_STATUSES[status].label)}</span><strong>${count}</strong></span>
        <span class="pipeline-track"><span class="pipeline-fill status-${status}" style="width:${width}%"></span></span>
      </button>`;
  }).join('');
}

function renderDashboard() {
  const metrics = getInventoryMetrics(inventory);
  const historic = getSalesMetrics(salesHistory);
  const historicSummary = document.getElementById('historicDashboardSummary');
  if (historicSummary) historicSummary.innerHTML = `
    <article><span>Vendite</span><strong>${historic.count}</strong></article>
    <article><span>Incasso</span><strong>${formatMoney(historic.revenue)}</strong></article>
    <article><span>Prezzo medio</span><strong>${formatMoney(historic.average)}</strong></article>`;
  document.getElementById('kpiProfit').textContent = formatMoney(metrics.realizedProfit);
  document.getElementById('kpiProfitSub').textContent = metrics.sold === 1 ? '1 vendita' : `${metrics.sold} vendite`;
  document.getElementById('kpiInvested').textContent = formatMoney(metrics.invested);
  document.getElementById('kpiTargetValue').textContent = formatMoney(metrics.targetValue);
  document.getElementById('kpiExpectedProfit').textContent = `Utile potenziale ${formatMoney(metrics.expectedProfit)}`;
  document.getElementById('kpiAvgDays').textContent = metrics.averageDays == null ? '—' : `${metrics.averageDays} giorni`;
  document.getElementById('kpiAvgMultiplier').textContent = metrics.averageMultiplier == null ? 'Moltiplicatore medio —' : `Moltiplicatore medio ${formatTarget(metrics.averageMultiplier)}×`;

  const pipeline = document.getElementById('pipelineChart');
  pipeline.innerHTML = pipelineMarkup(metrics);
  pipeline.querySelectorAll('[data-pipeline-status]').forEach((button) => button.addEventListener('click', () => {
    prefs.inventoryStatus = button.dataset.pipelineStatus;
    savePrefs();
    navigate('inventory');
  }));

  const slow = getSlowMovers(inventory, 30).slice(0, 5);
  document.getElementById('attentionCount').textContent = slow.length;
  document.getElementById('attentionCard').classList.toggle('empty-attention', slow.length === 0);
  document.getElementById('slowMoversList').innerHTML = slow.length
    ? slow.map((item) => `<button type="button" data-dashboard-item="${item.id}"><span><strong>${escapeHtml(item.brand)} · ${escapeHtml(item.title)}</strong><small>${escapeHtml(item.code)} · ${escapeHtml(ITEM_STATUSES[item.status].label)}</small></span><em>${daysInStock(item)}g</em></button>`).join('')
    : '<p class="dashboard-empty">Nessun articolo fermo da almeno 30 giorni.</p>';

  const performance = getPlatformPerformance(inventory);
  const maxProfit = Math.max(1, ...performance.map((item) => Math.max(0, item.profit)));
  document.getElementById('platformPerformance').innerHTML = performance.length
    ? performance.map((item) => `<div class="performance-row"><div><span><strong>${escapeHtml(item.platform)}</strong><small>${item.sales} ${item.sales === 1 ? 'vendita' : 'vendite'} · ${formatMoney(item.revenue)} incassati</small></span><em>${formatMoney(item.profit)}</em></div><span class="performance-track"><span style="width:${Math.max(5, (Math.max(0, item.profit) / maxProfit) * 100)}%"></span></span></div>`).join('')
    : '<p class="dashboard-empty">Le performance appariranno dopo la prima vendita.</p>';

  const recentSales = inventory
    .filter((item) => item.status === 'sold' && item.sale)
    .sort((a, b) => String(b.sale.date).localeCompare(String(a.sale.date)))
    .slice(0, 5);
  document.getElementById('recentSalesList').innerHTML = recentSales.length
    ? recentSales.map((item) => `<button type="button" data-dashboard-item="${item.id}"><span><strong>${escapeHtml(item.brand)} · ${escapeHtml(item.title)}</strong><small>${escapeHtml(item.sale.platform)} · ${formatDate(item.sale.date)}</small></span><em>${formatMoney(getItemProfit(item))}</em></button>`).join('')
    : '<p class="dashboard-empty">Nessuna vendita registrata.</p>';

  document.querySelectorAll('[data-dashboard-item]').forEach((button) => button.addEventListener('click', () => {
    const item = inventory.find((entry) => entry.id === button.dataset.dashboardItem);
    if (item) openItemActions(item);
  }));
  document.querySelectorAll('[data-open-history]').forEach((button) => button.addEventListener('click', () => navigate('history')));
}

// DATA
function renderSettings() {
  applyTheme();
  renderBusinessData();
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv() {
  if (!inventory.length) return showToast('Inventario vuoto');
  const csv = `\uFEFF${inventoryToCsv(inventory)}`;
  downloadFile(`mxlab-inventario-${localDateISO()}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('CSV esportato');
}

function exportSalesHistoryCsv() {
  if (!salesHistory.length) return showToast('Storico vendite vuoto');
  const csv = `﻿${salesHistoryToCsv(salesHistory)}`;
  downloadFile(`mxlab-storico-vendite-${localDateISO()}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('Storico CSV esportato');
}

function exportBackup() {
  const backup = {
    app: 'MXLAB Reseller Hub',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    inventory,
    salesHistory,
    businessData,
    calculator,
    history,
    prefs,
  };
  downloadFile(`mxlab-backup-${localDateISO()}.json`, JSON.stringify(backup, null, 2), 'application/json');
  showToast('Backup scaricato');
}

async function importBackup(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (!Array.isArray(backup.inventory)) throw new Error('Backup non valido');
    inventory = normalizeInventory(backup.inventory);
    salesHistory = normalizeSalesHistory(backup.salesHistory || []);
    businessData = backup.businessData && typeof backup.businessData === 'object' ? backup.businessData : { lots: [], suppliers: [], expenses: [], checklist: [] };
    if (backup.calculator) {
      calculator.targets = Array.isArray(backup.calculator.targets) ? backup.calculator.targets.map(normalizeTarget).filter((value) => value != null) : calculator.targets;
      calculator.ebayShipping = Math.max(MIN_EBAY_SHIPPING, normalizeTarget(backup.calculator.ebayShipping) ?? calculator.ebayShipping);
      calculator.filter = ['all', 'prices', 'minimums', 'offers'].includes(backup.calculator.filter) ? backup.calculator.filter : calculator.filter;
    }
    history = Array.isArray(backup.history) ? backup.history.map(normalizeTarget).filter((value) => value != null).slice(0, 8) : history;
    if (backup.prefs?.theme && ['dark', 'light'].includes(backup.prefs.theme)) prefs.theme = backup.prefs.theme;
    saveInventory(); saveSalesHistory(); saveBusinessData(); saveCalculator(); saveHistory(); savePrefs();
    renderTargetInputs(); renderCalculatorResults(); renderHistory(); renderInventory(); renderSalesHistory(); renderDashboard(); renderBusinessData(); applyTheme();
    showToast('Backup ripristinato');
  } catch {
    showToast('File di backup non valido');
  } finally {
    elements.backupFileInput.value = '';
  }
}

function populateSalePlatforms() {
  const select = document.getElementById('salePlatform');
  select.innerHTML = SELLING_PLATFORMS.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`).join('');
}

function initializeEvents() {
  document.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.nav)));
  document.getElementById('brandButton').addEventListener('click', () => navigate('dashboard'));
  document.getElementById('themeButton').addEventListener('click', toggleTheme);
  document.getElementById('toggleThemeRow').addEventListener('click', toggleTheme);
  document.getElementById('quickAddButton').addEventListener('click', () => openItemDialog());
  document.getElementById('addInventoryButton').addEventListener('click', () => openItemDialog());
  document.getElementById('inventoryEmptyAddButton').addEventListener('click', () => openItemDialog());
  document.getElementById('dashboardAddButton').addEventListener('click', () => openItemDialog());

  document.getElementById('addTargetButton').addEventListener('click', () => {
    const base = calculator.targets[activeTargetIndex] ?? 15;
    calculator.targets.push(base);
    activeTargetIndex = calculator.targets.length - 1;
    saveCalculator();
    renderTargetInputs(true);
    renderCalculatorResults();
  });
  document.querySelectorAll('[data-adjust]').forEach((button) => button.addEventListener('click', () => {
    const current = normalizeTarget(calculator.targets[activeTargetIndex]) ?? 0;
    setTarget(activeTargetIndex, current + Number(button.dataset.adjust));
  }));
  document.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => setTarget(activeTargetIndex, Number(button.dataset.preset))));
  elements.resultFilter.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    calculator.filter = button.dataset.filter;
    saveCalculator();
    applyCalculatorFilter();
  });
  elements.calculatorSettingsButton.addEventListener('click', () => {
    const open = elements.calculatorSettingsButton.getAttribute('aria-expanded') === 'true';
    elements.calculatorSettingsButton.setAttribute('aria-expanded', String(!open));
    elements.calculatorAdvanced.hidden = open;
  });
  elements.ebayShipping.addEventListener('input', () => {
    calculator.ebayShipping = Math.max(MIN_EBAY_SHIPPING, normalizeTarget(elements.ebayShipping.value) ?? MIN_EBAY_SHIPPING);
    saveCalculator(); renderCalculatorResults();
  });
  elements.ebayShipping.addEventListener('blur', () => {
    calculator.ebayShipping = Math.max(MIN_EBAY_SHIPPING, normalizeTarget(elements.ebayShipping.value) ?? MIN_EBAY_SHIPPING);
    elements.ebayShipping.value = formatters.x90.format(calculator.ebayShipping);
    saveCalculator(); renderCalculatorResults();
  });
  document.getElementById('copyCalculatorButton').addEventListener('click', () => allCalculatorText() ? copyText(allCalculatorText(), 'Tutti i risultati copiati') : showToast('Inserisci un target'));
  document.getElementById('shareCalculatorButton').addEventListener('click', () => allCalculatorText() ? shareText(allCalculatorText(), 'Prezzi MXLAB') : showToast('Inserisci un target'));
  document.getElementById('resetCalculatorButton').addEventListener('click', () => {
    calculator.targets = [null]; calculator.ebayShipping = MIN_EBAY_SHIPPING; activeTargetIndex = 0;
    saveCalculator(); renderTargetInputs(); elements.ebayShipping.value = formatters.x90.format(calculator.ebayShipping); renderCalculatorResults(); showToast('Nuovo calcolo pronto');
  });
  document.getElementById('clearHistoryButton').addEventListener('click', () => { history = []; saveHistory(); renderHistory(); showToast('Cronologia cancellata'); });

  elements.inventorySearch.addEventListener('input', renderInventory);
  elements.inventoryStatusFilters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-status]');
    if (!button) return;
    prefs.inventoryStatus = button.dataset.status;
    savePrefs(); renderInventory();
  });
  elements.inventorySort.addEventListener('change', () => { prefs.inventorySort = elements.inventorySort.value; savePrefs(); renderInventory(); });
  elements.historySearch.addEventListener('input', renderSalesHistory);
  elements.historyPlatformFilter.addEventListener('change', () => { prefs.historyPlatform = elements.historyPlatformFilter.value; savePrefs(); renderSalesHistory(); });
  document.getElementById('exportHistoryCsvButton').addEventListener('click', exportSalesHistoryCsv);

  document.getElementById('itemTarget').addEventListener('input', updateItemTargetPreview);
  document.getElementById('openFullCalculatorFromItem').addEventListener('click', () => {
    const target = normalizeTarget(document.getElementById('itemTarget').value);
    if (target == null) return showToast('Inserisci il target');
    calculator.targets = [target]; activeTargetIndex = 0; saveCalculator(); renderTargetInputs(); renderCalculatorResults(); closeDialog(elements.itemDialog); navigate('calculator');
  });
  elements.itemForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = collectItemForm();
    if (!payload.brand.trim() || !payload.title.trim()) return showToast('Completa marca e descrizione');
    const existingIndex = inventory.findIndex((item) => item.id === payload.id);
    const item = createInventoryItem(payload, inventory);
    if (existingIndex >= 0) inventory[existingIndex] = item;
    else inventory.unshift(item);
    saveInventory(); closeDialog(elements.itemDialog); renderInventory(); renderDashboard(); showToast(existingIndex >= 0 ? 'Articolo aggiornato' : `${item.code} aggiunto`);
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => closeDialog(document.getElementById(button.dataset.closeDialog))));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('close', () => {
    if (![elements.itemDialog, elements.itemActionsDialog, elements.saleDialog, elements.installDialog].some((item) => item.open)) document.body.classList.remove('dialog-open');
  }));

  document.getElementById('advanceStatusButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    const next = nextStatus(item.status); if (next === item.status) return;
    item.status = next; item.updatedAt = new Date().toISOString(); saveInventory(); closeDialog(elements.itemActionsDialog); renderInventory(); renderDashboard(); showToast(`Ora: ${ITEM_STATUSES[next].label}`);
  });
  document.getElementById('markSoldButton').addEventListener('click', () => openSaleDialog(selectedItem()));
  document.getElementById('editItemButton').addEventListener('click', () => openItemDialog(selectedItem()));
  document.getElementById('duplicateItemButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    closeDialog(elements.itemActionsDialog);
    const copy = { ...item, id: undefined, code: undefined, status: 'prep', sale: null, platforms: [] };
    openItemDialog(copy);
    document.getElementById('itemId').value = '';
    document.getElementById('itemDialogTitle').textContent = 'Duplica articolo';
  });
  document.getElementById('calculateItemButton').addEventListener('click', () => calculateItemInCalculator(selectedItem()));
  document.getElementById('deleteItemButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    if (!window.confirm(`Eliminare definitivamente ${item.code}?`)) return;
    inventory = inventory.filter((entry) => entry.id !== item.id); saveInventory(); closeDialog(elements.itemActionsDialog); renderInventory(); renderDashboard(); showToast('Articolo eliminato');
  });

  document.getElementById('salePlatform').addEventListener('change', () => { syncSaleCurrencyAndPrice(true); updateSalePreview(); });
  ['salePrice', 'saleNet'].forEach((id) => document.getElementById(id).addEventListener('input', () => {
    if (id === 'salePrice' && document.activeElement?.id === 'salePrice') document.getElementById('saleNet').value = document.getElementById('salePrice').value;
    updateSalePreview();
  }));
  elements.saleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const item = selectedItem(); if (!item) return;
    item.status = 'sold';
    item.sale = {
      platform: document.getElementById('salePlatform').value,
      price: roundMoney(document.getElementById('salePrice').value),
      net: roundMoney(document.getElementById('saleNet').value),
      date: document.getElementById('saleDate').value || localDateISO(),
      currency: document.getElementById('salePlatform').value === 'Grailed' ? 'USD' : 'EUR',
    };
    if (!item.platforms.includes(item.sale.platform)) item.platforms.push(item.sale.platform);
    item.updatedAt = new Date().toISOString();
    saveInventory(); closeDialog(elements.saleDialog); renderInventory(); renderDashboard(); showToast(`Vendita registrata: ${formatMoney(getItemProfit(item))} di profitto`);
  });

  document.getElementById('exportCsvButton').addEventListener('click', exportCsv);
  document.getElementById('exportBackupButton').addEventListener('click', exportBackup);
  document.getElementById('importGoogleDataButton').addEventListener('click', () => mergeGoogleMigration());
  document.getElementById('importBackupButton').addEventListener('click', () => elements.backupFileInput.click());
  elements.backupFileInput.addEventListener('change', () => importBackup(elements.backupFileInput.files?.[0]));
  document.getElementById('installHelpButton').addEventListener('click', () => openDialog(elements.installDialog));
  document.getElementById('deleteAllDataButton').addEventListener('click', () => {
    if (!window.confirm('Eliminare inventario, cronologia e impostazioni MXLAB?')) return;
    if (!window.confirm('Confermi? Non sarà possibile recuperare i dati senza un backup.')) return;
    inventory = []; salesHistory = []; businessData = { lots: [], suppliers: [], expenses: [], checklist: [] }; history = []; calculator = { ...DEFAULT_CALCULATOR, targets: [15] }; prefs = { ...DEFAULT_PREFS };
    [INVENTORY_KEY, SALES_HISTORY_KEY, BUSINESS_DATA_KEY, GOOGLE_MIGRATION_KEY, CALC_HISTORY_KEY, CALC_STORAGE_KEY, HUB_PREFS_KEY].forEach((key) => localStorage.removeItem(key));
    saveCalculator(); savePrefs(); renderTargetInputs(); renderHistory(); renderCalculatorResults(); renderInventory(); renderSalesHistory(); renderDashboard(); renderBusinessData(); applyTheme(); navigate('calculator'); showToast('Dati eliminati');
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    elements.statusPill.textContent = 'Solo online';
    return;
  }
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js?v=6');
      elements.statusPill.textContent = navigator.onLine ? 'Offline pronto' : 'Modalità offline';
      registration.update();
    } catch {
      elements.statusPill.textContent = 'Solo online';
    }
  });
  window.addEventListener('online', () => { elements.statusPill.textContent = 'Offline pronto'; });
  window.addEventListener('offline', () => { elements.statusPill.textContent = 'Modalità offline'; });
}

function initialize() {
  ensureGoogleMigration();
  applyTheme();
  populateSalePlatforms();
  renderTargetInputs();
  renderHistory();
  elements.ebayShipping.value = formatters.x90.format(calculator.ebayShipping);
  renderCalculatorResults();
  renderInventory();
  renderSalesHistory();
  renderDashboard();
  renderBusinessData();
  initializeEvents();
  navigate(prefs.view, { keepScroll: true });
  registerServiceWorker();
}

initialize();
