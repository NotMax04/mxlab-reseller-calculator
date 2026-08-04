import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_EBAY_SHIPPING,
  calculateMXLABPrices,
  roundNearestWhole,
  roundNearestX90,
  roundUpToWhole,
  roundUpToX90,
} from './calculator.js';

test('R90 seleziona il prezzo in ,90 più vicino e arrotonda le parità verso l’alto', () => {
  assert.equal(roundNearestX90(20), 19.9);
  assert.equal(roundNearestX90(20.39), 19.9);
  assert.equal(roundNearestX90(20.4), 20.9);
  assert.equal(roundNearestX90(20.9), 20.9);
});

test('C90 seleziona il primo prezzo in ,90 uguale o superiore', () => {
  assert.equal(roundUpToX90(20), 20.9);
  assert.equal(roundUpToX90(20.9), 20.9);
  assert.equal(roundUpToX90(20.91), 21.9);
});

test('INT e SUP seguono le regole ufficiali', () => {
  assert.equal(roundNearestWhole(20.49), 20);
  assert.equal(roundNearestWhole(20.5), 21);
  assert.equal(roundUpToWhole(20), 20);
  assert.equal(roundUpToWhole(20.01), 21);
});

test('il target 15 corrisponde alle formule ufficiali MXLAB', () => {
  const model = calculateMXLABPrices(15, MIN_EBAY_SHIPPING);
  assert.deepEqual(model.prices, {
    vinted: 18.9, wallapop: 18.9, ebay: 24.9, subito: 19, facebook: 19,
    vestiaire: 34, depop: 23.9, depopBoost: 26.9, grailed: 28,
  });
  assert.deepEqual(model.minimums, { ebay: 20.9, depop: 18.9, depopBoost: 21.9, grailed: 23 });
  assert.deepEqual(model.offers, { ebay: 22.9, depop: 21.9, depopBoost: 24.9 });
});

test('la spedizione eBay non può essere inferiore a 5,35 euro', () => {
  assert.equal(calculateMXLABPrices(15, 0).ebayShipping, 5.35);
  assert.equal(calculateMXLABPrices(15, 7).ebayShipping, 7);
});

test('le offerte automatiche restano sotto i prezzi e sopra i minimi', () => {
  for (const target of [5, 10, 15, 20, 30, 50, 100]) {
    const model = calculateMXLABPrices(target);
    assert.ok(model.offers.ebay < model.prices.ebay && model.offers.ebay >= model.minimums.ebay);
    assert.ok(model.offers.depop < model.prices.depop && model.offers.depop >= model.minimums.depop);
    assert.ok(model.offers.depopBoost < model.prices.depopBoost && model.offers.depopBoost >= model.minimums.depopBoost);
  }
});
