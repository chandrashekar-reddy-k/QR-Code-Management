import jwt from 'jsonwebtoken';
import http from 'http';
import https from 'https';
import crypto from 'crypto';

export class VillagKartAuthSdk {
  constructor(options = {}) {
    this.publicKey = options.publicKey || null;
    this.jwksUrl = options.jwksUrl || null;
    this.issuer = options.issuer || 'villagkart-identity-service';
    this.audience = options.audience || 'villagkart';
    this.serviceName = options.serviceName || null;
    this.serviceSecret = options.serviceSecret || null;
    
    this.cachedKeys = [];
    this.lastFetched = 0;
  }

  /**
   * Local verification of a JWT access token using the public key or dynamically fetched JWKS.
   */
  async verifyToken(token) {
    const pubKey = await this.getPublicKey();
    if (!pubKey) {
      throw new Error('Public verification key is not configured or resolved');
    }

    const options = {
      algorithms: ['RS256'],
      issuer: this.issuer,
      audience: this.audience
    };

    return jwt.verify(token, pubKey, options);
  }

  /**
   * Resolves the public key (local config or remote JWKS download with cache).
   */
  async getPublicKey() {
    if (this.publicKey) return this.publicKey;

    // Fetch from JWKS if configured and cached value is older than 1 hour
    const now = Date.now();
    if (this.jwksUrl && (now - this.lastFetched > 3600 * 1000 || !this.cachedKeys.length)) {
      try {
        const jwks = await this.fetchJWKS();
        if (jwks && jwks.keys && jwks.keys[0]) {
          const keyInfo = jwks.keys[0];
          if (keyInfo.x5c && keyInfo.x5c[0]) {
            // Reconstruct PEM public key format from x5c segment
            this.publicKey = `-----BEGIN PUBLIC KEY-----\n${keyInfo.x5c[0].match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----\n`;
            this.lastFetched = now;
          }
        }
      } catch (err) {
        console.error('Failed to retrieve JWKS public key remotely:', err.message);
      }
    }

    return this.publicKey;
  }

  /**
   * Remote JWKS Fetcher
   */
  fetchJWKS() {
    return new Promise((resolve, reject) => {
      const client = this.jwksUrl.startsWith('https') ? https : http;
      client.get(this.jwksUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Express middleware for local JWT authentication.
   * Can be injected directly into routing pipelines.
   */
  getExpressMiddleware() {
    return async (req, res, next) => {
      let token;
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication token required' });
      }

      try {
        const decoded = await this.verifyToken(token);
        req.user = decoded; // Mount lightweight claims
        next();
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication session' });
      }
    };
  }

  /**
   * Generate an HMAC-SHA256 signature headers for service-to-service communication.
   */
  generateServiceAuthHeaders(body = null) {
    if (!this.serviceName || !this.serviceSecret) {
      throw new Error('Service credentials are required to sign S2S calls');
    }

    const timestamp = String(Date.now());
    const bodyStr = body ? JSON.stringify(body) : '';
    const payload = `${this.serviceName}:${timestamp}:${bodyStr}`;

    const signature = crypto
      .createHmac('sha256', this.serviceSecret)
      .update(payload)
      .digest('hex');

    return {
      'X-Signature': signature,
      'X-Service-Name': this.serviceName,
      'X-Timestamp': timestamp
    };
  }
}
