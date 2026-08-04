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
