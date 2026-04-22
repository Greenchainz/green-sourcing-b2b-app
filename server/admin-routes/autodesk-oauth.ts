/**
 * Autodesk SDA OAuth Setup Routes
 *
 * One-time flow to authorize GreenChainz to access the Sustainability Data API.
 * After this runs once, tokens are stored in app_settings and refresh automatically.
 *
 * Usage:
 *   1. Visit GET /api/admin/autodesk-auth  (as admin)
 *   2. Log in with your Autodesk account
 *   3. Done — EPD sync will work automatically from here on
 */

import { Router, Request, Response } from 'express';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  isSDAConfigured,
} from '../autodesk-sda-service';

export function registerAutodeskOAuthRoutes(router: Router): void {

  // Step 1 — redirect to Autodesk login
  router.get('/autodesk-auth', (req: Request, res: Response) => {
    try {
      const url = buildAuthorizationUrl();
      console.log('[SDA OAuth] Redirecting to Autodesk for authorization...');
      res.redirect(url);
    } catch (err) {
      console.error('[SDA OAuth] Failed to build auth URL:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Step 2 — Autodesk redirects back here with ?code=...
  router.get('/autodesk-callback', async (req: Request, res: Response) => {
    const code  = req.query['code']  as string | undefined;
    const error = req.query['error'] as string | undefined;

    if (error) {
      console.error('[SDA OAuth] Autodesk returned error:', error, req.query['error_description']);
      return res.status(400).send(`Autodesk OAuth error: ${error} — ${req.query['error_description'] ?? ''}`);
    }

    if (!code) {
      return res.status(400).send('Missing authorization code from Autodesk');
    }

    try {
      await exchangeCodeForTokens(code);
      console.log('[SDA OAuth] Setup complete — EPD sync is now active');
      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:auto">
          <h2 style="color:#15803d">✅ Autodesk SDA Connected</h2>
          <p>GreenChainz is now authorized to access the Sustainability Data API.</p>
          <p>EPD sync will run automatically on the next scheduler tick.</p>
          <p><a href="/admin">← Back to Admin Panel</a></p>
        </body></html>
      `);
    } catch (err) {
      console.error('[SDA OAuth] Token exchange failed:', err);
      res.status(500).send(`Token exchange failed: ${String(err)}`);
    }
  });

  // Status check — is SDA configured?
  router.get('/autodesk-status', async (_req: Request, res: Response) => {
    const configured = await isSDAConfigured();
    res.json({
      configured,
      message: configured
        ? 'SDA OAuth is active — refresh token stored'
        : 'SDA not configured — visit /api/admin/autodesk-auth to set up',
    });
  });
}
