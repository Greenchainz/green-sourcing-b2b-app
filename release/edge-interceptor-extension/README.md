# GreenChainz Interceptor (Microsoft Edge Extension)

This extension detects purchase intent pages (add-to-cart / checkout moments) and surfaces greener material alternatives from GreenChainz without leaving the current tab.

## What this MVP does

1. Detects likely purchase-intent pages with an intent score (title/path + CTA scan + anti-noise filters).
2. Injects a floating **GreenChainz Interceptor** widget on those pages.
3. Uses domain adapters for major commerce domains (Amazon/Home Depot/Lowe's/Grainger/Walmart) to extract cleaner product context.
4. Runs a **retail-to-material swap map** so consumer phrasing can still route to construction-material alternatives.
5. Pulls verified alternatives from `GET /api/public/materials/search` and ranks results by query relevance + sustainability signals.
6. Includes a popup for:
   - Enabling/disabling interception
   - Configuring API base URL
   - Running a quick material search

## Local install in Microsoft Edge

1. Open `edge://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `release/edge-interceptor-extension`

## API configuration

- Default API base URL: `https://app.greenchainz.com/api/public`
- For local backend testing set:
  - `http://localhost:3000/api/public`

## Notes

- This is a shippable MVP focused on the "intercept at decision time" workflow.
- This version includes both generic detection and merchant-specific adapters for stronger hit rate.
- If an Amazon/retail product title is too consumer-branded to match directly, the extension now falls back to mapped material categories (e.g., paint/insulation/drywall/flooring).
- Next iteration can add authenticated RFQ submission directly from the interceptor panel.
