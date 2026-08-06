export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // The game remains fully usable without service worker registration.
    });
  });
}
