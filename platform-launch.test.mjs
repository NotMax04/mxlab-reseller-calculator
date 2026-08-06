import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlatform } from './listing.js';

test('eBay prioritizes the native app instead of an embedded browser', () => {
  const ebay = getPlatform('ebay');
  assert.equal(ebay.launchMode, 'native');
  assert.equal(ebay.appUrl, 'ebay://');
  assert.match(ebay.openNote, /tocca Vendi/i);
});

test('Facebook opens native Marketplace without automatic Safari fallback', () => {
  const facebook = getPlatform('facebook');
  assert.equal(facebook.launchMode, 'native');
  assert.equal(facebook.appUrl, 'fb://marketplace');
  assert.doesNotMatch(facebook.appUrl, /create/);
  assert.equal(facebook.webUrl, 'https://www.facebook.com/marketplace/create/item');
});

test('Depop no longer uses the broken products/create route', () => {
  const depop = getPlatform('depop');
  assert.equal(depop.universalUrl, 'https://www.depop.com/sell/');
  assert.doesNotMatch(depop.universalUrl, /products\/create/);
  assert.match(depop.openNote, /tocca \+/i);
});
