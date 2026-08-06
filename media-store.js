const DATABASE_NAME = 'mxlab-reseller-hub-media-v1';
const DATABASE_VERSION = 1;
const STORE_NAME = 'photos';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB non disponibile'));
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('itemId', 'itemId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Impossibile aprire archivio foto'));
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try { result = action(store); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error('Errore archivio foto')); };
    transaction.onabort = transaction.onerror;
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Errore archivio foto'));
  });
}

export async function getItemPhotos(itemId) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const index = transaction.objectStore(STORE_NAME).index('itemId');
    const rows = await requestResult(index.getAll(itemId));
    return rows.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.createdAt).localeCompare(String(b.createdAt)));
  } finally {
    database.close();
  }
}

async function imageToBlob(file, maximum = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) throw new Error('File non valido');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maximum / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Compressione foto fallita')), 'image/jpeg', quality));
}

export async function addItemPhotos(itemId, files, currentCount = 0, maximumPhotos = 12) {
  const selected = [...(files || [])].filter((file) => file?.type?.startsWith('image/')).slice(0, Math.max(0, maximumPhotos - currentCount));
  const created = [];
  for (let index = 0; index < selected.length; index += 1) {
    const source = selected[index];
    const blob = await imageToBlob(source);
    const id = globalThis.crypto?.randomUUID?.() || `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const record = {
      id,
      itemId,
      blob,
      name: `${itemId}-${currentCount + index + 1}.jpg`,
      type: 'image/jpeg',
      order: currentCount + index,
      createdAt: new Date().toISOString(),
    };
    await withStore('readwrite', (store) => store.put(record));
    created.push(record);
  }
  return created;
}

export async function deletePhoto(photoId) {
  await withStore('readwrite', (store) => store.delete(photoId));
}

export async function setCoverPhoto(itemId, photoId) {
  const photos = await getItemPhotos(itemId);
  const ordered = [photos.find((photo) => photo.id === photoId), ...photos.filter((photo) => photo.id !== photoId)].filter(Boolean);
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    ordered.forEach((photo, index) => store.put({ ...photo, order: index }));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function deleteItemPhotos(itemId) {
  const photos = await getItemPhotos(itemId);
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    photos.forEach((photo) => store.delete(photo.id));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export function photoToFile(photo) {
  return new File([photo.blob], photo.name || `${photo.id}.jpg`, { type: photo.type || photo.blob.type || 'image/jpeg' });
}

export async function clearAllPhotos() {
  await withStore('readwrite', (store) => store.clear());
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Lettura foto fallita'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl, fallbackType = 'image/jpeg') {
  const source = String(dataUrl || '');
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(source);
  if (!match) throw new Error('Foto backup non valida');
  const type = match[1] || fallbackType;
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export async function getAllPhotos() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const rows = await requestResult(transaction.objectStore(STORE_NAME).getAll());
    return rows.sort((a, b) => String(a.itemId).localeCompare(String(b.itemId)) || (a.order || 0) - (b.order || 0));
  } finally {
    database.close();
  }
}

export async function exportPhotosForBackup(onProgress = null) {
  const photos = await getAllPhotos();
  const output = [];
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    output.push({
      id: photo.id,
      itemId: photo.itemId,
      name: photo.name,
      type: photo.type || photo.blob?.type || 'image/jpeg',
      order: Number(photo.order) || 0,
      createdAt: photo.createdAt || new Date().toISOString(),
      size: Number(photo.blob?.size) || 0,
      dataUrl: await blobToDataUrl(photo.blob),
    });
    onProgress?.(index + 1, photos.length);
  }
  return output;
}

export function validatePhotoBackupEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('Archivio foto non valido');
  const seen = new Set();
  return entries.map((entry, index) => {
    if (!entry || !entry.id || !entry.itemId || !entry.dataUrl) {
      throw new Error(`Foto backup incompleta alla posizione ${index + 1}`);
    }
    const id = String(entry.id);
    if (seen.has(id)) throw new Error(`Foto duplicata nel backup: ${id}`);
    seen.add(id);
    const blob = dataUrlToBlob(entry.dataUrl, entry.type);
    if (!blob.size) throw new Error(`Foto backup vuota alla posizione ${index + 1}`);
    return {
      id,
      itemId: String(entry.itemId),
      blob,
      name: String(entry.name || `${entry.itemId}-${index + 1}.jpg`),
      type: String(entry.type || blob.type || 'image/jpeg'),
      order: Number(entry.order) || 0,
      createdAt: String(entry.createdAt || new Date().toISOString()),
    };
  });
}

export async function getPhotoCounts() {
  const counts = {};
  for (const photo of await getAllPhotos()) {
    const key = String(photo.itemId);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export async function restorePhotosFromBackup(entries, { replace = true, onProgress = null } = {}) {
  // Validiamo tutto prima di cancellare l'archivio esistente: un backup corrotto
  // non deve mai eliminare le fotografie già presenti sul dispositivo.
  const records = validatePhotoBackupEntries(entries);
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    if (replace) store.clear();
    records.forEach((record, index) => {
      store.put(record);
      onProgress?.(index + 1, records.length);
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Ripristino foto fallito'));
      transaction.onabort = transaction.onerror;
    });
  } finally {
    database.close();
  }
  return records.length;
}
