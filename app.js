import { MIN_EBAY_SHIPPING, calculateMXLABPrices } from './calculator.js';

const APP_VERSION = '4.0.0';
const STORAGE_KEY = 'mxlab-reseller-calculator-v4';
const HISTORY_KEY = 'mxlab-reseller-target-history-v1';
const DEFAULT_STATE = Object.freeze({
  targets: [15],
  ebayShipping: MIN_EBAY_SHIPPING,
  filter: 'all',
  theme: 'dark',
  installDismissed: false,
});

const formatters = {
  input: new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  x90: new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  whole: new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
};

const platformMeta = {
  vinted: { label: 'Vinted', badge: 'V' },
  wallapop: { label: 'Wallapop', badge: 'W' },
  ebay: { label: 'eBay', badge: 'eB' },
  subito: { label: 'Subito', badge: 'S' },
  facebook: { label: 'Facebook Marketplace', badge: 'FB' },
  vestiaire: { label: 'Vestiaire Collective', badge: 'VC' },
  depop: { label: 'Depop', badge: 'D' },
  depopBoost: { label: 'Depop con boost', badge: 'D+' },
  grailed: { label: 'Grailed', badge: 'G' },
};

const elements = {
  targetInputs: document.getElementById('targetInputs'),
  targetTemplate: document.getElementById('targetInputTemplate'),
  ebayShipping: document.getElementById('ebayShipping'),
  results: document.getElementById('resultsContainer'),
  empty: document.getElementById('emptyState'),
  toast: document.getElementById('toast'),
  recentSection: document.getElementById('recentSection'),
  recentRow: document.getElementById('recentRow'),
  filter: document.getElementById('resultFilter'),
  advanced: document.getElementById('advancedSettings'),
  settingsButton: document.getElementById('settingsButton'),
  installCard: document.getElementById('installCard'),
  statusPill: document.getElementById('statusPill'),
  stickyActions: document.getElementById('stickyActions'),
  themeIcon: document.getElementById('themeIcon'),
};

let toastTimer;
let historyTimer;
let activeTargetIndex = 0;

function parseLocaleNumber(value) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function normalizeTarget(value) {
  const numeric = parseLocaleNumber(value);
  return numeric == null ? null : Math.round(numeric * 100) / 100;
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const targets = Array.isArray(stored?.targets)
      ? stored.targets.map(normalizeTarget).filter((value) => value != null)
      : DEFAULT_STATE.targets;
    return {
      targets: targets.length ? targets.slice(0, 10) : [...DEFAULT_STATE.targets],
      ebayShipping: Math.max(MIN_EBAY_SHIPPING, normalizeTarget(stored?.ebayShipping) ?? MIN_EBAY_SHIPPING),
      filter: ['all', 'prices', 'minimums', 'offers'].includes(stored?.filter) ? stored.filter : DEFAULT_STATE.filter,
      theme: ['dark', 'light'].includes(stored?.theme) ? stored.theme : DEFAULT_STATE.theme,
      installDismissed: Boolean(stored?.installDismissed),
    };
  } catch {
    return { ...DEFAULT_STATE, targets: [...DEFAULT_STATE.targets] };
  }
}

function loadHistory() {
  try {
    const values = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(values) ? values.map(normalizeTarget).filter((value) => value != null).slice(0, 8) : [];
  } catch {
    return [];
  }
}

let state = loadState();
let history = loadHistory();

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* App still works without storage. */ }
}

function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* App still works without storage. */ }
}

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

function formatTarget(value) {
  return formatters.input.format(value);
}

function euroX90(value) {
  return `${formatters.x90.format(value)} €`;
}

function euroWhole(value) {
  return `${formatters.whole.format(value)} €`;
}

function dollarWhole(value) {
  return `${formatters.whole.format(value)} $`;
}

function platformValue(key, value) {
  if (key === 'grailed') return dollarWhole(value);
  if (['subito', 'facebook', 'vestiaire'].includes(key)) return euroWhole(value);
  return euroX90(value);
}

function createTargetInput(value, index) {
  const fragment = elements.targetTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.target-input-row');
  const input = fragment.querySelector('.target-input');
  const numberBadge = fragment.querySelector('.target-number');
  const removeButton = fragment.querySelector('.remove-target-button');
  row.dataset.index = String(index);
  numberBadge.textContent = String(index + 1);
  input.value = value == null ? '' : formatTarget(value);
  input.setAttribute('aria-label', `Prezzo target ${index + 1}`);

  input.addEventListener('focus', () => { activeTargetIndex = index; });
  input.addEventListener('input', () => {
    activeTargetIndex = index;
    state.targets[index] = normalizeTarget(input.value);
    saveState();
    renderResults();
    scheduleHistory(state.targets[index]);
  });
  input.addEventListener('blur', () => {
    const normalized = normalizeTarget(input.value);
    state.targets[index] = normalized;
    input.value = normalized == null ? '' : formatTarget(normalized);
    saveState();
    renderResults();
    addToHistory(normalized);
  });

  removeButton.addEventListener('click', () => {
    state.targets.splice(index, 1);
    if (!state.targets.length) state.targets = [15];
    activeTargetIndex = Math.min(activeTargetIndex, state.targets.length - 1);
    saveState();
    renderTargetInputs();
    renderResults();
    showToast('Target rimosso');
  });
  return fragment;
}

function renderTargetInputs(focusLast = false) {
  elements.targetInputs.replaceChildren(...state.targets.map(createTargetInput));
  if (focusLast) {
    const inputs = elements.targetInputs.querySelectorAll('.target-input');
    inputs[inputs.length - 1]?.focus();
  }
}

function setTarget(index, value) {
  const normalized = Math.max(0, Math.round(value * 100) / 100);
  state.targets[index] = normalized;
  saveState();
  addToHistory(normalized);
  renderTargetInputs();
  renderResults();
}

function getModels() {
  return state.targets
    .map(normalizeTarget)
    .filter((target) => target != null)
    .map((target) => calculateMXLABPrices(target, state.ebayShipping));
}

function rowMarkup({ key, value, kind, labelPrefix = '' }) {
  const meta = platformMeta[key];
  const formatted = platformValue(key, value);
  const label = `${labelPrefix}${meta.label}`;
  return `
    <button class="result-row" type="button" data-copy-value="${formatted}" data-kind="${kind}" aria-label="Copia ${label}: ${formatted}">
      <span class="platform-badge" aria-hidden="true">${meta.badge}</span>
      <span class="platform-name">${label}</span>
      <strong>${formatted}</strong>
      <span class="copy-row-button" aria-hidden="true">⧉</span>
    </button>`;
}

function resultCardMarkup(model, index) {
  const { prices, minimums, offers } = model;
  const targetText = `${formatTarget(model.target)} €`;
  const pricesRows = [
    ['vinted', prices.vinted], ['wallapop', prices.wallapop], ['ebay', prices.ebay], ['subito', prices.subito],
    ['facebook', prices.facebook], ['vestiaire', prices.vestiaire], ['depop', prices.depop],
    ['depopBoost', prices.depopBoost], ['grailed', prices.grailed],
  ].map(([key, value]) => rowMarkup({ key, value, kind: 'price' })).join('');
  const minimumRows = [
    ['ebay', minimums.ebay], ['depop', minimums.depop], ['depopBoost', minimums.depopBoost], ['grailed', minimums.grailed],
  ].map(([key, value]) => rowMarkup({ key, value, kind: 'minimum', labelPrefix: 'Minimo ' })).join('');
  const offerRows = [
    ['ebay', offers.ebay], ['depop', offers.depop], ['depopBoost', offers.depopBoost],
  ].map(([key, value]) => rowMarkup({ key, value, kind: 'offer', labelPrefix: 'Offerta ' })).join('');

  return `
    <article class="result-card" data-target-index="${index}">
      <header class="result-card-head">
        <div>
          <p class="target-label">TARGET ${index + 1}</p>
          <h3>${targetText}</h3>
        </div>
        <div class="card-actions">
          <button class="card-action share-target" type="button" data-target-index="${index}" aria-label="Condividi risultati target ${targetText}">↗</button>
          <button class="card-action copy-target" type="button" data-target-index="${index}" aria-label="Copia risultati target ${targetText}">⧉</button>
        </div>
      </header>

      <div class="summary-grid" aria-label="Prezzi principali">
        <div class="summary-item"><span>Vinted</span><strong>${euroX90(prices.vinted)}</strong></div>
        <div class="summary-item"><span>eBay</span><strong>${euroX90(prices.ebay)}</strong></div>
        <div class="summary-item"><span>Depop</span><strong>${euroX90(prices.depop)}</strong></div>
        <div class="summary-item"><span>Grailed</span><strong>${dollarWhole(prices.grailed)}</strong></div>
      </div>

      <section class="result-group" data-group="prices">
        <p class="group-title">PREZZI DI PUBBLICAZIONE</p>
        ${pricesRows}
      </section>
      <section class="result-group" data-group="minimums">
        <p class="group-title">MINIMI ACCETTABILI</p>
        ${minimumRows}
      </section>
      <section class="result-group" data-group="offers">
        <p class="group-title">OFFERTE AUTOMATICHE</p>
        ${offerRows}
      </section>
    </article>`;
}

function applyFilter() {
  const groups = document.querySelectorAll('.result-group');
  groups.forEach((group) => {
    group.hidden = state.filter !== 'all' && group.dataset.group !== state.filter;
  });
  document.querySelectorAll('.summary-grid').forEach((summary) => {
    summary.hidden = !['all', 'prices'].includes(state.filter);
  });
  document.querySelectorAll('#resultFilter button').forEach((button) => {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function bindResultActions(models) {
  elements.results.querySelectorAll('.result-row').forEach((row) => {
    row.addEventListener('click', () => copyText(row.dataset.copyValue, 'Prezzo copiato'));
  });
  elements.results.querySelectorAll('.copy-target').forEach((button) => {
    button.addEventListener('click', () => {
      const model = models[Number(button.dataset.targetIndex)];
      copyText(buildTextBlock(model), 'Scheda copiata');
    });
  });
  elements.results.querySelectorAll('.share-target').forEach((button) => {
    button.addEventListener('click', () => {
      const model = models[Number(button.dataset.targetIndex)];
      shareText(buildTextBlock(model));
    });
  });
}

function renderResults() {
  const models = getModels();
  elements.empty.hidden = models.length > 0;
  elements.stickyActions.hidden = models.length === 0;
  elements.results.classList.toggle('multi', models.length > 1);
  elements.results.innerHTML = models.map(resultCardMarkup).join('');
  bindResultActions(models);
  applyFilter();
}

function buildTextBlock(model) {
  const { prices, minimums, offers } = model;
  return [
    'PREZZI', '', `Prezzo Target: ${formatTarget(model.target)} €`, '',
    `• Vinted: ${euroX90(prices.vinted)}`,
    `• Wallapop: ${euroX90(prices.wallapop)}`,
    `• eBay: ${euroX90(prices.ebay)}`,
    `• Subito: ${euroWhole(prices.subito)}`,
    `• Facebook Marketplace: ${euroWhole(prices.facebook)}`,
    `• Vestiaire Collective: ${euroWhole(prices.vestiaire)}`,
    `• Depop: ${euroX90(prices.depop)}`,
    `• Depop con boost: ${euroX90(prices.depopBoost)}`,
    `• Grailed: ${dollarWhole(prices.grailed)}`, '',
    'MINIMI ACCETTABILI', '',
    `• Minimo eBay: ${euroX90(minimums.ebay)}`,
    `• Minimo Depop: ${euroX90(minimums.depop)}`,
    `• Minimo Depop con boost: ${euroX90(minimums.depopBoost)}`,
    `• Minimo Grailed: ${dollarWhole(minimums.grailed)}`, '',
    'OFFERTE AUTOMATICHE', '',
    `• Offerta automatica eBay: ${euroX90(offers.ebay)}`,
    `• Offerta automatica Depop: ${euroX90(offers.depop)}`,
    `• Offerta automatica Depop con boost: ${euroX90(offers.depopBoost)}`,
  ].join('\n');
}

function allResultsText() {
  return getModels().map(buildTextBlock).join('\n\n────────────────────\n\n');
}

async function copyText(text, successMessage = 'Copiato') {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast(successMessage);
  }
}

async function shareText(text) {
  if (!text) return;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Prezzi MXLAB', text });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copyText(text, 'Condivisione non disponibile: risultati copiati');
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 1800);
}

function renderHistory() {
  elements.recentSection.hidden = history.length === 0;
  elements.recentRow.innerHTML = history.map((value) => `<button type="button" data-history="${value}">${formatTarget(value)} €</button>`).join('');
  elements.recentRow.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => setTarget(activeTargetIndex, Number(button.dataset.history)));
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  elements.themeIcon.textContent = state.theme === 'dark' ? '☀' : '☾';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', state.theme === 'dark' ? '#0a0b0f' : '#f4f5f7');
}

function syncControls() {
  elements.ebayShipping.value = formatters.x90.format(state.ebayShipping);
  elements.installCard.hidden = state.installDismissed;
  document.getElementById('appVersion').textContent = `v${APP_VERSION}`;
}

function initializeEvents() {
  document.getElementById('addTargetButton').addEventListener('click', () => {
    const base = state.targets[activeTargetIndex] ?? 15;
    state.targets.push(base);
    activeTargetIndex = state.targets.length - 1;
    saveState();
    renderTargetInputs(true);
    renderResults();
  });

  document.querySelectorAll('[data-adjust]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = normalizeTarget(state.targets[activeTargetIndex]) ?? 0;
      setTarget(activeTargetIndex, current + Number(button.dataset.adjust));
    });
  });

  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => setTarget(activeTargetIndex, Number(button.dataset.preset)));
  });

  elements.filter.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    state.filter = button.dataset.filter;
    saveState();
    applyFilter();
  });

  elements.settingsButton.addEventListener('click', () => {
    const open = elements.settingsButton.getAttribute('aria-expanded') === 'true';
    elements.settingsButton.setAttribute('aria-expanded', String(!open));
    elements.advanced.hidden = open;
  });

  elements.ebayShipping.addEventListener('input', () => {
    state.ebayShipping = Math.max(MIN_EBAY_SHIPPING, normalizeTarget(elements.ebayShipping.value) ?? MIN_EBAY_SHIPPING);
    saveState();
    renderResults();
  });
  elements.ebayShipping.addEventListener('blur', () => {
    state.ebayShipping = Math.max(MIN_EBAY_SHIPPING, normalizeTarget(elements.ebayShipping.value) ?? MIN_EBAY_SHIPPING);
    elements.ebayShipping.value = formatters.x90.format(state.ebayShipping);
    saveState();
    renderResults();
  });

  document.getElementById('copyButton').addEventListener('click', () => {
    const text = allResultsText();
    text ? copyText(text, 'Tutti i risultati copiati') : showToast('Inserisci un target valido');
  });
  document.getElementById('shareButton').addEventListener('click', () => {
    const text = allResultsText();
    text ? shareText(text) : showToast('Inserisci un target valido');
  });
  document.getElementById('resetButton').addEventListener('click', () => {
    state.targets = [null];
    state.ebayShipping = MIN_EBAY_SHIPPING;
    activeTargetIndex = 0;
    saveState();
    renderTargetInputs();
    syncControls();
    renderResults();
    showToast('Pronto per un nuovo calcolo');
  });
  document.getElementById('clearHistoryButton').addEventListener('click', () => {
    history = [];
    saveHistory();
    renderHistory();
    showToast('Cronologia cancellata');
  });
  document.getElementById('themeButton').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
  });
  document.getElementById('dismissInstallButton').addEventListener('click', () => {
    state.installDismissed = true;
    saveState();
    elements.installCard.hidden = true;
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    elements.statusPill.textContent = 'Solo online';
    return;
  }
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js?v=4');
      elements.statusPill.textContent = navigator.onLine ? 'Offline pronto' : 'Modalità offline';
      registration.update();
    } catch {
      elements.statusPill.textContent = 'Solo online';
    }
  });
  window.addEventListener('online', () => { elements.statusPill.textContent = 'Offline pronto'; });
  window.addEventListener('offline', () => { elements.statusPill.textContent = 'Modalità offline'; });
}

applyTheme();
renderTargetInputs();
renderHistory();
syncControls();
renderResults();
initializeEvents();
registerServiceWorker();
