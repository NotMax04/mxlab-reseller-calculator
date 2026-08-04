import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createItemCode,
  createInventoryItem,
  daysBetween,
  getInventoryMetrics,
  getItemMultiplier,
  getItemProfit,
  getSlowMovers,
  inferBrandFromTitle,
  inferCategoryFromTitle,
  nextStatus,
} from './inventory.js';

test('genera codici progressivi', () => {
  assert.equal(createItemCode([{ code: 'MX-0002' }, { code: 'MX-0010' }]), 'MX-0011');
});

test('calcola profitto e moltiplicatore di vendita', () => {
  const item = createInventoryItem({
    brand: 'Test', title: 'Polo', cost: 5, target: 15, status: 'sold',
    sale: { platform: 'Vinted', price: 15, net: 15, date: '2026-08-04' },
  });
  assert.equal(getItemProfit(item), 10);
  assert.equal(getItemMultiplier(item), 3);
});

test('calcola metriche inventario', () => {
  const items = [
    createInventoryItem({ brand: 'A', title: 'A', cost: 5, target: 15, status: 'live' }),
    createInventoryItem({ brand: 'B', title: 'B', cost: 10, target: 25, status: 'sold', sale: { platform: 'Vinted', price: 25, net: 25, date: '2026-08-04' } }),
  ];
  const metrics = getInventoryMetrics(items);
  assert.equal(metrics.available, 1);
  assert.equal(metrics.sold, 1);
  assert.equal(metrics.invested, 5);
  assert.equal(metrics.targetValue, 15);
  assert.equal(metrics.realizedProfit, 15);
});

test('individua articoli fermi', () => {
  const old = createInventoryItem({ brand: 'A', title: 'A', purchaseDate: '2026-01-01', status: 'live' });
  const fresh = createInventoryItem({ brand: 'B', title: 'B', purchaseDate: '2026-08-01', status: 'live' });
  const result = getSlowMovers([old, fresh], 30, '2026-08-04');
  assert.deepEqual(result.map((item) => item.brand), ['A']);
});

test('avanza correttamente nel workflow', () => {
  assert.equal(nextStatus('prep'), 'photo');
  assert.equal(nextStatus('photo'), 'publish');
  assert.equal(nextStatus('publish'), 'live');
  assert.equal(nextStatus('live'), 'live');
});

test('calcola giorni inclusi tra due date', () => {
  assert.equal(daysBetween('2026-08-01', '2026-08-04'), 3);
});


test('riconosce marca e categoria dal nome articolo', () => {
  assert.equal(inferBrandFromTitle('Bermuda cargo Carhartt'), 'Carhartt');
  assert.equal(inferBrandFromTitle('T-shirt bianca Tommy Jeans'), 'Tommy Jeans');
  assert.equal(inferCategoryFromTitle('Bermuda cargo Carhartt'), 'Shorts');
  assert.equal(inferCategoryFromTitle('Gilet smanicato Tommy beige'), 'Gilet');
});

test('compila automaticamente identità quando i campi sono vuoti', () => {
  const item = createInventoryItem({ title: 'Camicia Tommy Hilfiger con macchia', category: 'Altro' });
  assert.equal(item.brand, 'Tommy Hilfiger');
  assert.equal(item.category, 'Camicia');
});

test('calcola i giorni in stock dalla ricezione quando presente', () => {
  const item = createInventoryItem({
    brand: 'Carhartt', title: 'Bermuda', purchaseDate: '2026-07-05', receivedDate: '2026-07-20', status: 'live',
  });
  assert.equal(getSlowMovers([item], 15, '2026-08-04').length, 1);
  assert.equal(getSlowMovers([item], 16, '2026-08-04').length, 0);
});
