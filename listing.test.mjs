import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMXLABPrices } from './calculator.js';
import {
  createRemovalChecklist,
  generateBaseDescription,
  generatePlatformContent,
  getPublishPlan,
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
    color: 'Verde',
    material: 'Cotone ripstop',
    measurements: 'Vita 42 cm · Lunghezza 52 cm',
    defects: '',
    photoCount: 5,
  },
};

test('normalizza la scheda annuncio senza perdere le scelte', () => {
  const listing = normalizeListing({ vestiaireEnabled: true, excludedPlatforms: ['facebook', 'facebook'], photoCount: 6 });
  assert.equal(listing.vestiaireEnabled, true);
  assert.deepEqual(listing.excludedPlatforms, ['facebook']);
  assert.equal(listing.photoCount, 6);
});

test('genera un piano standard con Facebook e Vestiaire opzionali', () => {
  const normal = getPublishPlan(item, { facebookEnabled: true }).map((platform) => platform.id);
  assert.deepEqual(normal, ['vinted', 'ebay', 'wallapop', 'subito', 'facebook', 'depop', 'grailed']);
  const premium = getPublishPlan({ ...item, listing: { ...item.listing, vestiaireEnabled: true } }, { facebookEnabled: false }).map((platform) => platform.id);
  assert.deepEqual(premium, ['vinted', 'ebay', 'wallapop', 'subito', 'vestiaire', 'depop', 'grailed']);
});

test('genera una descrizione universale completa', () => {
  const description = generateBaseDescription(item);
  assert.match(description, /Carhartt/);
  assert.match(description, /Cotone ripstop/);
  assert.match(description, /Vita 42 cm/);
});

test('genera titoli, descrizioni e prezzi specifici per piattaforma', () => {
  const contents = generatePlatformContent(item, calculateMXLABPrices(15));
  assert.equal(contents.vinted.price, 18.9);
  assert.equal(contents.ebay.price, 24.9);
  assert.equal(contents.grailed.price, 28);
  assert.ok(contents.ebay.title.length <= 80);
  assert.match(contents.depop.description, /#/);
  assert.match(contents.grailed.description, /Condition:/);
});

test('considera pronta la scheda con cinque foto e dati completi', () => {
  const ready = listingReadiness(item, 5);
  assert.equal(ready.ready, true);
  assert.equal(ready.percent, 100);
  const incomplete = listingReadiness({ ...item, size: '' }, 4);
  assert.equal(incomplete.ready, false);
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
