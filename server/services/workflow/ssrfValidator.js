import dns from 'dns';
import net from 'net';

/**
 * Known internal hostnames and cloud metadata identifiers
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.internal',
  'instance-data',
  'kubernetes.default',
  'kubernetes.default.svc'
]);

/**
 * Tests whether an IPv4 or IPv6 address belongs to a private, loopback, link-local, or reserved range
 * @param {string} ip
 * @returns {boolean} true if blocked, false if public
 */
export const isBlockedIp = (ip) => {
  if (!ip || typeof ip !== 'string') return true;

  let cleanIp = ip.trim().toLowerCase();

  // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }

  // 1. IPv4 Checks
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed IPv4
    }

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 - Current network ("this" network)
    if (a === 0) return true;

    // 10.0.0.0/8 - Private-Use
    if (a === 10) return true;

    // 100.64.0.0/10 - Shared Address Space (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 127.0.0.0/8 - Loopback
    if (a === 127) return true;

    // 169.254.0.0/16 - Link-Local / Cloud Metadata (AWS/GCP/Azure: 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 - Private-Use (172.16.0.0 – 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.0.0.0/24 - IETF Protocol Assignments
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.0.2.0/24 - Documentation (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;

    // 192.168.0.0/16 - Private-Use
    if (a === 192 && b === 168) return true;

    // 198.18.0.0/15 - Benchmarking
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 198.51.100.0/24 - Documentation (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;

    // 203.0.113.0/24 - Documentation (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;

    // 224.0.0.0/4 - Multicast
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 - Reserved for Future Use / Broadcast
    if (a >= 240) return true;

    return false;
  }

  // 2. IPv6 Checks
  if (net.isIPv6(cleanIp)) {
    // ::1 Loopback
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;

    // :: Unspecified
    if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;

    // Unique Local Addresses (fc00::/7 - starts with fc or fd)
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;

    // Link-Local Unicast (fe80::/10 - starts with fe8, fe9, fea, feb)
    if (
      cleanIp.startsWith('fe8') ||
      cleanIp.startsWith('fe9') ||
      cleanIp.startsWith('fea') ||
      cleanIp.startsWith('feb')
    ) {
      return true;
    }

    // Multicast (ff00::/8)
    if (cleanIp.startsWith('ff')) return true;

    // Documentation (2001:db8::/32)
    if (cleanIp.startsWith('2001:db8') || cleanIp.startsWith('2001:0db8')) return true;

    return false;
  }

  // Not recognized as valid IP format
  return true;
};

/**
 * Validates a target URL against SSRF rules, protocol constraints, and DNS records
 * @param {string} rawUrl
 * @returns {Promise<{ isAllowed: boolean, reason?: string, parsedUrl?: URL }>}
 */
export const validateUrlForSsrf = async (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isAllowed: false,
      reason: 'URL is required and must be a valid string.'
    };
  }

  const trimmedUrl = rawUrl.trim();

  let urlObj;
  try {
    urlObj = new URL(trimmedUrl);
  } catch (err) {
    return {
      isAllowed: false,
      reason: 'Invalid URL format.'
    };
  }

  // 1. Protocol validation: strictly enforce http and https
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return {
      isAllowed: false,
      reason: `Unsupported URL protocol: "${urlObj.protocol}". Only HTTP and HTTPS are permitted.`
    };
  }

  const hostname = urlObj.hostname.toLowerCase();

  if (!hostname) {
    return {
      isAllowed: false,
      reason: 'Target URL is missing a valid hostname.'
    };
  }

  // 2. Direct hostname blocklist
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return {
      isAllowed: false,
      reason: `Destination hostname "${hostname}" is prohibited by the SSRF security policy.`
    };
  }

  // 3. If hostname is directly an IP address
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      return {
        isAllowed: false,
        reason: `Direct IP destination "${hostname}" is in a restricted private, loopback, or metadata range.`
      };
    }
    return {
      isAllowed: true,
      parsedUrl: urlObj
    };
  }

  // 4. DNS resolution check (prevent DNS rebinding / private IP resolution)
  try {
    const lookupResults = await dns.promises.lookup(hostname, { all: true });

    if (!lookupResults || lookupResults.length === 0) {
      return {
        isAllowed: false,
        reason: `Could not resolve hostname "${hostname}".`
      };
    }

    for (const record of lookupResults) {
      if (isBlockedIp(record.address)) {
        return {
          isAllowed: false,
          reason: `Hostname "${hostname}" resolved to restricted IP "${record.address}" (SSRF blocked).`
        };
      }
    }

    return {
      isAllowed: true,
      parsedUrl: urlObj
    };
  } catch (dnsErr) {
    return {
      isAllowed: false,
      reason: `DNS resolution failed for hostname "${hostname}": ${dnsErr.message || 'Host not found'}.`
    };
  }
};
