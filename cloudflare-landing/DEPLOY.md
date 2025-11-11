# Deploy to Cloudflare Pages - Step by Step

## Option 1: Dashboard Deploy (Fastest - 2 minutes)

### Steps:
1. **Go to Cloudflare Pages Dashboard**
   - Visit: https://dash.cloudflare.com/
   - Navigate to: **Workers & Pages** → **Create application** → **Pages** → **Upload assets**

2. **Upload the Landing Page**
   - Drag and drop the `index.html` file from this folder
   - Or click "Select from computer" and choose `index.html`

3. **Configure Project**
   - Project name: `greenchainz-landing` (or your choice)
   - Production branch: Leave default
   - Click **Deploy site**

4. **Get Your Live URL**
   - After deployment completes (~30 seconds), you'll see:
   - `https://greenchainz-landing.pages.dev` (or your project name)
   - You can add a custom domain later

### ✅ Validation Checklist:
- [ ] Landing page loads at the `.pages.dev` URL
- [ ] MailerLite form is visible in the waitlist section
- [ ] Google Form iframe displays your survey
- [ ] All sections render correctly (hero, value props, how-it-works, social proof)
- [ ] Contact email `founder@greenchainz.com` is visible in footer
- [ ] Test submit an email to MailerLite waitlist

---

## Option 2: GitHub Integration (Recommended for Updates)

### Initial Setup:
1. **Connect GitHub Repository**
   - Go to: https://dash.cloudflare.com/
   - Navigate to: **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**

2. **Select Repository**
   - Authorize Cloudflare to access `jnorvi5/green-sourcing-b2b-app`
   - Select the repository from the list

3. **Configure Build Settings**
   - **Production branch**: `main`
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: `cloudflare-landing`
   - Click **Save and Deploy**

4. **Deployment**
   - Cloudflare will build and deploy automatically
   - Every push to `main` will trigger a new deployment
   - Preview deployments for pull requests

### Benefits:
- Auto-deploy on git push
- Preview URLs for branches
- Rollback capability
- CI/CD integration

---

## Post-Deployment Tasks

### 1. Test MailerLite Integration
```bash
# Test form submission in browser:
1. Open your deployed URL
2. Scroll to "Join the Waitlist" section
3. Enter a test email (use a real one you control)
4. Check MailerLite dashboard for the new subscriber
```

### 2. Verify Google Form Embed
- The survey should load in an iframe
- External link should open: https://docs.google.com/forms/d/e/1FAIpQLSc8hWbzRyoJ0vcCW5GvzLr7FrvXFJgr_73p0c59E0qBhSWDpA/viewform

### 3. Configure Custom Domain (Optional)
1. Go to **Pages project** → **Custom domains**
2. Add your domain: `greenchainz.com` or `www.greenchainz.com`
3. Update DNS records as instructed by Cloudflare
4. Enable "Always Use HTTPS"

### 4. Analytics Setup (Optional)
1. Go to **Pages project** → **Analytics**
2. Enable Web Analytics (free, privacy-friendly)
3. No code changes needed - Cloudflare injects script

---

## Troubleshooting

### MailerLite Form Not Showing
**Symptoms**: Empty space where form should be

**Solutions**:
1. Check browser console for errors (F12)
2. Verify account ID `1910840` is correct in script
3. Verify form ID `lPimoB` matches your MailerLite dashboard
4. Disable ad blockers (they may block MailerLite)
5. Test in incognito mode

**Verify in MailerLite**:
- Dashboard → Forms → Click your form → Get embed code
- Confirm `data-form="lPimoB"` matches

### Google Form Iframe Blocked
**Symptoms**: "Refused to display" error

**Solutions**:
- Check if form has "Restrict to [domain]" enabled
- Go to form settings → Presentation → Remove domain restrictions
- Or: Use the external link instead of iframe

### Page Not Updating After Deploy
**Solutions**:
1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
2. Check Cloudflare Pages deployment status (should be "Success")
3. Wait 1-2 minutes for CDN propagation
4. Use incognito mode to test
5. Purge cache: **Pages project** → **Caching** → **Purge everything**

---

## Updates & Maintenance

### To Update Content:
1. Edit `cloudflare-landing/index.html` locally
2. Test by opening the file in your browser
3. **Option A (Manual)**: Re-upload via dashboard
4. **Option B (Git)**: 
   ```bash
   git add cloudflare-landing/index.html
   git commit -m "Update landing page content"
   git push origin main
   # Cloudflare auto-deploys
   ```

### Common Updates:
- Change tagline: Edit `<h1>` in hero section
- Update email: Search for `founder@greenchainz.com`
- Swap survey: Replace form URL in iframe `src` attribute
- Modify CTA: Edit button text/links in waitlist section

---

## Performance Optimization

Already implemented:
- ✅ Tailwind CSS via CDN (no build needed)
- ✅ Minimal JavaScript (MailerLite only)
- ✅ Cloudflare global CDN (automatic)
- ✅ HTTPS enabled by default
- ✅ HTTP/2 push for assets

Optional enhancements:
- Add `loading="lazy"` to future images
- Minify inline styles (if adding custom CSS)
- Use Cloudflare Images for logos/screenshots

---

## Microsoft for Startups Validation

Your landing page includes all required elements:
- ✅ **Company name**: "GreenChainz" (multiple instances)
- ✅ **Tagline**: "The Global Trust Layer for Sustainable Commerce"
- ✅ **Value proposition**: "Verified sustainability data..." section
- ✅ **Contact email**: `founder@greenchainz.com`
- ✅ **Waitlist/Lead capture**: MailerLite form embedded

**Submit this URL to Microsoft**: Your Cloudflare Pages `.pages.dev` URL

---

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **MailerLite Help**: https://www.mailerlite.com/help
- **Repository**: https://github.com/jnorvi5/green-sourcing-b2b-app

---

**Next Step**: After deploying the landing page, proceed to deploy the frontend app to Vercel (see `VERCEL-DEPLOY.md`).
