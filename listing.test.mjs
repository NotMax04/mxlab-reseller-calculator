import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMXLABPrices } from './calculator.js';
import {
  buildVintedPriceAnalysisPrompt,
  buildVintedSearchUrl,
  createRemovalChecklist,
  generateBaseDescription,
  generatePlatformContent,
  generateTitleVariants,
  getPlatform,
  getPlatformState,
  getPublishPlan,
  getVintedFilterSummary,
  listingReadiness,
  normalizeListing,
  setPlatformState,
} from './listing.js';

const item = {
  code: 'MX-0001',
  brand: 'Carhartt',
  title: 'Bermuda cargo Carhartt',
  category: 'Shorts',
  size: 'M',
  condition: 'Ottime',
  target: 15,
  notes: '',
  listing: {
    baseDescription: 'Bermuda cargo Carhartt da uomo. Colore: verde. Materiale: cotone ripstop. Taglia M. Condizioni ottime. Misure: vita 42 cm e lunghezza 52 cm. Nessun difetto rilevante.',
    titleVariantIndex: 0,
    photoCount: 5,
  },
};

test('normalizza la scheda annuncio senza perdere le scelte', () => {
  const listing = normalizeListing({ vestiaireEnabled: true, excludedPlatforms: ['facebook', 'facebook'], photoCount: 6, titleVariantIndex: 2 });
  assert.equal(listing.vestiaireEnabled, true);
  assert.deepEqual(listing.excludedPlatforms, ['facebook']);
  assert.equal(listing.photoCount, 6);
  assert.equal(listing.titleVariantIndex, 2);
});

test('migra i vecchi dettagli separati nella descrizione quando manca il testo principale', () => {
  const listing = normalizeListing({ color: 'Verde', material: 'Cotone', measurements: 'Vita 42 cm', defects: 'Piccolo segno' });
  assert.match(listing.baseDescription, /Colore: Verde/);
  assert.match(listing.baseDescription, /Materiale: Cotone/);
  assert.match(listing.baseDescription, /Misure: Vita 42 cm/);
  assert.match(listing.baseDescription, /Difetti: Piccolo segno/);
});

test('genera un piano standard con Facebook e Vestiaire opzionali', () => {
  const normal = getPublishPlan(item, { facebookEnabled: true }).map((platform) => platform.id);
  assert.deepEqual(normal, ['vinted', 'ebay', 'wallapop', 'subito', 'facebook', 'depop', 'grailed']);
  const premium = getPublishPlan({ ...item, listing: { ...item.listing, vestiaireEnabled: true } }, { facebookEnabled: false }).map((platform) => platform.id);
  assert.deepEqual(premium, ['vinted', 'ebay', 'wallapop', 'subito', 'vestiaire', 'depop', 'grailed']);
});

test('genera i tre titoli MXLAB con i limiti corretti', () => {
  const titles = generateTitleVariants(item);
  assert.equal(titles.length, 3);
  assert.ok(titles[0].length <= 100);
  assert.ok(titles[1].length <= 50);
  assert.ok(titles[2].length <= 80);
  assert.ok(titles.every((title) => (title.match(/Carhartt/gi) || []).length <= 1));
  assert.match(titles[0], /Taglia M/);
});

test('genera una descrizione base soltanto con dati disponibili', () => {
  const minimal = { ...item, listing: {}, notes: '' };
  const description = generateBaseDescription(minimal);
  assert.match(description, /Taglia: M/);
  assert.match(description, /Condizioni: Ottime/);
  assert.match(description, /Spedizione veloce/);
  assert.match(description, /Prezzo trattabile/);
  assert.doesNotMatch(description, /100%/);
});

test('genera titoli, descrizioni e prezzi specifici per piattaforma', () => {
  const contents = generatePlatformContent(item, calculateMXLABPrices(15));
  assert.equal(contents.vinted.price, 18.9);
  assert.equal(contents.ebay.price, 24.9);
  assert.equal(contents.grailed.price, 28);
  assert.ok(contents.ebay.title.length <= 80);
  assert.match(contents.depop.description, /#/);
  assert.match(contents.grailed.description, /Taglia M/);
  assert.match(contents.vinted.description, /cotone ripstop/i);
});

test('considera pronta la scheda con cinque foto e dati completi', () => {
  const ready = listingReadiness(item, 5);
  assert.equal(ready.ready, true);
  assert.equal(ready.percent, 100);
  const incomplete = listingReadiness({ ...item, size: '' }, 4);
  assert.equal(incomplete.ready, false);
});

test('configura l’apertura persistente di Wallapop e il link universale di Vestiaire', () => {
  assert.equal(getPlatform('facebook').appUrl, 'fb://marketplace/create');
  assert.equal(getPlatform('facebook').webUrl, 'https://www.facebook.com/marketplace/create/item');
  assert.equal(getPlatform('wallapop').launchMode, 'safari');
  assert.match(getPlatform('wallapop').safariUrl, /^x-safari-https:\/\/it\.wallapop\.com\/app\/catalog\/upload$/);
  assert.equal(getPlatform('vestiaire').launchMode, 'universal');
  assert.equal(getPlatform('vestiaire').appUrl, undefined);
  assert.match(getPlatform('vestiaire').universalUrl, /vestiairecollective\.com\/vendita-online-abbigliamento/);
});

test('crea la checklist di rimozione escludendo la piattaforma di vendita', () => {
  const sold = {
    ...item,
    listing: {
      ...item.listing,
      completedPlatforms: { vinted: true, ebay: true, depop: true },
    },
  };
  assert.deepEqual(createRemovalChecklist(sold, 'Vinted').map((entry) => entry.platformId), ['ebay', 'depop']);
  assert.deepEqual(createRemovalChecklist(sold, 'Depop con boost').map((entry) => entry.platformId), ['vinted', 'ebay']);
});

test('usa i titoli generati dall’IA al posto delle proposte locali', () => {
  const generated = [
    'Polo Ralph Lauren Camicia Uomo Manica Corta Bianca XL',
    'Polo Ralph Lauren Camicia Uomo Bianca XL',
    'Polo Ralph Lauren Camicia Uomo Manica Corta Bianca Cotone XL',
  ];
  const titles = generateTitleVariants({ ...item, listing: { ...item.listing, generatedTitles: generated } });
  assert.deepEqual(titles, generated);
});


test('prepara la ricerca Vinted e il prompt per analizzare la registrazione', () => {
  const url = buildVintedSearchUrl(item);
  assert.match(url, /^https:\/\/www\.vinted\.it\/catalog\?/);
  const query = new URL(url).searchParams.get('search_text');
  assert.match(query, /Carhartt/);
  assert.match(query, /Bermuda cargo/);
  const filters = getVintedFilterSummary(item);
  assert.ok(filters.some((entry) => entry.label === 'Brand' && entry.value === 'Carhartt'));
  const prompt = buildVintedPriceAnalysisPrompt(item);
  assert.match(prompt, /più cuori/i);
  assert.match(prompt, /Protezione acquisti/i);
  assert.match(prompt, /PREZZO TARGET/i);
});

test('gestisce separatamente piattaforme da fare, in bozza e online', () => {
  const draftListing = setPlatformState(item, 'ebay', 'draft');
  const draftItem = { ...item, listing: draftListing };
  assert.equal(getPlatformState(draftItem, 'ebay'), 'draft');
  assert.equal(draftListing.completedPlatforms.ebay, undefined);
  const liveListing = setPlatformState(draftItem, 'ebay', 'live');
  const liveItem = { ...item, listing: liveListing };
  assert.equal(getPlatformState(liveItem, 'ebay'), 'live');
  assert.equal(liveListing.completedPlatforms.ebay, true);
});
