const ENHANCEMENT_VERSION = '3.2.2';

function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function formatPriceLine(card) {
  const platform = normalizeText(card.querySelector('header strong')?.textContent);
  const priceBox = card.querySelector('header em');
  if (!platform || !priceBox) return '';

  const basePrice = normalizeText([...priceBox.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join(' '));
  const boost = normalizeText(priceBox.querySelector('small')?.textContent);
  const price = basePrice || normalizeText(priceBox.textContent.replace(boost, ''));
  if (!price) return '';
  return boost ? `${platform}: ${price} (${boost.toLowerCase()})` : `${platform}: ${price}`;
}

function currentTitles() {
  const labels = ['VINTED', 'WALLAPOP / SUBITO', 'EBAY'];
  return [...document.querySelectorAll('#listingTitleVariants [data-generated-title]')]
    .slice(0, 3)
    .map((input, index) => {
      const value = normalizeText(input.value);
      return value ? `${labels[index]}\n${value}` : '';
    })
    .filter(Boolean);
}

function currentPrices() {
  return [...document.querySelectorAll('#listingPlatformCards [data-listing-platform]')]
    .map(formatPriceLine)
    .filter(Boolean);
}

function buildCompleteSummary() {
  const titles = currentTitles();
  const description = normalizeText(document.getElementById('listingBaseDescription')?.value);
  const prices = currentPrices();
  const sections = [];

  if (titles.length) sections.push(`TITOLI\n\n${titles.join('\n\n')}`);
  if (description) sections.push(`DESCRIZIONE\n\n${description}`);
  if (prices.length) sections.push(`PREZZI DI PUBBLICAZIONE\n\n${prices.join('\n')}`);

  return sections.join('\n\n────────────────────\n\n');
}

async function copyText(value, button, successLabel) {
  const text = normalizeText(value);
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  const original = button.textContent;
  button.textContent = successLabel;
  button.classList.add('copied');
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1300);
}

function injectStyles() {
  if (document.getElementById('mxlabSummaryStyles')) return;
  const style = document.createElement('style');
  style.id = 'mxlabSummaryStyles';
  style.textContent = `
    .mxlab-description-heading,
    .mxlab-complete-summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .mxlab-description-heading > span {
      min-width: 0;
    }

    .mxlab-inline-copy,
    .mxlab-summary-copy {
      flex: 0 0 auto;
      min-height: 34px;
      padding: 7px 11px;
      border: 1px solid rgba(255, 183, 68, 0.38);
      border-radius: 10px;
      background: rgba(255, 174, 45, 0.10);
      color: var(--accent, #ffad32);
      font: inherit;
      font-size: 12px;
      font-weight: 750;
      cursor: pointer;
    }

    .mxlab-inline-copy.copied,
    .mxlab-summary-copy.copied {
      border-color: rgba(68, 211, 128, 0.55);
      color: #55d88e;
      background: rgba(68, 211, 128, 0.10);
    }

    .mxlab-complete-summary {
      margin-top: 14px;
      padding: 14px;
      border: 1px solid rgba(255, 183, 68, 0.28);
      border-radius: 16px;
      background: rgba(255, 174, 45, 0.055);
    }

    .mxlab-complete-summary-header div {
      display: grid;
      gap: 3px;
    }

    .mxlab-complete-summary-header strong {
      font-size: 14px;
    }

    .mxlab-complete-summary-header small {
      color: var(--muted, #959aa6);
      line-height: 1.35;
    }

    #listingCompleteSummary {
      width: 100%;
      min-height: 290px;
      margin-top: 12px;
      padding: 13px;
      resize: vertical;
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 13px;
      background: rgba(0, 0, 0, 0.20);
      color: inherit;
      font: inherit;
      font-size: 13px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
    }

    [data-theme='light'] #listingCompleteSummary {
      background: rgba(255, 255, 255, 0.72);
      border-color: rgba(18, 24, 36, 0.12);
    }

    @media (max-width: 420px) {
      .mxlab-complete-summary-header {
        align-items: flex-start;
      }

      .mxlab-complete-summary-header small {
        max-width: 210px;
      }
    }
  `;
  document.head.appendChild(style);
}

function updateSummary() {
  const output = document.getElementById('listingCompleteSummary');
  if (!output) return;
  output.value = buildCompleteSummary();
}

function installDescriptionCopyButton() {
  const description = document.getElementById('listingBaseDescription');
  const label = description?.closest('label.field');
  const heading = label?.querySelector(':scope > span');
  if (!description || !label || !heading || label.querySelector('[data-copy-main-description]')) return;

  const headingWrap = document.createElement('div');
  headingWrap.className = 'mxlab-description-heading';
  heading.before(headingWrap);
  headingWrap.appendChild(heading);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mxlab-inline-copy';
  button.dataset.copyMainDescription = 'true';
  button.textContent = 'Copia descrizione';
  button.addEventListener('click', () => copyText(description.value, button, 'Copiata'));
  headingWrap.appendChild(button);
}

function installCompleteSummary() {
  if (document.getElementById('listingCompleteSummary')) return;
  const descriptionLabel = document.getElementById('listingBaseDescription')?.closest('label.field');
  const fallbackButton = document.getElementById('generateDescriptionButton');
  const anchor = fallbackButton || descriptionLabel;
  if (!anchor) return;

  const section = document.createElement('section');
  section.className = 'mxlab-complete-summary';
  section.innerHTML = `
    <div class="mxlab-complete-summary-header">
      <div>
        <strong>Scheda completa per le Note</strong>
        <small>Titoli, descrizione e prezzi nello stesso blocco.</small>
      </div>
      <button class="mxlab-summary-copy" type="button" data-copy-complete-summary>Copia tutto</button>
    </div>
    <textarea id="listingCompleteSummary" rows="18" readonly aria-label="Titoli, descrizione e prezzi"></textarea>
  `;
  anchor.after(section);

  const button = section.querySelector('[data-copy-complete-summary]');
  button.addEventListener('click', () => copyText(buildCompleteSummary(), button, 'Copiato'));
  updateSummary();
}

function watchListingStudio() {
  const dialog = document.getElementById('listingDialog');
  const titles = document.getElementById('listingTitleVariants');
  const platforms = document.getElementById('listingPlatformCards');
  const description = document.getElementById('listingBaseDescription');
  if (!dialog || !titles || !platforms || !description) return;

  dialog.addEventListener('input', (event) => {
    if (event.target.matches('[data-generated-title], #listingBaseDescription')) updateSummary();
  });
  dialog.addEventListener('change', () => window.setTimeout(updateSummary, 0));
  dialog.addEventListener('click', () => window.setTimeout(updateSummary, 80));

  const observer = new MutationObserver(() => window.requestAnimationFrame(updateSummary));
  observer.observe(titles, { childList: true, subtree: true });
  observer.observe(platforms, { childList: true, subtree: true, characterData: true });
}

function initializeListingSummary() {
  injectStyles();
  installDescriptionCopyButton();
  installCompleteSummary();
  watchListingStudio();
  updateSummary();

  const version = document.getElementById('appVersionLabel');
  if (version) version.textContent = `Hub v${ENHANCEMENT_VERSION}`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeListingSummary, { once: true });
} else {
  initializeListingSummary();
}
