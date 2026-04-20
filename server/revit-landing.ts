/**
 * Revit Plugin Landing Page
 *
 * Served at GET /revit
 * Bridges the gap between now and Autodesk App Store approval.
 * Once the App Store listing is live, replace this handler with a
 * redirect to the App Store URL.
 *
 * To update the download link:
 *   1. Upload the installer zip to Azure Blob Storage
 *   2. Set REVIT_PLUGIN_DOWNLOAD_URL in Azure Key Vault
 *   3. Redeploy — no code change needed
 */

import { Request, Response } from "express";

const DOWNLOAD_URL =
  process.env.REVIT_PLUGIN_DOWNLOAD_URL ||
  "mailto:sales@greenchainz.com?subject=Revit%20Plugin%20Download%20Request";

const EARLY_ACCESS_EMAIL = "sales@greenchainz.com";

export function handleRevitLanding(_req: Request, res: Response): void {
  const isDownloadReady = !!process.env.REVIT_PLUGIN_DOWNLOAD_URL;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GreenChainz Revit Plugin — Sustainable Materials Inside Revit</title>
  <meta name="description" content="Search and specify GreenChainz verified sustainable materials directly inside Autodesk Revit. Real-time EPD data, carbon metrics, and compliance checking built into your BIM workflow." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F8FAF9;
      color: #1a1a1a;
      line-height: 1.6;
    }

    /* ── Header ── */
    header {
      background: #2D6A4F;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.5px;
    }
    .logo span { color: #74C69D; }
    .nav-link {
      color: #74C69D;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    .nav-link:hover { color: #fff; }

    /* ── Hero ── */
    .hero {
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 60%, #40916C 100%);
      color: #fff;
      text-align: center;
      padding: 72px 24px 64px;
    }
    .badge {
      display: inline-block;
      background: rgba(116, 198, 157, 0.25);
      border: 1px solid #74C69D;
      color: #74C69D;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 20px;
    }
    .hero h1 {
      font-size: clamp(28px, 5vw, 48px);
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .hero h1 em {
      font-style: normal;
      color: #74C69D;
    }
    .hero p {
      font-size: 18px;
      color: rgba(255,255,255,0.85);
      max-width: 560px;
      margin: 0 auto 36px;
    }

    /* ── CTA buttons ── */
    .cta-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #74C69D;
      color: #1B4332;
      font-weight: 700;
      font-size: 16px;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.15s, transform 0.1s;
    }
    .btn-primary:hover { background: #95D5B2; transform: translateY(-1px); }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: #fff;
      font-weight: 600;
      font-size: 15px;
      padding: 13px 24px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.4);
      text-decoration: none;
      transition: border-color 0.15s, background 0.15s;
    }
    .btn-secondary:hover { border-color: #74C69D; background: rgba(116,198,157,0.1); }

    /* ── Coming soon banner ── */
    .coming-soon-banner {
      background: #DBEAFE;
      border-left: 4px solid #3B82F6;
      color: #1E40AF;
      font-size: 14px;
      text-align: center;
      padding: 12px 24px;
    }
    .coming-soon-banner a { color: #1D4ED8; font-weight: 600; }

    /* ── Features ── */
    .section { padding: 64px 24px; max-width: 1000px; margin: 0 auto; }
    .section-title {
      font-size: 28px;
      font-weight: 700;
      color: #2D6A4F;
      text-align: center;
      margin-bottom: 8px;
    }
    .section-sub {
      text-align: center;
      color: #555;
      margin-bottom: 40px;
      font-size: 16px;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .feature-card {
      background: #fff;
      border: 1px solid #D1FAE5;
      border-radius: 12px;
      padding: 24px;
    }
    .feature-icon {
      font-size: 28px;
      margin-bottom: 12px;
    }
    .feature-card h3 {
      font-size: 16px;
      font-weight: 700;
      color: #1B4332;
      margin-bottom: 8px;
    }
    .feature-card p { font-size: 14px; color: #4B5563; line-height: 1.6; }

    /* ── Install steps ── */
    .install-section {
      background: #fff;
      border-top: 1px solid #D1FAE5;
      border-bottom: 1px solid #D1FAE5;
    }
    .steps { display: flex; flex-direction: column; gap: 20px; max-width: 620px; margin: 0 auto; }
    .step {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .step-num {
      flex-shrink: 0;
      width: 32px; height: 32px;
      background: #2D6A4F;
      color: #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      font-weight: 700;
    }
    .step-content h4 { font-size: 15px; font-weight: 700; color: #1B4332; margin-bottom: 4px; }
    .step-content p { font-size: 14px; color: #4B5563; }
    .step-content code {
      display: inline-block;
      background: #F3F4F6;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      padding: 2px 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #374151;
      margin-top: 4px;
      word-break: break-all;
    }

    /* ── Requirements ── */
    .req-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .req-item {
      background: #F0FAF4;
      border: 1px solid #D1FAE5;
      border-radius: 8px;
      padding: 16px;
    }
    .req-item .req-label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .req-item .req-value { font-size: 14px; font-weight: 600; color: #1B4332; }

    /* ── CTA strip ── */
    .cta-strip {
      background: #2D6A4F;
      color: #fff;
      text-align: center;
      padding: 56px 24px;
    }
    .cta-strip h2 { font-size: 26px; font-weight: 700; margin-bottom: 12px; }
    .cta-strip p { color: rgba(255,255,255,0.8); margin-bottom: 28px; font-size: 16px; }

    /* ── Footer ── */
    footer {
      background: #1B4332;
      color: rgba(255,255,255,0.6);
      text-align: center;
      padding: 24px;
      font-size: 13px;
    }
    footer a { color: #74C69D; text-decoration: none; }
    footer a:hover { text-decoration: underline; }
    .footer-links { display: flex; gap: 20px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }

    @media (max-width: 600px) {
      .hero { padding: 48px 20px 40px; }
      .hero p { font-size: 16px; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header>
    <a href="https://greenchainz.com" class="logo">Green<span>Chainz</span></a>
    <a href="https://greenchainz.com" class="nav-link">← Back to platform</a>
  </header>

  <!-- Coming Soon Banner -->
  <div class="coming-soon-banner">
    🔜 Coming soon to the <strong>Autodesk App Store</strong>. Until then, download directly below or email
    <a href="mailto:${EARLY_ACCESS_EMAIL}">sales@greenchainz.com</a> for early access.
  </div>

  <!-- Hero -->
  <section class="hero">
    <div class="badge">Autodesk Revit Plugin</div>
    <h1>Sustainable Materials<br/>Inside <em>Revit</em></h1>
    <p>Search, specify, and validate GreenChainz verified green materials without leaving your BIM workflow. Real-time carbon metrics. Live EPD data. LEED-ready specs.</p>
    <div class="cta-group">
      ${isDownloadReady
        ? `<a href="${DOWNLOAD_URL}" class="btn-primary">⬇ Download Plugin</a>`
        : `<a href="mailto:${EARLY_ACCESS_EMAIL}?subject=Revit%20Plugin%20Early%20Access" class="btn-primary">✉ Request Early Access</a>`
      }
      <a href="https://greenchainz.com" class="btn-secondary">View Platform →</a>
    </div>
  </section>

  <!-- Features -->
  <div class="section">
    <h2 class="section-title">Everything You Need, Inside Revit</h2>
    <p class="section-sub">No switching tabs. No copy-pasting specs. GreenChainz lives where you already work.</p>
    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">🔍</div>
        <h3>Search 50,000+ Verified Materials</h3>
        <p>Filter by GWP, certifications (LEED, EPD, FSC, GreenGuard), price, and regional availability — all from the GreenChainz panel inside Revit.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Real-Time Carbon Metrics</h3>
        <p>See embodied carbon impact update live as you assign materials to Revit elements. Track your project carbon budget in real time.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📄</div>
        <h3>EPD Data Direct Into Specs</h3>
        <p>Pull verified EPD lifecycle data from Building Transparency and EPD International directly into your Revit material specifications.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">✅</div>
        <h3>Compliance Verification</h3>
        <p>Instant LEED v4, Living Building Challenge, and WELL compliance checking as you spec materials — no manual cross-referencing.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔄</div>
        <h3>SWAP Engine Recommendations</h3>
        <p>AI-powered material swap suggestions ranked by carbon savings appear directly in the Revit panel when lower-carbon alternatives exist.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>BIM-Synced Carbon Dashboard</h3>
        <p>Your GreenChainz project carbon dashboard stays in sync with your Revit model — changes in Revit reflect immediately on the web platform.</p>
      </div>
    </div>
  </div>

  <!-- Install Steps -->
  <div class="install-section">
    <div class="section">
      <h2 class="section-title">Installation — 5 Minutes</h2>
      <p class="section-sub">Works with Revit 2023 and newer on Windows.</p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-content">
            <h4>${isDownloadReady ? "Download the installer" : "Request early access"}</h4>
            <p>${isDownloadReady
              ? 'Click "Download Plugin" above. You\'ll get a zip file containing the installer.'
              : `Email <strong>${EARLY_ACCESS_EMAIL}</strong> with subject "Revit Plugin Early Access" and we'll send you the download link within 1 business day.`
            }</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-content">
            <h4>Run the installer or copy files manually</h4>
            <p>Run the installer, or manually copy the <code>.addin</code> and <code>.dll</code> files to your Revit addins folder:</p>
            <p><code>%APPDATA%\\Autodesk\\Revit\\Addins\\2026\\</code></p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-content">
            <h4>Restart Autodesk Revit</h4>
            <p>Close and reopen Revit. The GreenChainz panel will appear in the Add-Ins tab.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">4</div>
          <div class="step-content">
            <h4>Sign in with your GreenChainz account</h4>
            <p>Click the GreenChainz panel → "Sign In" → authenticate with your Microsoft account. Uses the same credentials as the web platform.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-num">5</div>
          <div class="step-content">
            <h4>Start specifying sustainable materials</h4>
            <p>Open the GreenChainz Material Browser from the panel and search verified materials directly inside your Revit project.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- System Requirements -->
  <div class="section">
    <h2 class="section-title">System Requirements</h2>
    <p class="section-sub"> </p>
    <div class="req-grid">
      <div class="req-item">
        <div class="req-label">Revit Version</div>
        <div class="req-value">2023, 2024, 2025, 2026</div>
      </div>
      <div class="req-item">
        <div class="req-label">Operating System</div>
        <div class="req-value">Windows 10 / 11</div>
      </div>
      <div class="req-item">
        <div class="req-label">Internet</div>
        <div class="req-value">Required (cloud-connected)</div>
      </div>
      <div class="req-item">
        <div class="req-label">Account</div>
        <div class="req-value">GreenChainz (any plan)</div>
      </div>
      <div class="req-item">
        <div class="req-label">.NET Framework</div>
        <div class="req-value">4.8+</div>
      </div>
      <div class="req-item">
        <div class="req-label">Auth</div>
        <div class="req-value">Microsoft Entra ID (SSO)</div>
      </div>
    </div>
  </div>

  <!-- CTA Strip -->
  <div class="cta-strip">
    <h2>Ready to try it?</h2>
    <p>Get early access today — the Autodesk App Store listing is coming soon.</p>
    <div class="cta-group">
      ${isDownloadReady
        ? `<a href="${DOWNLOAD_URL}" class="btn-primary">⬇ Download Plugin</a>`
        : `<a href="mailto:${EARLY_ACCESS_EMAIL}?subject=Revit%20Plugin%20Early%20Access" class="btn-primary">✉ Request Early Access</a>`
      }
      <a href="mailto:${EARLY_ACCESS_EMAIL}" class="btn-secondary">Talk to Sales</a>
    </div>
  </div>

  <!-- Footer -->
  <footer>
    <div class="footer-links">
      <a href="https://greenchainz.com">Platform</a>
      <a href="mailto:sales@greenchainz.com">Sales</a>
      <a href="mailto:support@greenchainz.com">Support</a>
      <a href="https://greenchainz.com/privacy">Privacy</a>
    </div>
    <div>© 2026 GreenChainz Inc. — Sustainable Materials. Verified. Fast.</div>
  </footer>

</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300"); // 5-min cache
  res.status(200).send(html);
}
