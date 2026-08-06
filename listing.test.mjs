import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMXLABPrices } from './calculator.js';
import {
  createRemovalChecklist,
  generateBaseDescription,
  generatePlatformContent,
  generateTitleVariants,
  getPlatform,
  getPublishPlan,
  getVintedSearchPlan,
  buildVintedSearchUrl,
  listingReadiness,
  normalizeListing,
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
  const model = calculateMXLABPrices(15);
  const contents = generatePlatformContent(item, model);
  assert.equal(contents.vinted.price, 18.9);
  assert.equal(contents.ebay.price, 24.9);
  assert.equal(contents.grailed.price, 28);
  assert.equal(contents.depop.price, model.prices.depopBoost);
  assert.notEqual(contents.depop.price, model.prices.depop);
  assert.ok(contents.ebay.title.length <= 80);
  assert.match(contents.depop.description, /#/);
  assert.match(contents.grailed.description, /Taglia M/);
  assert.match(contents.vinted.description, /cotone ripstop/i);
});

test('mantiene righe vuote e impaginazione della descrizione importata', () => {
  const formatted = {
    ...item,
    listing: {
      ...item.listing,
      baseDescription: [
        'Misure: Spalle 43 cm',
        '',
        'Materiale: Cotone',
        '',
        'Taglia: M',
        '',
        'Colore: Verde',
        '',
        'Condizioni: Ottime',
        '',
        'Spedizione veloce 🚚 o ritiro a mano a Burago di Molgora 📍',
        '',
        'Scrivimi per info, misure o altro',
        '',
        'Prezzo trattabile!',
        '',
        '#Carhartt #Shorts #M',
      ].join('\n'),
    },
  };
  const contents = generatePlatformContent(formatted, calculateMXLABPrices(15));
  assert.match(contents.vinted.description, /Misure: Spalle 43 cm\n\nMateriale: Cotone/);
  assert.match(contents.vinted.description, /Prezzo trattabile!\n\n#Carhartt/);
});

test('considera pronta la scheda con cinque foto e dati completi', () => {
  const ready = listingReadiness(item, 5);
  assert.equal(ready.ready, true);
  assert.equal(ready.percent, 100);
  const incomplete = listingReadiness({ ...item, size: '' }, 4);
  assert.equal(incomplete.ready, false);
});

test('apre direttamente i moduli di vendita e conserva le sessioni web necessarie', () => {
  assert.equal(getPlatform('ebay').launchMode, 'universal');
  assert.equal(getPlatform('ebay').webUrl, 'https://www.ebay.it/sl/prelist');
  assert.equal(getPlatform('facebook').launchMode, 'safari');
  assert.equal(getPlatform('facebook').appUrl, undefined);
  assert.equal(getPlatform('facebook').webUrl, 'https://www.facebook.com/marketplace/create/item');
  assert.match(getPlatform('facebook').safariUrl, /^x-safari-https:\/\/www\.facebook\.com\/marketplace\/create\/item$/);
  assert.equal(getPlatform('depop').launchMode, 'universal');
  assert.equal(getPlatform('depop').webUrl, 'https://www.depop.com/products/create/');
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


test('apre la ricerca Vinted in Safari senza più e con filtri reali per la blusa OVS del test', () => {
  const ovs = {
    brand: 'OVS',
    title: 'Blusa catene e pois',
    category: 'Bluse',
    size: 'L',
    condition: 'Ottime',
    listing: {
      generatedTitles: [
        'OVS Donna Blusa Catene e Pois Nero Rosso Bianco L',
        'OVS Blusa Catene Pois Donna L',
        'OVS Donna Blusa Catene Pois Nero Rosso Bianco L',
      ],
      baseDescription: 'Materiale: Poliestere (Etichetta composizione assente)\nTaglia: L\nColore: Nero, Rosso, Bianco\nCondizioni: Ottime',
    },
  };
  const plan = getVintedSearchPlan(ovs);
  const url = buildVintedSearchUrl(ovs);
  assert.equal(plan.query, 'catene pois');
  assert.equal(plan.appliedCount, 5);
  assert.match(url, /catalog\/1043-bluse\/brand\/7651-ovs/);
  assert.match(url, /search_text=catene%20pois/);
  assert.match(url, /size_ids\[\]=1398/);
  assert.match(url, /status_ids\[\]=2/);
  assert.match(url, /color_ids\[\]=1/);
  assert.match(url, /color_ids\[\]=5/);
  assert.match(url, /color_ids\[\]=12/);
  assert.doesNotMatch(url, /\+/);
  assert.match(plan.safariUrl, /^x-safari-https:\/\/www\.vinted\.it\/catalog/);
  const material = plan.filters.find((filter) => filter.label === 'Materiale');
  assert.equal(material.applied, false);
  assert.match(material.reason, /composizione stimata/i);
});

test('chiede il reparto quando non può determinare la tabella taglie Vinted', () => {
  const ambiguous = { brand: 'Nike', title: 'T-shirt logo', category: 'T-shirt', size: 'M', condition: 'Buone', listing: {} };
  const plan = getVintedSearchPlan(ambiguous);
  assert.equal(plan.gender, '');
  assert.equal(plan.size, null);
  assert.equal(plan.filters.find((filter) => filter.label === 'Reparto').applied, false);
});

test('preserva il risultato strutturato dell’analisi video Vinted', () => {
  const listing = normalizeListing({
    vintedVideoReady: true,
    vintedVideoName: 'comparabili.mov',
    vintedVideoSize: 123456,
    vintedVideoDuration: 54,
    vintedAnalysis: {
      status: 'ok',
      target: 16,
      mode: 15,
      weighted: 16.5,
      rangeMin: 14,
      rangeMax: 18,
      validCount: 19,
      confidence: 'Alta',
      reason: 'Campione coerente.',
    },
  });
  assert.equal(listing.vintedVideoReady, true);
  assert.equal(listing.vintedVideoName, 'comparabili.mov');
  assert.equal(listing.vintedAnalysis.target, 16);
  assert.equal(listing.vintedAnalysis.confidence, 'Alta');
});
