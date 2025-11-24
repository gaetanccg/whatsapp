import api from './api.js';

// Hosts to proxy in dev. Keep in sync with backend PROXY_ALLOWED_HOSTS if used.
const PROXY_HOSTS = (import.meta.env.VITE_PROXY_HOSTS || 'dlnk.one').split(',').map(h => h.trim()).filter(Boolean);

function shouldProxy(url) {
    try {
        const u = new URL(url);
        return PROXY_HOSTS.includes(u.hostname);
    } catch (e) {
        return false;
    }
}

export function installFetchProxy() {
    if (typeof window === 'undefined' || window.__fetchProxyInstalled) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async(input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        if (shouldProxy(url)) {
            try {
                const method = (init && init.method) || 'GET';
                // Normalize headers to simple object
                const headers = {};
                if (init && init.headers) {
                    // Headers or plain object
                    if (typeof Headers !== 'undefined' && init.headers instanceof Headers) {
                        init.headers.forEach((v, k) => (headers[k] = v));
                    } else if (Array.isArray(init.headers)) {
                        init.headers.forEach(([k, v]) => (headers[k] = v));
                    } else if (typeof init.headers === 'object') {
                        Object.assign(headers, init.headers);
                    }
                }
                const body = init && init.body ? init.body : null;

                // Use backend proxy endpoint
                const resp = await api.post('/proxy/forward',
                    {
                        url,
                        method,
                        headers,
                        body
                    }
                );

                // Build a Response-like object using browser Response
                const respBody = resp.data;
                const status = resp.status || 200;
                const respHeaders = new Headers(resp.headers || {});
                return new Response(respBody,
                    {
                        status,
                        headers: respHeaders
                    }
                );
            } catch (err) {
                return Promise.reject(err);
            }
        }

        return originalFetch(input, init);
    };

    window.__fetchProxyInstalled = true;
}

// Auto-install in dev mode only
if (import.meta.env.DEV) {
    installFetchProxy();
}

