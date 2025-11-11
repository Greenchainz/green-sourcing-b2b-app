# GreenChainz Static Landing Page

**Purpose**: Standalone HTML landing page for Cloudflare Pages deployment

## What's Included

✅ **Full landing page** with hero, value props, how it works, social proof  
✅ **Embedded survey section** - Add your Google Forms embed URL  
✅ **Responsive design** - Tailwind CSS via CDN (no build step)  
✅ **Smooth animations** - Hover effects, pulse indicators  
✅ **Email CTAs** - Supplier signup, partnerships

## Quick Deploy to Cloudflare Pages

### Option 1: Drag & Drop (Fastest)

1. Go to https://dash.cloudflare.com
2. Navigate to **Workers & Pages** → **Create Application** → **Pages**
3. Click **Upload Assets**
4. Drag `index.html` into the upload zone
5. Name your project: `greenchainz-landing`
6. Click **Deploy**
7. Your site will be live at: `https://greenchainz-landing.pages.dev`

### Option 2: Git Integration (Automated Updates)

```bash
# Push this folder to GitHub
git add cloudflare-landing/
git commit -m "Add static landing page"
git push origin main

# Connect to Cloudflare Pages:
# 1. Cloudflare Dashboard → Workers & Pages → Create Application
# 2. Select "Connect to Git" → Choose your GitHub repo
# 3. Build settings:
#    - Build output directory: /cloudflare-landing
#    - Build command: (leave empty - static HTML)
# 4. Deploy
```

## Customize Before Deploying

### 1. Add Your Google Forms Survey

**Find the embed URL**:
1. Open your Google Form
2. Click **Send** → Click **< >** (Embed HTML)
3. Copy the `src` URL from the iframe code

**Update `index.html`** (lines 157-162):
```html
<!-- BEFORE -->
<iframe 
    src="https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?embedded=true"
    ...

<!-- AFTER (paste your actual Form URL) -->
<iframe 
    src="https://docs.google.com/forms/d/e/1FAIpQLSdXXXXXXXXXXXX/viewform?embedded=true"
    ...
```

### 2. Update Contact Emails (Optional)

Replace `partnerships@greenchainz.com` with your actual email:
- Line 70: Supplier CTA button
- Line 83: Data provider link
- Footer links

### 3. Add Custom Domain (Optional)

After deploying:
1. Cloudflare Dashboard → Your Pages project → Custom Domains
2. Add domain (e.g., `greenchainz.com`)
3. Cloudflare will auto-configure SSL/TLS

## File Structure

```
cloudflare-landing/
├── index.html          # Complete landing page (single file)
└── README.md           # This file
```

## Features

- **No build step required** - Pure HTML + Tailwind CDN
- **Instant loading** - Minimal dependencies
- **Mobile responsive** - Works on all devices
- **SEO optimized** - Meta tags, semantic HTML
- **Fast CDN delivery** - Cloudflare's global edge network

## Local Testing

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: VS Code Live Server
# Right-click index.html → "Open with Live Server"
```

Visit: `http://localhost:8000`

## Next Steps After Deploy

1. **Test the survey embed** - Make sure Google Forms loads correctly
2. **Share the URL** - Send to prospects, add to email signatures
3. **Monitor responses** - Check Google Forms for survey submissions
4. **Set up analytics** (optional):
   - Add Google Analytics tag to `<head>`
   - Or use Cloudflare Web Analytics (free, no cookies)

## Troubleshooting

**Survey not loading?**
- Check if Google Forms embed URL is correct
- Try opening the form link directly in browser first

**Styles look broken?**
- Ensure Tailwind CDN script is loading: `https://cdn.tailwindcss.com`
- Check browser console for errors

**Want to make changes?**
- Edit `index.html` directly (no build step needed)
- Changes appear instantly after redeploying to Cloudflare

---

**Your landing page is ready to deploy!** 🚀

Estimated time: 5 minutes to customize + 2 minutes to deploy = **7 minutes total**
