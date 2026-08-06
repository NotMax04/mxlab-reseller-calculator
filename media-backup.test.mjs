import test from 'node:test';
import assert from 'node:assert/strict';
import { dataUrlToBlob, validatePhotoBackupEntries } from './media-store.js';

test('backup image data URL is restored as a Blob', async () => {
  const blob = dataUrlToBlob('data:image/jpeg;base64,SGVsbG8=');
  assert.equal(blob.type, 'image/jpeg');
  assert.equal(await blob.text(), 'Hello');
});

test('invalid backup image data is rejected', () => {
  assert.throws(() => dataUrlToBlob('not-a-data-url'), /Foto backup non valida/);
});

test('photo backup is completely validated before restore', async () => {
  const records = validatePhotoBackupEntries([
    { id: 'p1', itemId: 'i1', dataUrl: 'data:image/jpeg;base64,SGVsbG8=' },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].itemId, 'i1');
  assert.equal(await records[0].blob.text(), 'Hello');
});

test('incomplete photo backup is rejected instead of silently deleting local photos', () => {
  assert.throws(
    () => validatePhotoBackupEntries([{ id: 'p1', itemId: 'i1' }]),
    /Foto backup incompleta/,
  );
});

test('duplicate photo ids are rejected', () => {
  const entry = { id: 'p1', itemId: 'i1', dataUrl: 'data:image/jpeg;base64,SGVsbG8=' };
  assert.throws(() => validatePhotoBackupEntries([entry, entry]), /Foto duplicata/);
});
