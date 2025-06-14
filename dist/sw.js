/**
 * Service Worker for Universal Contribution Manager
 * 
 * This service worker provides offline functionality, caching strategies,
 * and background sync capabilities for the application.
 * 
 * Features:
 * - Static asset caching
 * - Dynamic content caching with network-first strategy
 * - Offline fallback pages
 * - Background sync for data updates
 * - Cache versioning and cleanup
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2024-06-14
 */

const CACHE_NAME = 'ucm-v3.0.0';
const OFFLINE_URL = '/offline.html';

// Static assets to cache immediately
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/src/main.js',
    '/src/styles/main.css',
    '/src/styles/components.css',
    '/src/styles/themes.css',
    '/src/config/firebase.js',
    '/src/core/event-bus.js',
    '/src/core/router.js',
    '/src/core/component-manager.js',
    '/src/services/auth-service.js',
    '/src/utils/logger.js',
    '/src/utils/error-handler.js',
    '/src/components/base-component.js',
    '/src/components/navigation-component.js',
    '/src/components/dashboard-component.js',
    OFFLINE_URL,
    // Add common icons and images
    '/assets/favicon.ico'
];

// URLs that should always be fetched from network
const NETWORK_ONLY_URLS = [
    '/api/',
    'https://identitytoolkit.googleapis.com/',
    'https://securetoken.googleapis.com/',
    'https://www.googleapis.com/',
    'https://firebase.googleapis.com/'
];

// URLs that should use cache-first strategy
const CACHE_FIRST_URLS = [
    '/assets/',
    'https://fonts.googleapis.com/',
    'https://fonts.gstatic.com/'
];

/**
 * Service Worker Installation
 * 
 * Cache static assets during installation
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

/**
 * Service Worker Activation
 * 
 * Clean up old caches and take control of all clients
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker');

    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName !== CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ])
            .then(() => {
                console.log('[SW] Service worker activated successfully');
            })
            .catch((error) => {
                console.error('[SW] Service worker activation failed:', error);
            })
    );
});

/**
 * Fetch Event Handler
 * 
 * Implement caching strategies based on request type
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests that aren't APIs
    if (url.origin !== location.origin && !isApiRequest(url)) {
        return;
    }

    event.respondWith(handleFetch(request));
});

/**
 * Handle fetch requests with appropriate caching strategy
 * 
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} Response from cache or network
 */
async function handleFetch(request) {
    const url = new URL(request.url);

    try {
        // Network-only URLs (APIs, authentication)
        if (shouldUseNetworkOnly(url)) {
            return await fetchFromNetwork(request);
        }

        // Cache-first URLs (static assets, fonts)
        if (shouldUseCacheFirst(url)) {
            return await fetchCacheFirst(request);
        }

        // Default: Network-first strategy
        return await fetchNetworkFirst(request);

    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        return await handleFetchError(request, error);
    }
}

/**
 * Network-only fetch strategy
 * 
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} Response from network
 */
async function fetchFromNetwork(request) {
    const response = await fetch(request);
    
    if (!response.ok) {
        throw new Error(`Network request failed: ${response.status}`);
    }
    
    return response;
}

/**
 * Cache-first fetch strategy
 * 
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} Response from cache or network
 */
async function fetchCacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
    }

    console.log('[SW] Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
        // Cache successful responses
        cache.put(request, networkResponse.clone());
    }

    return networkResponse;
}

/**
 * Network-first fetch strategy
 * 
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} Response from network or cache
 */
async function fetchNetworkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        console.log('[SW] Fetching from network:', request.url);
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            // Cache successful responses
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }

        throw new Error(`Network response not ok: ${networkResponse.status}`);

    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

/**
 * Handle fetch errors with fallback responses
 * 
 * @param {Request} request - The failed request
 * @param {Error} error - The error that occurred
 * @returns {Promise<Response>} Fallback response
 */
async function handleFetchError(request, error) {
    const url = new URL(request.url);

    // For navigation requests, serve offline page
    if (request.mode === 'navigate') {
        const cache = await caches.open(CACHE_NAME);
        const offlineResponse = await cache.match(OFFLINE_URL);
        
        if (offlineResponse) {
            return offlineResponse;
        }
    }

    // For API requests, return a structured error response
    if (isApiRequest(url)) {
        return new Response(
            JSON.stringify({
                error: 'Network unavailable',
                message: 'Please check your internet connection and try again.',
                offline: true
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    // For other requests, try to find a cached version
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }

    // Last resort: return a generic error response
    return new Response(
        'Content unavailable offline',
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'text/plain'
            }
        }
    );
}

/**
 * Check if URL should use network-only strategy
 * 
 * @param {URL} url - The URL to check
 * @returns {boolean} True if should use network-only
 */
function shouldUseNetworkOnly(url) {
    return NETWORK_ONLY_URLS.some(pattern => url.href.includes(pattern));
}

/**
 * Check if URL should use cache-first strategy
 * 
 * @param {URL} url - The URL to check
 * @returns {boolean} True if should use cache-first
 */
function shouldUseCacheFirst(url) {
    return CACHE_FIRST_URLS.some(pattern => url.href.includes(pattern));
}

/**
 * Check if URL is an API request
 * 
 * @param {URL} url - The URL to check
 * @returns {boolean} True if is API request
 */
function isApiRequest(url) {
    return url.pathname.startsWith('/api/') || 
           url.hostname.includes('googleapis.com') ||
           url.hostname.includes('firebase.com');
}

/**
 * Background Sync Event Handler
 * 
 * Handle background sync for offline data
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'background-sync-contributions') {
        event.waitUntil(syncContributions());
    } else if (event.tag === 'background-sync-profile') {
        event.waitUntil(syncProfile());
    }
});

/**
 * Sync contributions data in background
 */
async function syncContributions() {
    try {
        console.log('[SW] Syncing contributions data');
        
        // Get pending contributions from IndexedDB
        const pendingData = await getPendingContributions();
        
        if (pendingData.length > 0) {
            // Sync each pending contribution
            for (const contribution of pendingData) {
                await syncSingleContribution(contribution);
            }
            
            // Clear synced data
            await clearPendingContributions();
            
            console.log('[SW] Contributions sync completed');
            
            // Notify clients about successful sync
            notifyClients('sync-completed', { type: 'contributions' });
        }
        
    } catch (error) {
        console.error('[SW] Contributions sync failed:', error);
        
        // Notify clients about sync failure
        notifyClients('sync-failed', { 
            type: 'contributions', 
            error: error.message 
        });
    }
}

/**
 * Sync profile data in background
 */
async function syncProfile() {
    try {
        console.log('[SW] Syncing profile data');
        
        // Implementation would depend on data storage strategy
        // This is a placeholder for profile sync logic
        
        console.log('[SW] Profile sync completed');
        notifyClients('sync-completed', { type: 'profile' });
        
    } catch (error) {
        console.error('[SW] Profile sync failed:', error);
        notifyClients('sync-failed', { 
            type: 'profile', 
            error: error.message 
        });
    }
}

/**
 * Get pending contributions from IndexedDB
 * (Placeholder - implement actual IndexedDB operations)
 */
async function getPendingContributions() {
    // This would interact with IndexedDB to get pending sync data
    return [];
}

/**
 * Sync a single contribution
 * (Placeholder - implement actual API call)
 */
async function syncSingleContribution(contribution) {
    const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(contribution)
    });

    if (!response.ok) {
        throw new Error(`Failed to sync contribution: ${response.status}`);
    }

    return response.json();
}

/**
 * Clear pending contributions after successful sync
 * (Placeholder - implement actual IndexedDB operations)
 */
async function clearPendingContributions() {
    // This would clear synced data from IndexedDB
}

/**
 * Notify all clients about events
 * 
 * @param {string} type - The message type
 * @param {Object} data - The message data
 */
function notifyClients(type, data = {}) {
    self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
            client.postMessage({
                type,
                data,
                timestamp: Date.now()
            });
        });
    });
}

/**
 * Push Event Handler
 * 
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');

    let options = {
        body: 'New activity in Universal Contribution Manager',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: 'ucm-notification',
        data: {
            url: '/'
        }
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            options = {
                ...options,
                ...payload
            };
        } catch (error) {
            console.error('[SW] Failed to parse push payload:', error);
        }
    }

    event.waitUntil(
        self.registration.showNotification('Universal Contribution Manager', options)
    );
});

/**
 * Notification Click Handler
 * 
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Check if app is already open
            for (const client of clients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            // Open new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

/**
 * Message Event Handler
 * 
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    const { type, data } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'CACHE_UPDATE':
            // Handle cache update requests
            handleCacheUpdate(data);
            break;
            
        default:
            console.log('[SW] Unknown message type:', type);
    }
});

/**
 * Handle cache update requests
 * 
 * @param {Object} data - Update data
 */
async function handleCacheUpdate(data) {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        if (data.urls && Array.isArray(data.urls)) {
            await cache.addAll(data.urls);
            console.log('[SW] Cache updated with new URLs');
        }
        
    } catch (error) {
        console.error('[SW] Cache update failed:', error);
    }
}

// Log service worker lifecycle
console.log('[SW] Service worker script loaded');

// Report to main thread when SW is ready
self.addEventListener('activate', () => {
    notifyClients('sw-activated', { version: CACHE_NAME });
});
