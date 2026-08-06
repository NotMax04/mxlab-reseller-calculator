const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function chooseVideoFrameTimes(duration, options = {}) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  if (!safeDuration) return [];
  const minFrames = Math.max(1, Math.trunc(options.minFrames || 8));
  const maxFrames = Math.max(minFrames, Math.trunc(options.maxFrames || 18));
  const secondsPerFrame = Math.max(1, Number(options.secondsPerFrame) || 4);
  const desired = clamp(Math.round(safeDuration / secondsPerFrame), minFrames, maxFrames);
  const edge = Math.min(0.75, safeDuration * 0.05);
  if (desired === 1) return [safeDuration / 2];
  const start = edge;
  const end = Math.max(start, safeDuration - edge);
  const step = (end - start) / (desired - 1);
  return Array.from({ length: desired }, (_, index) => Math.max(0, Math.min(safeDuration, start + step * index)));
}

function waitFor(video, eventName, errorName = 'error') {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, onReady);
      video.removeEventListener(errorName, onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Impossibile leggere il video')); };
    video.addEventListener(eventName, onReady, { once: true });
    video.addEventListener(errorName, onError, { once: true });
  });
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.84) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Impossibile creare i fotogrammi')), type, quality);
  });
}

function timestampLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes}m${rest}s`;
}

export async function extractVideoFrames(file, options = {}) {
  if (!(file instanceof Blob)) throw new Error('Video non valido');
  const video = document.createElement('video');
  const sourceUrl = URL.createObjectURL(file);
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = sourceUrl;

  try {
    if (video.readyState < 1) await waitFor(video, 'loadedmetadata');
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration) throw new Error('Durata video non disponibile');
    const times = chooseVideoFrameTimes(duration, options);
    const maxWidth = Math.max(320, Math.trunc(options.maxWidth || 720));
    const sourceWidth = Math.max(1, video.videoWidth || 512);
    const sourceHeight = Math.max(1, video.videoHeight || 1112);
    const scale = Math.min(1, maxWidth / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Elaborazione immagini non disponibile');

    const files = [];
    for (let index = 0; index < times.length; index += 1) {
      const time = times[index];
      if (Math.abs(video.currentTime - time) > 0.05) {
        video.currentTime = time;
        await waitFor(video, 'seeked');
      }
      context.drawImage(video, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, 'image/jpeg', Number(options.quality) || 0.84);
      const name = `mxlab-comparabili-${String(index + 1).padStart(2, '0')}-${timestampLabel(time)}.jpg`;
      files.push(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
      options.onProgress?.({ current: index + 1, total: times.length, time });
    }
    return { files, duration, times, width, height };
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(sourceUrl);
  }
}
