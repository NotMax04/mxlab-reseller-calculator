import test from 'node:test';
import assert from 'node:assert/strict';
import { GOOGLE_MIGRATION } from './seed-data.js';

test('migra 16 articoli operativi', () => {
  assert.equal(GOOGLE_MIGRATION.inventory.length, 16);
  assert.equal(GOOGLE_MIGRATION.inventory.filter((item) => item.status === 'sold').length, 9);
  assert.equal(GOOGLE_MIGRATION.inventory.filter((item) => item.status === 'live').length, 7);
});

test('migra 117 vendite storiche senza alterare il totale', () => {
  assert.equal(GOOGLE_MIGRATION.salesHistory.length, 117);
  const total = Math.round(GOOGLE_MIGRATION.salesHistory.reduce((sum, sale) => sum + sale.price, 0) * 100) / 100;
  assert.equal(total, 1330.55);
});

test('preserva lotti, fornitori, spese e checklist', () => {
  assert.equal(GOOGLE_MIGRATION.business.lots.length, 1);
  assert.equal(GOOGLE_MIGRATION.business.suppliers.length, 1);
  assert.equal(GOOGLE_MIGRATION.business.expenses.length, 1);
  assert.equal(GOOGLE_MIGRATION.business.checklist.length, 35);
});
