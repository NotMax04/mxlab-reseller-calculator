import { MIN_EBAY_SHIPPING, calculateMXLABPrices } from './calculator.js';
import { GOOGLE_MIGRATION } from './seed-data.js';
import {
  PUBLISH_PLATFORMS,
  createRemovalChecklist,
  formatListingText,
  generateBaseDescription,
  generatePlatformContent,
  getPlatform,
  getPublishPlan,
  listingReadiness,
  markPlatformComplete,
  normalizeListing,
} from './listing.js';
import {
  addItemPhotos,
  clearAllPhotos,
  deleteItemPhotos,
  deletePhoto,
  getItemPhotos,
  photoToFile,
  setCoverPhoto,
} from './media-store.js';
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
  inferBrandFromTitle,
  inferCategoryFromTitle,
  inventoryToCsv,
  isPlaceholderBrand,
  localDateISO,
  nextStatus,
  normalizeInventory,
  roundMoney,
  safeNumber,
} from './inventory.js';

const APP_VERSION = '3.0.0';
const CALC_STORAGE_KEY = 'mxlab-reseller-calculator-v4';
const CALC_HISTORY_KEY = 'mxlab-reseller-target-history-v1';
const HUB_PREFS_KEY = 'mxlab-reseller-hub-prefs-v1';
const INVENTORY_KEY = 'mxlab-reseller-hub-inventory-v1';
const SALES_HISTORY_KEY = 'mxlab-reseller-hub-sales-history-v1';
const BUSINESS_DATA_KEY = 'mxlab-reseller-hub-business-v1';
const GOOGLE_MIGRATION_KEY = 'mxlab-google-migration-2026-08-04-v2';
const DATA_REPAIR_KEY = 'mxlab-data-quality-repair-2026-08-04-v4';

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
  lastSalePlatform: 'Vinted',
  facebookEnabled: true,
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

const DIRECT_PAYOUT_PLATFORMS = Object.freeze(['Vinted', 'Wallapop', 'Subito', 'Facebook Marketplace']);

const viewMeta = Object.freeze({
  calculator: { title: 'Calcolatore', subtitle: 'Prezzi pronti per ogni piattaforma.' },
  inventory: { title: 'Inventario', subtitle: 'Ogni capo sotto controllo.' },
  publish: { title: 'Pubblica', subtitle: 'Foto, testi e prezzi in un solo flusso.' },
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
  appVersionLabel: document.getElementById('appVersionLabel'),
  inventorySearch: document.getElementById('inventorySearch'),
  inventoryStatusFilters: document.getElementById('inventoryStatusFilters'),
  inventorySort: document.getElementById('inventorySort'),
  inventoryList: document.getElementById('inventoryList'),
  inventoryEmpty: document.getElementById('inventoryEmpty'),
  inventoryResultCount: document.getElementById('inventoryResultCount'),
  publishSearch: document.getElementById('publishSearch'),
  publishList: document.getElementById('publishList'),
  publishEmpty: document.getElementById('publishEmpty'),
  publishResultCount: document.getElementById('publishResultCount'),
  facebookEnabled: document.getElementById('facebookEnabled'),
  historySearch: document.getElementById('historySearch'),
  historyPlatformFilter: document.getElementById('historyPlatformFilter'),
  historyList: document.getElementById('historyList'),
  historyEmpty: document.getElementById('historyEmpty'),
  historyResultCount: document.getElementById('historyResultCount'),
  itemDialog: document.getElementById('itemDialog'),
  itemForm: document.getElementById('itemForm'),
  itemActionsDialog: document.getElementById('itemActionsDialog'),
  targetDialog: document.getElementById('targetDialog'),
  targetForm: document.getElementById('targetForm'),
  saleDialog: document.getElementById('saleDialog'),
  saleForm: document.getElementById('saleForm'),
  listingDialog: document.getElementById('listingDialog'),
  listingPhotoInput: document.getElementById('listingPhotoInput'),
  listingPhotoGrid: document.getElementById('listingPhotoGrid'),
  listingPlatformCards: document.getElementById('listingPlatformCards'),
  removalDialog: document.getElementById('removalDialog'),
  removalChecklist: document.getElementById('removalChecklist'),
  installDialog: document.getElementById('installDialog'),
  backupFileInput: document.getElementById('backupFileInput'),
};

let toastTimer;
let historyTimer;
let activeTargetIndex = 0;
let selectedItemId = null;
let activeItemStep = 0;
let lockedScrollY = 0;
let viewportSyncFrame = 0;
let calculator = loadCalculatorState();
let prefs = loadPrefs();
let history = loadHistory();
let inventory = loadInventory();
let salesHistory = loadSalesHistory();
let businessData = loadBusinessData();
let activeListingPhotos = [];
let listingObjectUrls = [];

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
    lastSalePlatform: SELLING_PLATFORMS.includes(stored.lastSalePlatform) ? stored.lastSalePlatform : 'Vinted',
    facebookEnabled: stored.facebookEnabled !== false,
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

function lockPageScroll() {
  if (document.body.classList.contains('dialog-open')) return;
  lockedScrollY = Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0));
  document.body.style.position = 'fixed';
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.classList.add('dialog-open');
}

function unlockPageScroll() {
  if (!document.body.classList.contains('dialog-open')) return;
  document.body.classList.remove('dialog-open');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, lockedScrollY);
}

function dismissKeyboard() {
  const active = document.activeElement;
  if (active && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)) active.blur();
}

function openDialog(dialog) {
  if (!dialog) return;
  lockPageScroll();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  syncAppViewport();
}

function closeDialog(dialog) {
  if (!dialog) return;
  dismissKeyboard();
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  if (![elements.itemDialog, elements.itemActionsDialog, elements.targetDialog, elements.saleDialog, elements.listingDialog, elements.removalDialog, elements.installDialog].some((item) => item.open)) {
    unlockPageScroll();
    document.documentElement.classList.remove('keyboard-open');
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
  if (view === 'publish') renderPublish();
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
function setItemStep(step, { focus = false } = {}) {
  const steps = [...document.querySelectorAll('[data-form-step]')];
  activeItemStep = Math.max(0, Math.min(steps.length - 1, Number(step) || 0));
  steps.forEach((section, index) => {
    const active = index === activeItemStep;
    section.hidden = !active;
    section.classList.toggle('active', active);
  });
  document.querySelectorAll('[data-item-step]').forEach((button, index) => {
    const active = index === activeItemStep;
    const completed = index < activeItemStep;
    button.classList.toggle('active', active);
    button.classList.toggle('completed', completed);
    button.setAttribute('aria-current', active ? 'step' : 'false');
  });
  document.getElementById('itemStepCounter').textContent = `${activeItemStep + 1} DI ${steps.length}`;
  document.getElementById('itemBackButton').disabled = activeItemStep === 0;
  document.getElementById('itemNextButton').hidden = activeItemStep === steps.length - 1;
  document.getElementById('saveItemButton').hidden = activeItemStep !== steps.length - 1;
  const body = document.getElementById('itemWizardBody');
  if (body) body.scrollTop = 0;
  if (focus) {
    window.setTimeout(() => {
      const field = steps[activeItemStep]?.querySelector('input:not([type="hidden"]), select, textarea');
      field?.focus({ preventScroll: true });
    }, 120);
  }
}

function validateItemStep(step) {
  const requiredByStep = [
    ['itemTitle', 'itemBrand'],
    ['itemCost'],
    ['itemTarget'],
  ];
  for (const id of requiredByStep[step] || []) {
    const input = document.getElementById(id);
    if (!input || String(input.value || '').trim()) continue;
    input.focus({ preventScroll: true });
    input.reportValidity?.();
    showToast(step === 0 ? 'Completa nome e marca' : step === 1 ? 'Inserisci il costo' : 'Inserisci il target');
    return false;
  }
  if (step === 1 && normalizeTarget(document.getElementById('itemCost').value) == null) {
    showToast('Costo non valido');
    return false;
  }
  if (step === 2 && (normalizeTarget(document.getElementById('itemTarget').value) ?? 0) <= 0) {
    showToast('Target non valido');
    return false;
  }
  return true;
}

function resetItemForm() {
  elements.itemForm.reset();
  document.getElementById('itemId').value = '';
  document.getElementById('itemBrand').dataset.auto = 'true';
  document.getElementById('itemCategory').dataset.auto = 'true';
  document.getElementById('itemCategory').value = 'Altro';
  document.getElementById('itemCondition').value = 'Ottime';
  document.getElementById('itemPurchaseDate').value = localDateISO();
  document.getElementById('itemReceivedDate').value = '';
  document.getElementById('itemStatus').value = 'prep';
  document.getElementById('itemDialogTitle').textContent = 'Nuovo articolo';
  const identityHint = document.getElementById('identitySuggestionHint');
  if (identityHint) identityHint.textContent = 'Esempio: “Bermuda cargo Carhartt”.';
  setItemStep(0);
  updateItemTargetPreview();
}

function openItemDialog(item = null, presetTarget = null) {
  closeDialog(elements.itemActionsDialog);
  resetItemForm();
  if (item) {
    document.getElementById('itemDialogTitle').textContent = item.code ? `Modifica ${item.code}` : 'Duplica articolo';
    document.getElementById('itemId').value = item.id || '';
    document.getElementById('itemBrand').value = item.brand;
    document.getElementById('itemBrand').dataset.auto = 'false';
    document.getElementById('itemTitle').value = item.title;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemCategory').dataset.auto = 'false';
    document.getElementById('itemSize').value = item.size;
    document.getElementById('itemCondition').value = item.condition;
    document.getElementById('itemCost').value = formatTarget(item.cost);
    document.getElementById('itemTarget').value = item.target > 0 ? formatTarget(item.target) : '';
    document.getElementById('itemSource').value = item.source;
    document.getElementById('itemPurchaseDate').value = item.purchaseDate;
    document.getElementById('itemReceivedDate').value = item.receivedDate || '';
    document.getElementById('itemStatus').value = item.status;
    document.getElementById('itemNotes').value = item.notes;
  } else if (presetTarget != null) {
    document.getElementById('itemTarget').value = formatTarget(presetTarget);
  }
  updateItemTargetPreview();
  openDialog(elements.itemDialog);
  setItemStep(0);
}

function suggestItemIdentity() {
  const title = document.getElementById('itemTitle').value;
  const brandInput = document.getElementById('itemBrand');
  const categoryInput = document.getElementById('itemCategory');
  const brand = inferBrandFromTitle(title);
  const category = inferCategoryFromTitle(title);
  if (brand && (isPlaceholderBrand(brandInput.value) || brandInput.dataset.auto === 'true')) { brandInput.value = brand; brandInput.dataset.auto = 'true'; }
  if (category && (!categoryInput.value || categoryInput.value === 'Altro' || categoryInput.dataset.auto === 'true')) { categoryInput.value = category; categoryInput.dataset.auto = 'true'; }
  const hint = document.getElementById('identitySuggestionHint');
  if (hint) {
    const suggestions = [brand, category].filter(Boolean);
    hint.textContent = suggestions.length ? `Rilevato: ${suggestions.join(' · ')}` : 'Marca e categoria non riconosciute: compilale manualmente.';
  }
}

function updateItemTargetPreview() {
  const target = normalizeTarget(document.getElementById('itemTarget').value);
  const preview = document.getElementById('itemTargetPreview');
  const value = preview.querySelector('strong');
  if (target == null || target <= 0) {
    value.textContent = '—';
    return;
  }
  value.textContent = euroX90(calculateMXLABPrices(target, calculator.ebayShipping).prices.vinted);
}

function targetHistoryWithChange(existing, nextTarget) {
  const currentHistory = Array.isArray(existing?.targetHistory) ? existing.targetHistory.map((entry) => ({ ...entry })) : [];
  const previousTarget = roundMoney(existing?.target || 0);
  const normalizedTarget = roundMoney(nextTarget || 0);
  if (!existing || normalizedTarget <= 0) return currentHistory;
  if (!currentHistory.length && previousTarget > 0) {
    currentHistory.push({ target: previousTarget, date: String(existing.createdAt || localDateISO()).slice(0, 10), kind: 'initial' });
  }
  if (normalizedTarget !== previousTarget) {
    currentHistory.push({ target: normalizedTarget, date: localDateISO(), kind: 'change' });
  }
  return currentHistory;
}

function collectItemForm() {
  const existingId = document.getElementById('itemId').value;
  const existing = inventory.find((item) => item.id === existingId);
  const target = normalizeTarget(document.getElementById('itemTarget').value) ?? 0;
  return {
    ...(existing || {}),
    id: existingId || undefined,
    brand: document.getElementById('itemBrand').value,
    title: document.getElementById('itemTitle').value,
    category: document.getElementById('itemCategory').value,
    size: document.getElementById('itemSize').value,
    condition: document.getElementById('itemCondition').value,
    cost: document.getElementById('itemCost').value,
    target,
    targetHistory: targetHistoryWithChange(existing, target),
    listing: existing?.listing || {},
    source: document.getElementById('itemSource').value,
    purchaseDate: document.getElementById('itemPurchaseDate').value,
    receivedDate: document.getElementById('itemReceivedDate').value,
    status: document.getElementById('itemStatus').value,
    platforms: existing?.platforms || [],
    notes: document.getElementById('itemNotes').value,
    sale: existing?.sale || null,
  };
}

function inventoryCardMarkup(item) {
  const age = daysInStock(item);
  const status = ITEM_STATUSES[item.status];
  const prices = item.target > 0 ? calculateMXLABPrices(item.target, calculator.ebayShipping).prices : null;
  const profit = getItemProfit(item);
  const multiplier = getItemMultiplier(item);
  const agingClass = item.status !== 'sold' && age >= 90 ? 'critical' : item.status !== 'sold' && age >= 60 ? 'warning' : item.status !== 'sold' && age >= 30 ? 'aging' : '';
  const provisional = item.costProvisional ? '<em class="provisional-badge">PROVVISORIO</em>' : '';
  const history = Array.isArray(item.targetHistory) ? item.targetHistory : [];
  const changes = Math.max(0, history.length - 1);
  const lastChange = history.at(-1);
  const sourceChips = [item.lotCode, item.source].filter(Boolean).slice(0, 2).map((value) => `<span>${escapeHtml(value)}</span>`).join('');
  const revisionChip = changes > 0 ? `<span>${changes} ${changes === 1 ? 'ribasso' : 'modifiche prezzo'}</span>` : '';
  const soldMeta = item.status === 'sold' && item.sale
    ? `<div class="inventory-financial sold-financial"><span>Profitto ${provisional}<strong>${formatMoney(profit)}</strong></span><span>${multiplier ? `${formatTarget(multiplier)}×` : '—'}</span></div>`
    : `<div class="inventory-financial"><span>Costo ${provisional}<strong>${formatMoney(item.cost)}</strong></span><span>${item.targetInferred ? 'Target stimato' : 'Target attuale'} <strong>${item.target > 0 ? formatMoney(item.target) : 'Da inserire'}</strong></span><span>Vinted <strong>${prices ? euroX90(prices.vinted) : '—'}</strong></span></div>`;

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
          <div class="platform-chips">${sourceChips}${revisionChip || (!sourceChips ? '<span>Pubblicazione standard</span>' : '')}</div>
          <span class="age-label ${agingClass}">${item.status === 'sold' && item.sale?.date ? `Venduto in ${age}g` : item.status === 'sold' ? 'Data vendita assente' : lastChange && changes > 0 ? `Prezzo ${formatDate(lastChange.date)}` : `${age}g in stock`}</span>
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
  document.getElementById('updateTargetButton').disabled = item.status === 'sold';
  document.getElementById('publishItemButton').disabled = item.status === 'sold';
  const removalButton = document.getElementById('removeListingsButton');
  removalButton.hidden = !(item.status === 'sold' && item.listing?.removalChecklist?.length && !item.removedElsewhere);
  openDialog(elements.itemActionsDialog);
}

function selectedItem() {
  return inventory.find((item) => item.id === selectedItemId) || null;
}

function renderTargetUpdatePreview() {
  const item = selectedItem();
  if (!item) return;
  const target = normalizeTarget(document.getElementById('newTargetInput').value);
  const preview = document.getElementById('repricePreview');
  if (target == null || target <= 0) {
    preview.innerHTML = '<p>Inserisci un target valido.</p>';
    return;
  }
  const model = calculateMXLABPrices(target, calculator.ebayShipping).prices;
  preview.innerHTML = `
    <article><span>Vinted</span><strong>${euroX90(model.vinted)}</strong></article>
    <article><span>eBay</span><strong>${euroX90(model.ebay)}</strong></article>
    <article><span>Depop</span><strong>${euroX90(model.depop)}</strong></article>
    <article><span>Grailed</span><strong>${dollarWhole(model.grailed)}</strong></article>`;
}

function renderTargetHistory(item) {
  const list = document.getElementById('targetHistoryList');
  const section = document.getElementById('targetHistorySection');
  const history = Array.isArray(item?.targetHistory) ? [...item.targetHistory].reverse() : [];
  const changes = Math.max(0, history.length - 1);
  document.getElementById('targetHistoryCount').textContent = `${changes} ${changes === 1 ? 'modifica' : 'modifiche'}`;
  section.hidden = history.length === 0;
  list.innerHTML = history.map((entry, index) => `
    <div class="target-history-row">
      <span>${index === history.length - 1 ? 'Iniziale' : index === 0 ? 'Attuale' : 'Modifica'}</span>
      <strong>${formatMoney(entry.target)}</strong>
      <time>${formatDate(entry.date)}</time>
    </div>`).join('');
}

function openTargetDialog(item) {
  if (!item || item.status === 'sold') return;
  closeDialog(elements.itemActionsDialog);
  selectedItemId = item.id;
  document.getElementById('currentTargetLabel').textContent = item.target > 0 ? formatMoney(item.target) : 'Non impostato';
  document.getElementById('newTargetInput').value = item.target > 0 ? formatTarget(item.target) : '';
  renderTargetUpdatePreview();
  renderTargetHistory(item);
  openDialog(elements.targetDialog);
  window.setTimeout(() => document.getElementById('newTargetInput').focus({ preventScroll: true }), 100);
}

function saveUpdatedTarget(item, target) {
  if (!item || target == null || target <= 0) return false;
  const normalized = roundMoney(target);
  if (normalized === roundMoney(item.target)) return false;
  item.targetHistory = targetHistoryWithChange(item, normalized);
  item.target = normalized;
  item.targetInferred = false;
  item.targetSource = 'manual';
  item.lastPriceDrop = localDateISO();
  item.updatedAt = new Date().toISOString();
  return true;
}

function openSaleDialog(item) {
  if (!item) return;
  closeDialog(elements.itemActionsDialog);
  selectedItemId = item.id;
  document.getElementById('salePlatform').value = prefs.lastSalePlatform || 'Vinted';
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


// CROSS-LISTING ASSISTANT
function formatPublishPrice(content) {
  if (!content || content.price == null) return '—';
  return content.currency === 'USD' ? dollarWhole(content.price) : (Number.isInteger(content.price) ? euroWhole(content.price) : euroX90(content.price));
}

function getPublishItems() {
  const query = String(elements.publishSearch?.value || '').trim().toLowerCase();
  return inventory
    .filter((item) => item.status !== 'sold')
    .filter((item) => !query || [item.code, item.brand, item.title, item.category, item.size].some((value) => String(value || '').toLowerCase().includes(query)))
    .sort((a, b) => {
      const readyA = listingReadiness(a, a.listing?.photoCount || 0).percent;
      const readyB = listingReadiness(b, b.listing?.photoCount || 0).percent;
      return readyA - readyB || new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function publishCardMarkup(item) {
  const readiness = listingReadiness(item, item.listing?.photoCount || 0);
  const plan = getPublishPlan(item, prefs);
  const completed = plan.filter((platform) => item.listing?.completedPlatforms?.[platform.id]).length;
  const live = item.status === 'live';
  return `<article class="publish-item-card" data-publish-item="${item.id}">
    <button type="button" class="publish-item-main">
      <div class="publish-item-topline">
        <div><span class="item-code">${escapeHtml(item.code)}</span><h3>${escapeHtml(item.brand)} · ${escapeHtml(item.title)}</h3><p>${escapeHtml(item.category)}${item.size ? ` · ${escapeHtml(item.size)}` : ''}</p></div>
        <span class="publish-state ${live ? 'live' : readiness.ready ? 'ready' : ''}">${live ? 'Online' : readiness.ready ? 'Pronto' : `${readiness.percent}%`}</span>
      </div>
      <div class="publish-progress-track"><span style="width:${readiness.percent}%"></span></div>
      <div class="publish-item-meta"><span>${item.listing?.photoCount || 0} foto</span><span>${completed}/${plan.length} piattaforme</span><strong>${item.target > 0 ? formatMoney(item.target) : 'Target assente'}</strong></div>
    </button>
  </article>`;
}

function renderPublish() {
  if (!elements.publishList) return;
  elements.facebookEnabled.checked = prefs.facebookEnabled !== false;
  const items = getPublishItems();
  const all = inventory.filter((item) => item.status !== 'sold');
  const ready = all.filter((item) => listingReadiness(item, item.listing?.photoCount || 0).ready && item.status !== 'live').length;
  const live = all.filter((item) => item.status === 'live').length;
  document.getElementById('publishPendingKpi').textContent = Math.max(0, all.length - ready - live);
  document.getElementById('publishReadyKpi').textContent = ready;
  document.getElementById('publishLiveKpi').textContent = live;
  elements.publishResultCount.textContent = items.length === 1 ? '1 articolo' : `${items.length} articoli`;
  elements.publishEmpty.hidden = items.length > 0;
  elements.publishList.hidden = items.length === 0;
  elements.publishList.innerHTML = items.map(publishCardMarkup).join('');
  elements.publishList.querySelectorAll('[data-publish-item]').forEach((card) => card.addEventListener('click', () => {
    const item = inventory.find((entry) => entry.id === card.dataset.publishItem);
    if (item) openListingStudio(item);
  }));
}

function revokeListingObjectUrls() {
  listingObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  listingObjectUrls = [];
}

function updateListingPhotoCount(item) {
  item.listing = normalizeListing(item.listing);
  item.listing.photoCount = activeListingPhotos.length;
  item.listing.updatedAt = new Date().toISOString();
}

function collectListingForm(item) {
  const current = normalizeListing(item.listing);
  item.listing = {
    ...current,
    color: document.getElementById('listingColor').value.trim(),
    material: document.getElementById('listingMaterial').value.trim(),
    measurements: document.getElementById('listingMeasurements').value.trim(),
    defects: document.getElementById('listingDefects').value.trim(),
    baseDescription: document.getElementById('listingBaseDescription').value.trim(),
    vestiaireEnabled: document.getElementById('listingVestiaireEnabled').checked,
    photoCount: activeListingPhotos.length,
    updatedAt: new Date().toISOString(),
  };
  item.updatedAt = new Date().toISOString();
  return item;
}

function renderListingPhotos() {
  revokeListingObjectUrls();
  document.getElementById('listingPhotoCount').textContent = `${activeListingPhotos.length} / 12`;
  if (!activeListingPhotos.length) {
    elements.listingPhotoGrid.innerHTML = '<div class="photo-empty"><span>▧</span><strong>Nessuna foto</strong><small>Importale una sola volta e riusale per tutte le piattaforme.</small></div>';
    return;
  }
  elements.listingPhotoGrid.innerHTML = activeListingPhotos.map((photo, index) => {
    const url = URL.createObjectURL(photo.blob);
    listingObjectUrls.push(url);
    return `<article class="listing-photo ${index === 0 ? 'cover' : ''}" data-photo-id="${photo.id}">
      <button class="photo-cover-button" type="button" title="Imposta come copertina"><img src="${url}" alt="Foto ${index + 1}" /></button>
      <span>${index === 0 ? 'Copertina' : index + 1}</span>
      <button class="photo-delete-button" type="button" aria-label="Elimina foto">×</button>
    </article>`;
  }).join('');
  elements.listingPhotoGrid.querySelectorAll('.photo-cover-button').forEach((button) => button.addEventListener('click', async () => {
    const card = button.closest('[data-photo-id]');
    await setCoverPhoto(selectedItemId, card.dataset.photoId);
    activeListingPhotos = await getItemPhotos(selectedItemId);
    renderListingPhotos();
    refreshListingStudio();
  }));
  elements.listingPhotoGrid.querySelectorAll('.photo-delete-button').forEach((button) => button.addEventListener('click', async () => {
    const card = button.closest('[data-photo-id]');
    await deletePhoto(card.dataset.photoId);
    activeListingPhotos = await getItemPhotos(selectedItemId);
    const item = selectedItem();
    if (item) { updateListingPhotoCount(item); saveInventory(); }
    renderListingPhotos();
    refreshListingStudio();
  }));
}

function renderListingReadiness(item) {
  const readiness = listingReadiness(item, activeListingPhotos.length);
  document.getElementById('listingReadinessPercent').textContent = `${readiness.percent}%`;
  document.getElementById('listingReadinessRing').style.setProperty('--readiness', `${readiness.percent * 3.6}deg`);
  document.getElementById('listingReadinessLabel').textContent = readiness.ready ? 'Scheda pronta' : 'Scheda da completare';
  const missing = readiness.checks.filter((check) => !check.done).map((check) => check.label);
  document.getElementById('listingReadinessText').textContent = readiness.ready ? 'Puoi iniziare la sessione di pubblicazione.' : `Manca: ${missing.join(', ')}.`;
  return readiness;
}

function platformCardMarkup(item, platform, content) {
  const listing = normalizeListing(item.listing);
  const done = Boolean(listing.completedPlatforms[platform.id]);
  const url = listing.listingUrls[platform.id] || '';
  const boost = platform.id === 'depop' && content.boostPrice ? `<small>Con boost: ${euroX90(content.boostPrice)}</small>` : '';
  return `<article class="listing-platform-card ${done ? 'completed' : ''}" data-listing-platform="${platform.id}">
    <header><span class="platform-badge">${platform.badge}</span><div><strong>${escapeHtml(platform.label)}</strong><small>${escapeHtml(content.title)}</small></div><em>${formatPublishPrice(content)}${boost}</em></header>
    <div class="platform-action-grid">
      <button type="button" data-platform-action="title">Titolo</button>
      <button type="button" data-platform-action="description">Descrizione</button>
      <button type="button" data-platform-action="share">Condividi</button>
      <button type="button" data-platform-action="open">Apri</button>
    </div>
    <label class="listing-url-field"><span>Link annuncio <small>(facoltativo)</small></span><input type="url" data-platform-url value="${escapeHtml(url)}" placeholder="Incollalo dopo la pubblicazione" /></label>
    <label class="platform-done-row"><input type="checkbox" data-platform-done ${done ? 'checked' : ''} /><span><strong>${done ? 'Completato' : 'Segna come completato'}</strong><small>Serve per la checklist dopo la vendita.</small></span></label>
  </article>`;
}

function refreshListingStudio() {
  const item = selectedItem();
  if (!item) return;
  collectListingForm(item);
  const readiness = renderListingReadiness(item);
  const priceModel = calculateMXLABPrices(item.target, calculator.ebayShipping);
  const contents = generatePlatformContent(item, priceModel);
  const plan = getPublishPlan(item, prefs);
  const completed = plan.filter((platform) => item.listing.completedPlatforms[platform.id]).length;
  document.getElementById('listingPlatformProgress').textContent = `${completed} / ${plan.length}`;
  elements.listingPlatformCards.innerHTML = plan.map((platform) => platformCardMarkup(item, platform, contents[platform.id])).join('');
  document.getElementById('completePublishingButton').disabled = !readiness.ready || completed < plan.length;
  bindListingPlatformCards(item, contents);
}

function bindListingPlatformCards(item, contents) {
  elements.listingPlatformCards.querySelectorAll('[data-listing-platform]').forEach((card) => {
    const platformId = card.dataset.listingPlatform;
    const platform = getPlatform(platformId);
    const content = contents[platformId];
    card.querySelectorAll('[data-platform-action]').forEach((button) => button.addEventListener('click', async () => {
      collectListingForm(item);
      const action = button.dataset.platformAction;
      if (action === 'title') return copyText(content.title, `Titolo ${platform.label} copiato`);
      if (action === 'description') return copyText(content.description, `Descrizione ${platform.label} copiata`);
      if (action === 'open') {
        await copyText(formatListingText(platformId, content), 'Contenuti copiati');
        window.open(platform.openUrl, '_blank', 'noopener');
        return;
      }
      if (action === 'share') await shareListingPackage(platform, content);
    }));
    card.querySelector('[data-platform-url]').addEventListener('change', (event) => {
      item.listing.listingUrls[platformId] = event.target.value.trim();
      saveInventory();
    });
    card.querySelector('[data-platform-done]').addEventListener('change', (event) => {
      item.listing = markPlatformComplete(item, platformId, event.target.checked);
      saveInventory();
      refreshListingStudio();
      renderPublish();
    });
  });
}

async function shareListingPackage(platform, content) {
  const text = formatListingText(platform.id, content);
  const files = activeListingPhotos.map(photoToFile);
  if (navigator.share) {
    try {
      const payload = { title: content.title, text };
      if (files.length && navigator.canShare?.({ files })) payload.files = files;
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copyText(text, 'Contenuti copiati');
}

async function openListingStudio(item) {
  if (!item || item.status === 'sold') return;
  closeDialog(elements.itemActionsDialog);
  selectedItemId = item.id;
  item.listing = normalizeListing(item.listing);
  activeListingPhotos = await getItemPhotos(item.id).catch(() => []);
  updateListingPhotoCount(item);
  saveInventory();
  document.getElementById('listingItemCode').textContent = item.code;
  document.getElementById('listingItemTitle').textContent = `${item.brand} · ${item.title}`;
  document.getElementById('listingColor').value = item.listing.color;
  document.getElementById('listingMaterial').value = item.listing.material;
  document.getElementById('listingMeasurements').value = item.listing.measurements;
  document.getElementById('listingDefects').value = item.listing.defects;
  document.getElementById('listingBaseDescription').value = item.listing.baseDescription || generateBaseDescription(item);
  document.getElementById('listingVestiaireEnabled').checked = item.listing.vestiaireEnabled;
  renderListingPhotos();
  refreshListingStudio();
  openDialog(elements.listingDialog);
}

function saveListingDraft({ close = false } = {}) {
  const item = selectedItem();
  if (!item) return;
  collectListingForm(item);
  if (listingReadiness(item, activeListingPhotos.length).ready && ['prep', 'photo'].includes(item.status)) item.status = 'publish';
  saveInventory();
  renderInventory();
  renderPublish();
  if (close) closeDialog(elements.listingDialog);
  showToast('Scheda annuncio salvata');
}

function renderRemovalChecklist(item) {
  const listing = normalizeListing(item.listing);
  elements.removalChecklist.innerHTML = listing.removalChecklist.length
    ? listing.removalChecklist.map((entry) => {
        const platform = getPlatform(entry.platformId);
        const url = listing.listingUrls[entry.platformId] || platform?.openUrl || '#';
        return `<article class="removal-row ${entry.done ? 'done' : ''}" data-removal-platform="${entry.platformId}">
          <label><input type="checkbox" ${entry.done ? 'checked' : ''} /><span><strong>${escapeHtml(platform?.label || entry.platformId)}</strong><small>${entry.done ? 'Rimosso' : 'Ancora da rimuovere'}</small></span></label>
          <button type="button" data-removal-open data-url="${escapeHtml(url)}">Apri</button>
        </article>`;
      }).join('')
    : '<p class="dashboard-empty">Nessun altro annuncio registrato.</p>';
  elements.removalChecklist.querySelectorAll('[data-removal-platform] input').forEach((checkbox) => checkbox.addEventListener('change', () => {
    const row = checkbox.closest('[data-removal-platform]');
    const entry = item.listing.removalChecklist.find((value) => value.platformId === row.dataset.removalPlatform);
    if (entry) entry.done = checkbox.checked;
    saveInventory();
    renderRemovalChecklist(item);
  }));
  elements.removalChecklist.querySelectorAll('[data-removal-open]').forEach((button) => button.addEventListener('click', () => window.open(button.dataset.url, '_blank', 'noopener')));
}

function openRemovalDialog(item) {
  if (!item) return;
  closeDialog(elements.itemActionsDialog);
  selectedItemId = item.id;
  item.listing = normalizeListing(item.listing);
  renderRemovalChecklist(item);
  openDialog(elements.removalDialog);
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
  const repairedItems = applyDataQualityRepairs({ force: true, silent: true });
  renderInventory();
  renderPublish();
  renderSalesHistory();
  renderDashboard();
  renderBusinessData();
  if (!silent) showToast(`Importati ${addedItems} articoli, ${addedSales} vendite${repairedItems ? ` · ${repairedItems} schede corrette` : ''}`);
}

function ensureGoogleMigration() {
  const migrated = localStorage.getItem(GOOGLE_MIGRATION_KEY);
  if (!migrated) mergeGoogleMigration({ silent: true });
}

function applyDataQualityRepairs({ force = false, silent = true } = {}) {
  if (!force && localStorage.getItem(DATA_REPAIR_KEY)) return 0;
  const seeds = new Map((GOOGLE_MIGRATION.inventory || []).map((item) => [String(item.code).toLowerCase(), item]));
  let repaired = 0;
  inventory = inventory.map((current) => {
    const patch = {};
    if (current.target > 0 && (!Array.isArray(current.targetHistory) || current.targetHistory.length === 0)) {
      patch.targetHistory = [{
        target: roundMoney(current.target),
        date: String(current.createdAt || current.purchaseDate || localDateISO()).slice(0, 10),
        kind: 'initial',
      }];
    }

    const seed = seeds.get(String(current.code).toLowerCase());
    const importedItem = String(current.id || '').startsWith('google-') || current.lotCode === 'MOD-0001';
    if (seed && importedItem) {
      if (isPlaceholderBrand(current.brand) && !isPlaceholderBrand(seed.brand)) patch.brand = seed.brand;
      if ((!current.category || current.category === 'Altro') && seed.category && seed.category !== 'Altro') patch.category = seed.category;
      if ((!current.condition || current.condition === 'Ottime') && seed.condition && seed.condition !== 'Ottime') patch.condition = seed.condition;
      if (current.purchaseDate === '2026-07-20' && seed.purchaseDate) patch.purchaseDate = seed.purchaseDate;
      if (!current.receivedDate && seed.receivedDate) patch.receivedDate = seed.receivedDate;
      if ((current.migrationRevision || 0) < (seed.migrationRevision || 0)) patch.migrationRevision = seed.migrationRevision;
    }

    if (!Object.keys(patch).length) return current;
    repaired += 1;
    return { ...current, ...patch, updatedAt: current.updatedAt || new Date().toISOString() };
  });

  if (repaired) saveInventory();
  try { localStorage.setItem(DATA_REPAIR_KEY, new Date().toISOString()); } catch { /* no-op */ }
  if (!silent && repaired) showToast(`${repaired} schede inventario corrette`);
  return repaired;
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
    applyDataQualityRepairs({ force: true, silent: true });
    renderTargetInputs(); renderCalculatorResults(); renderHistory(); renderInventory(); renderPublish(); renderSalesHistory(); renderDashboard(); renderBusinessData(); applyTheme();
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
  document.getElementById('openHistoryButton').addEventListener('click', () => navigate('history'));
  elements.publishSearch.addEventListener('input', renderPublish);
  elements.facebookEnabled.addEventListener('change', () => {
    prefs.facebookEnabled = elements.facebookEnabled.checked;
    savePrefs();
    renderPublish();
    if (elements.listingDialog.open) refreshListingStudio();
  });

  document.getElementById('itemTitle').addEventListener('input', suggestItemIdentity);
  document.getElementById('itemBrand').addEventListener('input', () => { document.getElementById('itemBrand').dataset.auto = 'false'; });
  document.getElementById('itemCategory').addEventListener('change', () => { document.getElementById('itemCategory').dataset.auto = 'false'; });
  document.getElementById('itemTarget').addEventListener('input', updateItemTargetPreview);
  document.getElementById('itemBackButton').addEventListener('click', () => { dismissKeyboard(); setItemStep(activeItemStep - 1); });
  document.getElementById('itemNextButton').addEventListener('click', () => {
    if (!validateItemStep(activeItemStep)) return;
    dismissKeyboard();
    setItemStep(activeItemStep + 1);
  });
  document.getElementById('itemWizardProgress').addEventListener('click', (event) => {
    const button = event.target.closest('[data-item-step]');
    if (!button) return;
    const requested = Number(button.dataset.itemStep);
    if (requested > activeItemStep) {
      for (let step = activeItemStep; step < requested; step += 1) {
        if (validateItemStep(step)) continue;
        setItemStep(step);
        return;
      }
    }
    dismissKeyboard();
    setItemStep(requested);
  });
  document.getElementById('openFullCalculatorFromItem').addEventListener('click', () => {
    const target = normalizeTarget(document.getElementById('itemTarget').value);
    if (target == null) return showToast('Inserisci il target');
    calculator.targets = [target]; activeTargetIndex = 0; saveCalculator(); renderTargetInputs(); renderCalculatorResults(); closeDialog(elements.itemDialog); navigate('calculator');
  });
  elements.itemForm.addEventListener('submit', (event) => {
    event.preventDefault();
    for (let step = 0; step < 3; step += 1) {
      if (validateItemStep(step)) continue;
      setItemStep(step);
      return;
    }
    const payload = collectItemForm();
    if (!payload.brand.trim() || !payload.title.trim()) return showToast('Completa marca e descrizione');
    const existingIndex = inventory.findIndex((item) => item.id === payload.id);
    const item = createInventoryItem(payload, inventory);
    if (existingIndex >= 0) inventory[existingIndex] = item;
    else inventory.unshift(item);
    saveInventory(); closeDialog(elements.itemDialog); renderInventory(); renderPublish(); renderDashboard(); showToast(existingIndex >= 0 ? 'Articolo aggiornato' : `${item.code} aggiunto`);
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => closeDialog(document.getElementById(button.dataset.closeDialog))));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('close', () => {
    if (dialog === elements.listingDialog) revokeListingObjectUrls();
    if (![elements.itemDialog, elements.itemActionsDialog, elements.targetDialog, elements.saleDialog, elements.listingDialog, elements.removalDialog, elements.installDialog].some((item) => item.open)) document.body.classList.remove('dialog-open');
  }));

  document.getElementById('advanceStatusButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    const next = nextStatus(item.status); if (next === item.status) return;
    item.status = next; item.updatedAt = new Date().toISOString(); saveInventory(); closeDialog(elements.itemActionsDialog); renderInventory(); renderPublish(); renderDashboard(); showToast(`Ora: ${ITEM_STATUSES[next].label}`);
  });
  document.getElementById('markSoldButton').addEventListener('click', () => openSaleDialog(selectedItem()));
  document.getElementById('editItemButton').addEventListener('click', () => openItemDialog(selectedItem()));
  document.getElementById('publishItemButton').addEventListener('click', () => openListingStudio(selectedItem()));
  document.getElementById('removeListingsButton').addEventListener('click', () => openRemovalDialog(selectedItem()));
  document.getElementById('updateTargetButton').addEventListener('click', () => openTargetDialog(selectedItem()));
  document.getElementById('duplicateItemButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    closeDialog(elements.itemActionsDialog);
    const copy = { ...item, id: undefined, code: undefined, status: 'prep', sale: null, platforms: [], listing: { ...normalizeListing(item.listing), completedPlatforms: {}, listingUrls: {}, removalChecklist: [], photoCount: 0 } };
    openItemDialog(copy);
    document.getElementById('itemId').value = '';
    document.getElementById('itemDialogTitle').textContent = 'Duplica articolo';
  });
  document.getElementById('calculateItemButton').addEventListener('click', () => calculateItemInCalculator(selectedItem()));
  document.getElementById('deleteItemButton').addEventListener('click', async () => {
    const item = selectedItem(); if (!item) return;
    if (!window.confirm(`Eliminare definitivamente ${item.code}?`)) return;
    await deleteItemPhotos(item.id).catch(() => {});
    inventory = inventory.filter((entry) => entry.id !== item.id); saveInventory(); closeDialog(elements.itemActionsDialog); renderInventory(); renderPublish(); renderDashboard(); showToast('Articolo eliminato');
  });

  document.getElementById('saveListingButton').addEventListener('click', () => saveListingDraft({ close: true }));
  document.getElementById('addListingPhotosButton').addEventListener('click', () => elements.listingPhotoInput.click());
  elements.listingPhotoInput.addEventListener('change', async () => {
    const item = selectedItem();
    if (!item) return;
    const remaining = Math.max(0, 12 - activeListingPhotos.length);
    if (!remaining) return showToast('Massimo 12 fotografie');
    document.getElementById('addListingPhotosButton').disabled = true;
    try {
      await addItemPhotos(item.id, elements.listingPhotoInput.files, activeListingPhotos.length, 12);
      activeListingPhotos = await getItemPhotos(item.id);
      updateListingPhotoCount(item);
      if (item.status === 'prep') item.status = 'photo';
      saveInventory();
      renderListingPhotos();
      refreshListingStudio();
      renderInventory();
      renderPublish();
      showToast('Foto importate');
    } catch { showToast('Impossibile importare le foto'); }
    finally { elements.listingPhotoInput.value = ''; document.getElementById('addListingPhotosButton').disabled = false; }
  });
  ['listingColor', 'listingMaterial', 'listingMeasurements', 'listingDefects', 'listingBaseDescription'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      const item = selectedItem(); if (!item) return;
      collectListingForm(item);
      renderListingReadiness(item);
    });
    document.getElementById(id).addEventListener('change', refreshListingStudio);
  });
  document.getElementById('listingVestiaireEnabled').addEventListener('change', refreshListingStudio);
  document.getElementById('generateDescriptionButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    collectListingForm(item);
    item.listing.baseDescription = generateBaseDescription(item);
    document.getElementById('listingBaseDescription').value = item.listing.baseDescription;
    refreshListingStudio();
    showToast('Descrizione generata');
  });
  document.getElementById('completePublishingButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    collectListingForm(item);
    const plan = getPublishPlan(item, prefs);
    const allDone = plan.every((platform) => item.listing.completedPlatforms[platform.id]);
    const ready = listingReadiness(item, activeListingPhotos.length).ready;
    if (!ready || !allDone) return showToast('Completa foto, scheda e piattaforme');
    item.status = 'live';
    item.updatedAt = new Date().toISOString();
    saveInventory();
    closeDialog(elements.listingDialog);
    renderInventory(); renderPublish(); renderDashboard();
    showToast(`${item.code} pubblicato`);
  });
  document.getElementById('completeRemovalButton').addEventListener('click', () => {
    const item = selectedItem(); if (!item) return;
    item.listing = normalizeListing(item.listing);
    item.listing.removalChecklist.forEach((entry) => { entry.done = true; });
    item.removedElsewhere = true;
    item.updatedAt = new Date().toISOString();
    saveInventory();
    closeDialog(elements.removalDialog);
    renderInventory(); renderDashboard();
    showToast('Annunci rimossi');
  });

  document.getElementById('newTargetInput').addEventListener('input', renderTargetUpdatePreview);
  document.querySelectorAll('[data-target-adjust]').forEach((button) => button.addEventListener('click', () => {
    const input = document.getElementById('newTargetInput');
    const current = normalizeTarget(input.value) ?? safeNumber(selectedItem()?.target, 0);
    input.value = formatTarget(Math.max(0, current + Number(button.dataset.targetAdjust)));
    renderTargetUpdatePreview();
  }));
  elements.targetForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const item = selectedItem();
    const target = normalizeTarget(document.getElementById('newTargetInput').value);
    if (!item || target == null || target <= 0) return showToast('Inserisci un target valido');
    if (!saveUpdatedTarget(item, target)) {
      closeDialog(elements.targetDialog);
      return showToast('Target invariato');
    }
    saveInventory();
    closeDialog(elements.targetDialog);
    renderInventory();
    renderPublish();
    renderDashboard();
    showToast(`Nuovo target: ${formatMoney(target)}`);
  });

  document.getElementById('salePlatform').addEventListener('change', () => {
    syncSaleCurrencyAndPrice(true);
    const platform = document.getElementById('salePlatform').value;
    document.getElementById('saleNet').value = DIRECT_PAYOUT_PLATFORMS.includes(platform)
      ? document.getElementById('salePrice').value
      : formatTarget(selectedItem()?.target || 0);
    updateSalePreview();
  });
  ['salePrice', 'saleNet'].forEach((id) => document.getElementById(id).addEventListener('input', () => {
    if (id === 'salePrice' && document.activeElement?.id === 'salePrice' && DIRECT_PAYOUT_PLATFORMS.includes(document.getElementById('salePlatform').value)) {
      document.getElementById('saleNet').value = document.getElementById('salePrice').value;
    }
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
    prefs.lastSalePlatform = item.sale.platform;
    savePrefs();
    item.listing = normalizeListing(item.listing);
    item.listing.removalChecklist = createRemovalChecklist(item, item.sale.platform);
    item.updatedAt = new Date().toISOString();
    saveInventory(); closeDialog(elements.saleDialog); renderInventory(); renderPublish(); renderDashboard(); showToast(`Vendita registrata: ${formatMoney(getItemProfit(item))} di profitto`);
    if (item.listing.removalChecklist.length) window.setTimeout(() => openRemovalDialog(item), 220);
  });

  document.getElementById('exportCsvButton').addEventListener('click', exportCsv);
  document.getElementById('exportBackupButton').addEventListener('click', exportBackup);
  document.getElementById('importGoogleDataButton').addEventListener('click', () => mergeGoogleMigration());
  document.getElementById('importBackupButton').addEventListener('click', () => elements.backupFileInput.click());
  elements.backupFileInput.addEventListener('change', () => importBackup(elements.backupFileInput.files?.[0]));
  document.getElementById('installHelpButton').addEventListener('click', () => openDialog(elements.installDialog));
  document.getElementById('deleteAllDataButton').addEventListener('click', async () => {
    if (!window.confirm('Eliminare inventario, cronologia e impostazioni MXLAB?')) return;
    if (!window.confirm('Confermi? Non sarà possibile recuperare i dati senza un backup.')) return;
    inventory = []; salesHistory = []; businessData = { lots: [], suppliers: [], expenses: [], checklist: [] }; history = []; calculator = { ...DEFAULT_CALCULATOR, targets: [15] }; prefs = { ...DEFAULT_PREFS };
    await clearAllPhotos().catch(() => {});
    [INVENTORY_KEY, SALES_HISTORY_KEY, BUSINESS_DATA_KEY, GOOGLE_MIGRATION_KEY, DATA_REPAIR_KEY, CALC_HISTORY_KEY, CALC_STORAGE_KEY, HUB_PREFS_KEY].forEach((key) => localStorage.removeItem(key));
    saveCalculator(); savePrefs(); renderTargetInputs(); renderHistory(); renderCalculatorResults(); renderInventory(); renderPublish(); renderSalesHistory(); renderDashboard(); renderBusinessData(); applyTheme(); navigate('calculator'); showToast('Dati eliminati');
  });
}

function applyAppViewport() {
  viewportSyncFrame = 0;
  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height || window.innerHeight);
  const width = Math.round(viewport?.width || window.innerWidth);
  const top = Math.round(viewport?.offsetTop || 0);
  const left = Math.round(viewport?.offsetLeft || 0);
  const keyboardOpen = Boolean(viewport && (window.innerHeight - viewport.height > 150));
  const root = document.documentElement;
  root.style.setProperty('--app-vh', `${height}px`);
  root.style.setProperty('--app-vw', `${width}px`);
  root.style.setProperty('--app-vv-top', `${top}px`);
  root.style.setProperty('--app-vv-left', `${left}px`);
  root.classList.toggle('keyboard-open', keyboardOpen && (elements.itemDialog?.open || elements.listingDialog?.open));
}

function syncAppViewport() {
  if (viewportSyncFrame) cancelAnimationFrame(viewportSyncFrame);
  viewportSyncFrame = requestAnimationFrame(applyAppViewport);
}

function keepFocusedWizardFieldVisible(event) {
  if (!elements.itemDialog?.open) return;
  const field = event.target.closest('input, select, textarea');
  const body = document.getElementById('itemWizardBody');
  if (!field || !body || !body.contains(field)) return;
  const alignField = () => {
    if (document.activeElement !== field) return;
    const fieldRect = field.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const margin = 14;
    if (fieldRect.bottom > bodyRect.bottom - margin) {
      body.scrollBy({ top: fieldRect.bottom - bodyRect.bottom + margin, behavior: 'smooth' });
    } else if (fieldRect.top < bodyRect.top + margin) {
      body.scrollBy({ top: fieldRect.top - bodyRect.top - margin, behavior: 'smooth' });
    }
  };
  window.setTimeout(alignField, 80);
  window.setTimeout(alignField, 320);
}

function registerViewportHandling() {
  syncAppViewport();
  window.addEventListener('resize', syncAppViewport, { passive: true });
  window.addEventListener('orientationchange', syncAppViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', syncAppViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncAppViewport, { passive: true });
  elements.itemDialog?.addEventListener('focusin', keepFocusedWizardFieldVisible);
}

function registerServiceWorker() {
  if (new URLSearchParams(window.location.search).has('no-sw')) return;
  if (!('serviceWorker' in navigator)) {
    elements.statusPill.textContent = 'Solo online';
    return;
  }
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js?v=12', { updateViaCache: 'none' });
      elements.statusPill.textContent = navigator.onLine ? 'Offline pronto' : 'Modalità offline';
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      await registration.update();
    } catch {
      elements.statusPill.textContent = 'Solo online';
    }
  });
  window.addEventListener('online', () => { elements.statusPill.textContent = 'Offline pronto'; });
  window.addEventListener('offline', () => { elements.statusPill.textContent = 'Modalità offline'; });
}

function initialize() {
  navigator.storage?.persist?.().catch(() => false);
  if (elements.appVersionLabel) elements.appVersionLabel.textContent = `Hub v${APP_VERSION}`;
  ensureGoogleMigration();
  applyDataQualityRepairs({ silent: true });
  applyTheme();
  registerViewportHandling();
  populateSalePlatforms();
  renderTargetInputs();
  renderHistory();
  elements.ebayShipping.value = formatters.x90.format(calculator.ebayShipping);
  renderCalculatorResults();
  renderInventory();
  renderPublish();
  renderSalesHistory();
  renderDashboard();
  renderBusinessData();
  initializeEvents();
  const requestedView = new URLSearchParams(window.location.search).get('view');
  if (requestedView && Object.hasOwn(viewMeta, requestedView)) prefs.view = requestedView;
  navigate(prefs.view, { keepScroll: true });
  registerServiceWorker();
}

initialize();
