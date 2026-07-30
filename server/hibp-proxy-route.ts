/**
 * HIBP (Have I Been Pwned) proxy route.
 *
 * Proxies k-anonymity password prefix requests to api.pwnedpasswords.com so
 * that the browser never talks to the third-party API directly.
 *
 * GET /api/hibp/:prefix  — prefix must be exactly 5 uppercase hex characters
 *
 * Rate limited to 10 requests per minute per IP to prevent prefix enumeration.
 */

import type { Express, Request, Response } from 'express';

const PREFIX_RE = /^[0-9A-F]{5}$/i;

type RateLimitEntry = { count: number; resetAt: number };
const hibpRateLimit = new Map<string, RateLimitEntry>();

// Prune expired entries every 5 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hibpRateLimit) {
    if (entry.resetAt < now) hibpRateLimit.delete(key);
  }
}, 5 * 60_000).unref();

function isRateLimited(ip: string): { limited: boolean; retryAfterSeconds: number } {
  const MAX_REQUESTS = 10;
  const WINDOW_MS = 60_000;
  const now = Date.now();
  const entry = hibpRateLimit.get(ip);
  if (!entry || now >= entry.resetAt) {
    hibpRateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function registerHibpProxyRoute(app: Express): void {
  app.get('/api/hibp/:prefix', async (req: Request, res: Response) => {
    const ip = String(req.ip ?? req.socket.remoteAddress ?? 'unknown');
    const { limited, retryAfterSeconds } = isRateLimited(ip);
    if (limited) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).send('Too Many Requests');
      return;
    }

    const prefix = req.params['prefix'] as string;
    if (!PREFIX_RE.test(prefix)) {
      res.status(400).send('Bad Request');
      return;
    }

    try {
      const upstream = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`,
        { headers: { 'Add-Padding': 'true' } },
      );
      if (!upstream.ok) {
        res.status(502).send('Upstream error');
        return;
      }
      const text = await upstream.text();
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(text);
    } catch {
      res.status(502).send('Gateway error');
    }
  });
}
