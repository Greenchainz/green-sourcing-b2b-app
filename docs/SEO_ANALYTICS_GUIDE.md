# GreenChainz SEO Setup Guide

## ✅ What's Implemented

### 1. **SEO Meta Tags**

#### On Every Page:
```html
<!-- Basic SEO -->
<title>GreenChainz Supplier Survey</title>
<meta name="description" content="Help us tailor..." />
<meta name="robots" content="index, follow" />
<meta name="author" content="GreenChainz" />
<meta name="keywords" content="sustainable sourcing, B2B marketplace..." />
<link rel="canonical" href="https://greenchainz.com/surveys/supplier" />

<!-- Open Graph (Facebook, LinkedIn) -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://greenchainz.com/surveys/supplier" />
<meta property="og:title" content="GreenChainz Supplier Survey" />
<meta property="og:description" content="Help us tailor..." />
<meta property="og:image" content="https://greenchainz.com/greenchainz-logo.svg" />
<meta property="og:site_name" content="GreenChainz" />

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://greenchainz.com/surveys/supplier" />
<meta name="twitter:title" content="GreenChainz Supplier Survey" />
<meta name="twitter:description" content="Help us tailor..." />
<meta name="twitter:image" content="https://greenchainz.com/greenchainz-logo.svg" />
```

**Result:**
- Better search rankings (title, description, keywords)
- Rich previews when shared on social media
- Prevents duplicate content (canonical URLs)

---

### 2. **Structured Data (JSON-LD)**

Every survey page includes Schema.org markup:

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "GreenChainz Supplier Survey",
  "description": "Help us tailor...",
  "url": "https://greenchainz.com/surveys/supplier",
  "publisher": {
    "@type": "Organization",
    "name": "GreenChainz",
    "url": "https://greenchainz.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://greenchainz.com/greenchainz-logo.svg"
    }
  },
  "mainEntity": {
    "@type": "SurveyAction",
    "name": "GreenChainz Supplier Survey"
  }
}
```

**Benefits:**
- Google Rich Results (enhanced search snippets)
- Better crawlability for search engines
- Potential for featured snippets

---

### 3. **Sitemap.xml**

**URL**: `https://greenchainz.com/sitemap.xml`

Includes all public pages:
- Homepage (priority 1.0)
- Survey pages (priority 0.9)
- Legal pages (priority 0.5)

**Automatic Features:**
- Updates `<lastmod>` date dynamically
- Specifies change frequency (weekly, monthly, yearly)
- Tells search engines which pages are most important

**Submit to:**
1. Google Search Console: https://search.google.com/search-console
2. Bing Webmaster Tools: https://www.bing.com/webmasters

---

### 4. **Robots.txt**

**URL**: `https://greenchainz.com/robots.txt`

```
User-agent: *
Allow: /
Allow: /surveys/
Allow: /r/

Disallow: /api/
Disallow: /auth/
Disallow: /admin/

Sitemap: https://greenchainz.com/sitemap.xml
Crawl-delay: 1
```

**What it does:**
- Tells search engines to crawl public pages
- Blocks crawling of API routes and admin sections
- Points to sitemap.xml
- Prevents server overload with crawl delay

---

### 5. **Legal Pages**

Created 3 essential pages:

#### `/privacy` - Privacy Policy
- Information collection practices
- Cookie usage details
- Third-party data sharing (OAuth providers, data providers)
- User rights (access, delete, export)
- Contact: privacy@greenchainz.com

#### `/cookies` - Cookie Policy
- Table of all cookies used
- Purpose and duration of each cookie
- How to manage/delete cookies
- Third-party cookie policies (Google)

#### `/terms` - Terms of Service
- Verification standards
- User responsibilities
- Prohibited activities (greenwashing!)
- Limitation of liability
- Contact: legal@greenchainz.com

**SEO Value:**
- Required for legal compliance
- Improves trust signals for Google
- Linked from cookie banner (reduces bounce rate)

---

## 📊 Google Search Console Setup

### Step 1: Verify Ownership

**Method 1: HTML File Upload**
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://greenchainz.com`
3. Download verification file (e.g., `google1234567890abcdef.html`)
4. Add route in backend:
   ```javascript
   app.get('/google1234567890abcdef.html', (req, res) => {
     res.send('google-site-verification: google1234567890abcdef.html');
   });
   ```

**Method 2: Meta Tag** (easier)
1. Get verification meta tag from Search Console
2. Add to survey page `<head>`:
   ```html
   <meta name="google-site-verification" content="YOUR_CODE_HERE" />
   ```

### Step 2: Submit Sitemap
1. In Search Console, go to **Sitemaps**
2. Submit: `https://greenchainz.com/sitemap.xml`
3. Wait 24-48 hours for crawling to begin

### Step 3: Monitor Performance
Track:
- **Impressions** - how many times your pages appear in search
- **Clicks** - how many users click through
- **CTR** (Click-through rate) - clicks/impressions
- **Average position** - your ranking for keywords

---

## 🎯 Keyword Strategy

### Primary Keywords (Already in Meta Tags):
- "sustainable sourcing"
- "B2B marketplace"
- "verified suppliers"
- "ESG compliance"
- "carbon tracking"
- "FSC certified suppliers"
- "B Corp marketplace"
- "sustainable supply chain"
- "green procurement"

### Long-Tail Keywords to Target:
- "how to find verified sustainable suppliers"
- "B2B platform for sustainable sourcing"
- "carbon footprint tracking for supply chain"
- "FSC certified supplier directory"
- "B Corp verified companies marketplace"

### Content Recommendations:
1. **Blog**: "The Ultimate Guide to Sustainable Sourcing" → target "sustainable sourcing guide"
2. **Case Study**: "How [Company] Reduced Carbon by 40% with GreenChainz" → target "reduce supply chain carbon"
3. **Supplier Directory**: Searchable database → target "[industry] sustainable suppliers"

---

## 🔍 SEO Best Practices Checklist

- [✅] Meta titles and descriptions on all pages
- [✅] Canonical URLs specified
- [✅] Open Graph tags for social sharing
- [✅] Twitter Card tags
- [✅] Structured data (JSON-LD) for rich results
- [✅] Sitemap.xml created and dynamic
- [✅] Robots.txt configured
- [✅] Privacy Policy page
- [✅] Cookie Policy page
- [✅] Terms of Service page
- [✅] Favicon and logo for brand recognition
- [ ] SSL certificate (HTTPS) - **REQUIRED FOR PRODUCTION**
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Set up Google Analytics 4 in GTM
- [ ] Create Google My Business listing
- [ ] Build backlinks from industry sites
- [ ] Create blog content for long-tail keywords
- [ ] Optimize page load speed (<3 seconds)

---

## 🚀 Production SEO Setup

### Before Launch:

1. **Update URLs in Code**
   - Change `https://greenchainz.com` in meta tags to actual domain
   - Update `og:url` and `twitter:url` properties
   - Update sitemap `<loc>` URLs
   - Update canonical URLs

2. **SSL Certificate**
   ```bash
   # Use Let's Encrypt (free)
   sudo certbot --nginx -d greenchainz.com -d www.greenchainz.com
   ```
   - **Critical**: Google penalizes non-HTTPS sites

3. **GTM Configuration**
   - Set up GA4 property in Google Analytics
   - Connect GA4 to GTM container
   - Enable enhanced ecommerce tracking (for future orders)
   - Set up conversion goals (email captures, signups)

4. **Search Console Verification**
   - Add both `greenchainz.com` and `www.greenchainz.com`
   - Submit sitemap
   - Request indexing for key pages

5. **Performance Optimization**
   - Enable Gzip compression
   - Minify CSS/JS (production builds)
   - Use CDN for static assets
   - Implement caching headers
   - Optimize images (use WebP format)

---

## 📊 SEO Metrics to Monitor

### Week 1-4 (Initial):
- **Indexing**: How many pages are indexed? (Check Search Console)
- **Crawl errors**: Any 404s or server errors?
- **Mobile usability**: Does site work on mobile?

### Month 2-3 (Growth):
- **Organic traffic**: Users from Google search
- **Keyword rankings**: Position for target keywords
- **Click-through rate (CTR)**: Are titles/descriptions compelling?
- **Bounce rate**: Are users finding what they need?

### Month 4+ (Optimization):
- **Conversion rate**: Email captures / total visitors
- **Time on page**: Are users engaged?
- **Backlinks**: How many sites link to you?
- **Domain authority**: Overall site credibility (Moz/Ahrefs)

---

## 🎯 Quick Wins for SEO

### 1. **Title Tag Optimization**
Current: "GreenChainz Supplier Survey"
Better: "Find Verified Sustainable Suppliers | GreenChainz B2B Marketplace"

Why: Includes target keyword + value prop + brand

### 2. **Meta Description**
Current: "Help us tailor the GreenChainz experience for sustainable suppliers."
Better: "Join 1,000+ verified sustainable suppliers on GreenChainz. FSC, B Corp, and EC3 certified. Zero greenwashing. Get discovered by conscious buyers today."

Why: 
- Includes keywords (FSC, B Corp, EC3)
- Social proof (1,000+ suppliers)
- Call to action (Get discovered today)
- Under 155 characters (Google's limit)

### 3. **Add FAQ Schema**
```javascript
// Add to survey pages
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What does GreenChainz Verified mean?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "GreenChainz Verified means all sustainability certifications are validated against official data providers like FSC, B Corp, and EC3. Zero greenwashing guaranteed."
    }
  }]
}
```

Result: Potential for FAQ rich snippets in Google search

### 4. **Internal Linking**
Add footer links on all pages:
```html
<footer>
  <nav>
    <a href="/surveys/supplier">For Suppliers</a> |
    <a href="/surveys/buyer">For Buyers</a> |
    <a href="/surveys/data-provider">Data Providers</a> |
    <a href="/privacy">Privacy</a> |
    <a href="/terms">Terms</a>
  </nav>
</footer>
```

Why: Helps search engines discover all pages, distributes page authority

---

## 🛠️ Tools to Use

### Free SEO Tools:
1. **Google Search Console** - Indexing, rankings, errors
2. **Google PageSpeed Insights** - Performance optimization
3. **Bing Webmaster Tools** - Bing search optimization
4. **Schema.org Validator** - Test structured data
5. **Mobile-Friendly Test** - Google's mobile usability checker

### Paid SEO Tools (Optional):
1. **Ahrefs** ($99/mo) - Backlink analysis, keyword research
2. **SEMrush** ($119/mo) - Competitor analysis, rank tracking
3. **Moz Pro** ($99/mo) - Domain authority, on-page optimization
4. **Screaming Frog** (Free/£149/yr) - Technical SEO audits

---

## 📞 Support

**SEO Questions?**
- Documentation: `docs/SEO_ANALYTICS_GUIDE.md` (this file)
- Google Search Console: https://search.google.com/search-console

---

**Last Updated**: January 13, 2026  
**Status**: ✅ SEO Infrastructure Complete  
**Next Steps**: Deploy to production, submit sitemap to Search Console
