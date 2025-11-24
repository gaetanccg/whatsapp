import express from 'express';

const router = express.Router();

// Allowed hosts for proxy, comma-separated in env PROXY_ALLOWED_HOSTS (default: dlnk.one)
const ALLOWED_HOSTS = (process.env.PROXY_ALLOWED_HOSTS || 'dlnk.one').split(',').map(h => h.trim()).filter(Boolean);

function isAllowed(url) {
  try {
    const u = new URL(url);
    return ALLOWED_HOSTS.includes(u.hostname) || ALLOWED_HOSTS.includes(`${u.hostname}:${u.port}`);
  } catch (err) {
    return false;
  }
}

// POST /api/proxy/forward
// Body: { url: string, method?: string, headers?: object, body?: any }
router.post('/forward', async (req, res) => {
  const { url, method = 'GET', headers = {}, body } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid url in body' });
  }

  if (!isAllowed(url)) {
    return res.status(403).json({ message: 'Target host not allowed' });
  }

  try {
    // Use global fetch (Node 18+). If not available, this will fail and should be replaced by node-fetch.
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: headers || {}
    };

    if (body !== undefined && body !== null) {
      // If body is an object and content-type not set, assume JSON
      if (typeof body === 'object' && !(body instanceof Buffer) && !fetchOptions.headers['content-type'] && !fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
      } else {
        fetchOptions.body = body;
      }
    }

    const resp = await fetch(url, fetchOptions);
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const text = await resp.text();

    res.status(resp.status).set('Content-Type', contentType).send(text);
  } catch (err) {
    console.error('Proxy forward error:', err);
    res.status(500).json({ message: 'Proxy request failed', error: err.message });
  }
});

export default router;

