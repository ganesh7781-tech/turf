self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Just fetch normally, no caching to prevent stale data issues with localStorage for now
});
