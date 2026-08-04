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

test('corregge marche e categorie riconoscibili dal nome', () => {
  const byCode = Object.fromEntries(GOOGLE_MIGRATION.inventory.map((item) => [item.code, item]));
  assert.equal(byCode.MOD03.brand, 'Tommy Jeans');
  assert.equal(byCode.MOD03.category, 'T-shirt');
  assert.equal(byCode.MOD09.brand, 'Australian');
  assert.equal(byCode.MOD09.category, 'Pantaloni');
  assert.equal(byCode.MOD10.brand, 'Tommy Hilfiger');
  assert.equal(byCode.MOD10.category, 'Camicia');
  assert.equal(byCode.MOD12.brand, 'Carhartt');
  assert.equal(byCode.MOD12.category, 'Shorts');
  assert.equal(byCode.MOD14.brand, 'Tommy Hilfiger');
  assert.equal(byCode.MOD14.category, 'Gilet');
});

test('separa data acquisto e data ricezione del lotto Modori', () => {
  for (const item of GOOGLE_MIGRATION.inventory) {
    assert.equal(item.purchaseDate, '2026-07-05');
    assert.equal(item.receivedDate, '2026-07-20');
    assert.equal(item.migrationRevision, 3);
  }
});

test('non inventa condizioni mancanti e segnala i difetti espliciti', () => {
  const byCode = Object.fromEntries(GOOGLE_MIGRATION.inventory.map((item) => [item.code, item]));
  assert.equal(byCode.MOD03.condition, 'Con difetti');
  assert.equal(byCode.MOD05.condition, 'Con difetti');
  assert.equal(byCode.MOD10.condition, 'Con difetti');
  assert.equal(byCode.MOD12.condition, 'Non indicato');
});
