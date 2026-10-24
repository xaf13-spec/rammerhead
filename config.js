const path = require('path');
const RammerheadJSMemCache = require('./src/classes/RammerheadJSMemCache');

const PUBLIC_HOST = 'rammerhead-production-9349.up.railway.app';

module.exports = {
  bindingAddress: '0.0.0.0',
  port: Number(process.env.PORT || 10000),
  // Railway exposes one public port; Rammerhead's optional second port is unavailable.
  crossDomainPort: null,
  enableWorkers: false,
  workers: 1,
  // Railway terminates HTTPS before forwarding requests to this Node process.
  // Never construct a URL from an empty Host header: that caused ERR_INVALID_URL
  // ("https://") and could interrupt page/resource requests.
  getServerInfo: (req) => {
    const forwardedHost = req.headers['x-forwarded-host'];
    const rawHost = req.headers.host || (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : '') || process.env.RAILWAY_PUBLIC_DOMAIN || PUBLIC_HOST;
    let hostname = PUBLIC_HOST;
    try {
      hostname = new URL('https://' + String(rawHost).replace(/^https?:\/\//i, '')).hostname || PUBLIC_HOST;
    } catch {
      hostname = PUBLIC_HOST;
    }
    return { hostname, port: 443, protocol: 'https:' };
  },
  // Keep HTTP/2 enabled for compatibility with modern sites and their streaming
  // and multiplexed resource requests. Malformed host headers are handled above.
  disableHttp2: false,
  // Use in-memory caching on an ephemeral instance.
  jsCache: new RammerheadJSMemCache(50 * 1024 * 1024),
  // Do not require a shared password for creating sessions.
  password: null,
  // Sessions are created through Vehemence's server API, then opened directly by the browser.
  // Those requests come from different IPs, so IP-bound sessions return 403 on navigation.
  restrictSessionToIP: false,
  // Railway is behind a reverse proxy; use the forwarded client IP when available.
  getIP: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    return (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
  },
  // The Vehemence browser displays proxied pages inside an iframe. Remove response
  // headers that would otherwise forbid iframe embedding, while preserving the
  // rest of each site's Content-Security-Policy directives.
  rewriteServerHeaders: {
    'x-frame-options': null,
    'content-security-policy': (value) => {
      if (!value) return value;
      return value
        .split(';')
        .filter((directive) => !/^\s*frame-ancestors\b/i.test(directive))
        .join(';')
        .trim();
    }
  },
  fileCacheSessionConfig: {
    saveDirectory: path.join(__dirname, 'sessions'),
    cacheTimeout: 1000 * 60 * 20,
    cacheCheckInterval: 1000 * 60 * 10,
    deleteUnused: true,
    staleCleanupOptions: {
      staleTimeout: 1000 * 60 * 60 * 24 * 3,
      maxToLive: null,
      staleCheckInterval: 1000 * 60 * 60 * 6
    },
    deleteCorruptedSessions: true
  }
};
