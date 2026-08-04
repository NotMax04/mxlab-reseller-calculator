import {
  MIN_EBAY_SHIPPING,
  calculateMXLABPrices,
} from './calculator.js';

const STORAGE_KEY = 'mxlab-reseller-calculator-v3';
const DEFAULT_STATE = Object.freeze({
  targetsText: '15',
  ebayShipping: MIN_EBAY_SHIPPING,
});

const targetsInput = document.getElementById('targetsInput');
const ebayShippingInput = document.getElementById('ebayShipping');
const resultsContainer = document.getElementById('resultsContainer');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');
let toastTimer;

function parseLocaleNumber(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function parseTargets(value) {
  return String(value ?? '')
    .split(/[\n;]+/)
    .map(parseLocaleNumber)
    .filter((item) => item != null);
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      targetsText: typeof stored?.targetsText === 'string' ? stored.targetsText : DEFAULT_STATE.targetsText,
      ebayShipping: Math.max(MIN_EBAY_SHIPPING, parseLocaleNumber(stored?.ebayShipping) ?? MIN_EBAY_SHIPPING),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatInput(value) {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTarget(value) {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function euroX90(value) {
  return `${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} €`;
}

function euroWhole(value) {
  return `${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)} €`;
}

function dollarWhole(value) {
  return `${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)} $`;
}

function resultMarkup(model, index, total) {
  const { prices, minimums, offers } = model;
  const heading = total > 1 ? `<p class="target-index">TARGET ${index + 1}</p>` : '';

  return `
    <article class="result-card">
      ${heading}
      <section class="result-group">
        <h2>PREZZI</h2>
        <div class="target-row"><span>Prezzo Target</span><strong>${formatTarget(model.target)} €</strong></div>
        <div class="result-row"><span>Vinted</span><strong>${euroX90(prices.vinted)}</strong></div>
        <div class="result-row"><span>Wallapop</span><strong>${euroX90(prices.wallapop)}</strong></div>
        <div class="result-row"><span>eBay</span><strong>${euroX90(prices.ebay)}</strong></div>
        <div class="result-row"><span>Subito</span><strong>${euroWhole(prices.subito)}</strong></div>
        <div class="result-row"><span>Facebook Marketplace</span><strong>${euroWhole(prices.facebook)}</strong></div>
        <div class="result-row"><span>Vestiaire Collective</span><strong>${euroWhole(prices.vestiaire)}</strong></div>
        <div class="result-row"><span>Depop</span><strong>${euroX90(prices.depop)}</strong></div>
        <div class="result-row"><span>Depop con boost</span><strong>${euroX90(prices.depopBoost)}</strong></div>
        <div class="result-row"><span>Grailed</span><strong>${dollarWhole(prices.grailed)}</strong></div>
      </section>

      <section class="result-group">
        <h2>MINIMI ACCETTABILI</h2>
        <div class="result-row minimum"><span>Minimo eBay</span><strong>${euroX90(minimums.ebay)}</strong></div>
        <div class="result-row minimum"><span>Minimo Depop</span><strong>${euroX90(minimums.depop)}</strong></div>
        <div class="result-row minimum"><span>Minimo Depop con boost</span><strong>${euroX90(minimums.depopBoost)}</strong></div>
        <div class="result-row minimum"><span>Minimo Grailed</span><strong>${dollarWhole(minimums.grailed)}</strong></div>
      </section>

      <section class="result-group">
        <h2>OFFERTE AUTOMATICHE</h2>
        <div class="result-row offer"><span>Offerta automatica eBay</span><strong>${euroX90(offers.ebay)}</strong></div>
        <div class="result-row offer"><span>Offerta automatica Depop</span><strong>${euroX90(offers.depop)}</strong></div>
        <div class="result-row offer"><span>Offerta automatica Depop con boost</span><strong>${euroX90(offers.depopBoost)}</strong></div>
      </section>
    </article>
  `;
}

function buildTextBlock(model) {
  const { prices, minimums, offers } = model;
  return [
    'PREZZI',
    '',
    `Prezzo Target: ${formatTarget(model.target)} €`,
    '',
    `• Vinted: ${euroX90(prices.vinted)}`,
    `• Wallapop: ${euroX90(prices.wallapop)}`,
    `• eBay: ${euroX90(prices.ebay)}`,
    `• Subito: ${euroWhole(prices.subito)}`,
    `• Facebook Marketplace: ${euroWhole(prices.facebook)}`,
    `• Vestiaire Collective: ${euroWhole(prices.vestiaire)}`,
    `• Depop: ${euroX90(prices.depop)}`,
    `• Depop con boost: ${euroX90(prices.depopBoost)}`,
    `• Grailed: ${dollarWhole(prices.grailed)}`,
    '',
    'MINIMI ACCETTABILI',
    '',
    `• Minimo eBay: ${euroX90(minimums.ebay)}`,
    `• Minimo Depop: ${euroX90(minimums.depop)}`,
    `• Minimo Depop con boost: ${euroX90(minimums.depopBoost)}`,
    `• Minimo Grailed: ${dollarWhole(minimums.grailed)}`,
    '',
    'OFFERTE AUTOMATICHE',
    '',
    `• Offerta automatica eBay: ${euroX90(offers.ebay)}`,
    `• Offerta automatica Depop: ${euroX90(offers.depop)}`,
    `• Offerta automatica Depop con boost: ${euroX90(offers.depopBoost)}`,
  ].join('\n');
}

function getModels() {
  const targets = parseTargets(state.targetsText);
  return targets.map((target) => calculateMXLABPrices(target, state.ebayShipping));
}

function render() {
  const models = getModels();
  emptyState.hidden = models.length > 0;
  resultsContainer.innerHTML = models.map((model, index) => resultMarkup(model, index, models.length)).join('');
}

function syncInputs() {
  targetsInput.value = state.targetsText;
  ebayShippingInput.value = formatInput(state.ebayShipping);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1800);
}

targetsInput.addEventListener('input', () => {
  state.targetsText = targetsInput.value;
  saveState();
  render();
});

ebayShippingInput.addEventListener('input', () => {
  state.ebayShipping = Math.max(MIN_EBAY_SHIPPING, parseLocaleNumber(ebayShippingInput.value) ?? MIN_EBAY_SHIPPING);
  saveState();
  render();
});

ebayShippingInput.addEventListener('blur', () => {
  state.ebayShipping = Math.max(MIN_EBAY_SHIPPING, parseLocaleNumber(ebayShippingInput.value) ?? MIN_EBAY_SHIPPING);
  ebayShippingInput.value = formatInput(state.ebayShipping);
  saveState();
  render();
});

document.getElementById('resetButton').addEventListener('click', () => {
  state = { ...DEFAULT_STATE };
  saveState();
  syncInputs();
  render();
  showToast('Valori ripristinati');
});

document.getElementById('copyButton').addEventListener('click', async () => {
  const models = getModels();
  if (!models.length) {
    showToast('Inserisci almeno un target');
    return;
  }

  const text = models.map(buildTextBlock).join('\n\n────────────────────\n\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast('Risultati copiati');
  } catch {
    showToast('Copia non disponibile');
  }
});

syncInputs();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      document.getElementById('offlineBadge').textContent = 'Pronto offline';
    } catch {
      document.getElementById('offlineBadge').textContent = 'Solo online';
    }
  });
}
