// Sleep Noise PWA - Service Worker with Full Offline Audio & HTTP Range Support
const CACHE_NAME = 'sleep-noise-v3';

const AUDIO_ASSETS = [
  './audio/brown-noise.mp3',
  './audio/rain.mp3',
  './audio/white-noise.mp3',
  './audio/pink-noise.mp3',
  './audio/rain-thunder.mp3',
  './audio/gentle-rain.mp3',
  './audio/bedtime-story-sample.mp3'
];

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

const ALL_ASSETS = [...APP_SHELL_ASSETS, ...AUDIO_ASSETS];

/**
 * Install Event: Pre-cache all audio files and app shell
 * Guarantees zero network required after first load
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker & pre-caching all audio files...');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Precache each asset, logging progress
      const cachePromises = ALL_ASSETS.map(async (asset) => {
        try {
          const response = await fetch(asset, { cache: 'reload' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching ${asset}`);
          }
          await cache.put(asset, response.clone());
          // Also store under full absolute URL to guarantee match by request.url
          const fullUrl = new URL(asset, self.location.href).href;
          await cache.put(fullUrl, response);
          console.log(`[SW] Pre-cached successfully: ${asset}`);
        } catch (err) {
          console.warn(`[SW] Warning: Failed to pre-cache ${asset}:`, err);
        }
      });

      await Promise.all(cachePromises);
      console.log('[SW] All audio files and static assets pre-cached.');
      return self.skipWaiting();
    })()
  );
});

/**
 * Activate Event: Clean up old cache versions and claim clients immediately
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
      console.log('[SW] Clients claimed. Active and controlling pages.');
    })()
  );
});

/**
 * Fetch Event: Handle requests
 * - Intercepts audio files and requests with Range header
 * - Serves 206 Partial Content responses from cache for seamless iOS Safari and Android playback
 * - Uses cache-first strategy for app shell
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Audio files or any Range requests
  if (url.pathname.includes('/audio/') || request.headers.has('range')) {
    event.respondWith(handleAudioRangeRequest(request));
    return;
  }

  // App shell & static assets (Cache-first with network background revalidation)
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Background revalidation
        fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, networkResponse);
            }
          })
          .catch(() => {/* Offline */});
        return cachedResponse;
      }

      // Network fallback
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Fallback for HTML navigation when offline
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw err;
      }
    })()
  );
});

/**
 * Parse standard HTTP Range headers
 * Handles:
 * - bytes=start-end
 * - bytes=start-
 * - bytes=-suffixLength
 */
function parseRangeHeader(rangeHeader, totalLength) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const rangeStr = rangeHeader.slice(6).trim();
  const parts = rangeStr.split('-');
  let start, end;

  if (parts[0] === '') {
    // Suffix byte range: e.g. bytes=-500 (last 500 bytes)
    const suffix = parseInt(parts[1], 10);
    if (isNaN(suffix) || suffix <= 0) return null;
    start = Math.max(0, totalLength - suffix);
    end = totalLength - 1;
  } else {
    start = parseInt(parts[0], 10);
    if (isNaN(start)) return null;
    if (parts[1] === '') {
      end = totalLength - 1;
    } else {
      end = parseInt(parts[1], 10);
      if (isNaN(end)) return null;
    }
  }

  // Validate bounds
  if (start < 0 || start >= totalLength || end < start) {
    return { unsatisfiable: true, totalLength };
  }

  end = Math.min(end, totalLength - 1);
  return {
    start,
    end,
    totalLength,
    chunkSize: end - start + 1
  };
}

/**
 * Handle Range requests for HTML5 <audio> from CacheStorage
 * Crucial for iOS Safari and Android Chrome offline playback
 */
async function handleAudioRangeRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  // Match response by URL string to ignore Range headers on cache lookup
  let response = await cache.match(request.url, { ignoreSearch: true });
  if (!response) {
    // Try pathname match
    const url = new URL(request.url);
    response = await cache.match(url.pathname, { ignoreSearch: true });
  }
  if (!response) {
    // Fallback to request object match
    response = await cache.match(request, { ignoreSearch: true });
  }

  // If not cached, fetch from network and store in cache
  if (!response) {
    try {
      console.log(`[SW] Audio not in cache, fetching from network: ${request.url}`);
      const networkResponse = await fetch(request);
      if (networkResponse && (networkResponse.ok || networkResponse.status === 206)) {
        // Clone and save full version in cache
        cache.put(request.url, networkResponse.clone());
        return networkResponse;
      }
      return networkResponse;
    } catch (err) {
      console.error(`[SW] Network failed and audio not in cache: ${request.url}`, err);
      return new Response('Audio file unavailable offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  const rangeHeader = request.headers.get('range');
  const contentType = response.headers.get('Content-Type') || 'audio/mpeg';

  // If no Range header, return full response with Accept-Ranges: bytes
  if (!rangeHeader) {
    const headers = new Headers(response.headers);
    headers.set('Accept-Ranges', 'bytes');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  // Handle Range request with arrayBuffer slicing
  try {
    const arrayBuffer = await response.arrayBuffer();
    const totalLength = arrayBuffer.byteLength;
    const range = parseRangeHeader(rangeHeader, totalLength);

    if (!range || range.unsatisfiable) {
      return new Response('', {
        status: 416,
        statusText: 'Range Not Satisfiable',
        headers: {
          'Content-Range': `bytes */${totalLength}`,
          'Accept-Ranges': 'bytes'
        }
      });
    }

    // Slice requested byte range: [start, end + 1)
    const slicedBuffer = arrayBuffer.slice(range.start, range.end + 1);

    return new Response(slicedBuffer, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes ${range.start}-${range.end}/${range.totalLength}`,
        'Content-Length': String(range.chunkSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (err) {
    console.error('[SW] Error slicing range request from cached audio:', err);
    return response;
  }
}
