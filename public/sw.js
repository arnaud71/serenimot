const CACHE_NAME = "serenimot-v0-1-5";
const APP_BASE = new URL(self.registration.scope);
const APP_SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "static/dictionary/lexique4005.txt",
  "static/dictionary/releases/lexique4005.manifest.json",
  "static/dictionary/lexique4005.explanations.manifest.json"
].map((path) => new URL(path, APP_BASE).toString());
const INDEX_URL = new URL("index.html", APP_BASE).toString();
const CURRENT_DICTIONARY_FILES = new Set(
  [
    "static/dictionary/lexique4005.txt",
    "static/dictionary/releases/lexique4005.manifest.json",
    "static/dictionary/lexique4005.explanations.manifest.json",
    "static/dictionary/lexique4005.explanations-2.json",
    "static/dictionary/lexique4005.explanations-3.json",
    "static/dictionary/lexique4005.explanations-4.json",
    ..."abcdefghijklmnopqrstuvwxyz"
      .split("")
      .map((initial) => `static/dictionary/lexique4005.explanations-${initial}.json`)
  ].map((path) => new URL(path, APP_BASE).toString())
);
const CACHEABLE_PATH_PREFIXES = [
  new URL("assets/", APP_BASE).pathname,
  new URL("icons/", APP_BASE).pathname
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => pruneCurrentCache())
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, INDEX_URL));
    return;
  }

  if (CURRENT_DICTIONARY_FILES.has(requestUrl.toString()) || isCacheableStaticPath(requestUrl)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await putIfCacheable(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackUrl = null) {
  try {
    const response = await fetch(request);
    await putIfCacheable(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    if (fallbackUrl) {
      return caches.match(fallbackUrl);
    }

    throw new Error("Network unavailable and no cached response found.");
  }
}

async function putIfCacheable(request, response) {
  if (!response.ok || response.type === "opaque") {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

async function pruneCurrentCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();

  await Promise.all(
    requests.map((request) => {
      const url = new URL(request.url);

      if (url.pathname.includes("/static/dictionary/") && !CURRENT_DICTIONARY_FILES.has(url.toString())) {
        return cache.delete(request);
      }

      return Promise.resolve(false);
    })
  );
}

function isCacheableStaticPath(url) {
  return CACHEABLE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}
