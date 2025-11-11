# GreenChainz Survey Links - Ready to Email! 📧

## Live Survey URLs

Your backend is running at: **http://localhost:3001**

### 🏢 Supplier/Architect Survey
**Short link (for emails):**
```
http://localhost:3001/r/supplier
```

**Direct link:**
```
http://localhost:3001/surveys/supplier
```

**With tracking params (example):**
```
http://localhost:3001/r/supplier?invite=founder50&email=architect@firm.com
```

---

### 🏭 Buyer Survey
**Short link (for emails):**
```
http://localhost:3001/r/buyer
```

**Direct link:**
```
http://localhost:3001/surveys/buyer
```

**With tracking params (example):**
```
http://localhost:3001/r/buyer?invite=earlyaccess&email=buyer@company.com
```

---

### 📊 Data Provider Partnership Survey
**Short link (for emails):**
```
http://localhost:3001/r/data-provider
```

**Direct link:**
```
http://localhost:3001/surveys/data-provider
```

**With tracking params (example):**
```
http://localhost:3001/r/data-provider?invite=fsc-partnership&email=contact@fsc.org
```

---

### 🎯 Neutral Selector (if recipient type is unknown)
```
http://localhost:3001/surveys
```

---

## Testing Right Now

1. **Open in your browser:**
   - http://localhost:3001/surveys/supplier
   - http://localhost:3001/surveys/buyer
   - http://localhost:3001/surveys/data-provider

2. **What you'll see:**
   - Professional branded page with GreenChainz header
   - Tab selector to switch between Supplier/Buyer/Data Provider
   - Your Google Form embedded in an iframe
   - Responsive design (works on mobile)
   - SEO-friendly meta tags

3. **Current configuration:**
   - Supplier form: Architect survey (as placeholder)
   - Buyer form: Architect survey (as placeholder)
   - Data provider form: Data provider partnership survey

---

## Next Steps

### When deploying to production:

1. **Update URLs in emails** from `localhost:3001` to your domain:
   ```
   https://greenchainz.com/r/supplier?invite=abc123
   https://greenchainz.com/r/buyer?invite=xyz789
   https://greenchainz.com/r/data-provider?invite=fsc-partnership
   ```

2. **Create separate buyer form** and update `.env`:
   ```
   BUYER_FORM_URL=https://docs.google.com/forms/d/e/YOUR_BUYER_FORM_ID/viewform?embedded=true
   ```

3. **Track campaigns** using UTM parameters:
   ```
   /r/supplier?invite=linkedin&utm_source=linkedin&utm_campaign=founding50
   /r/data-provider?invite=building-transparency&utm_source=email&utm_campaign=data-partners
   ```

---

## Form Configuration Tips

### Making Google Forms embeddable:

1. In Google Forms, click **Send**
2. Click the **< > Embed HTML** tab
3. Copy the URL from the iframe src (it will have `?embedded=true`)
4. Paste into `.env` as `SUPPLIER_FORM_URL`, `BUYER_FORM_URL`, or `DATA_PROVIDER_FORM_URL`

### Pre-filling form fields via URL:

Google Forms supports pre-filling fields. Example:
```
...viewform?embedded=true&entry.123456789=johndoe@example.com&entry.987654321=Acme%20Corp
```

You can pass these through the invite/email params and map them in `backend/index.js`.

---

## 🚀 All three surveys are LIVE!

Test them now:
- **Supplier:** http://localhost:3001/surveys/supplier
- **Buyer:** http://localhost:3001/surveys/buyer
- **Data Provider:** http://localhost:3001/surveys/data-provider
