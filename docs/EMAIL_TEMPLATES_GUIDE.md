# RFQ Email Templates Guide

## Overview

Email templates for RFQ notifications and weekly summaries. Templates use Handlebars-style syntax for dynamic content.

**Location:** `public/emails/`

## Templates

### 1. RFQ Notification to Supplier

**File:** `rfq-notification-supplier.html`

**Purpose:** Notify suppliers when they've been matched to a new RFQ based on location and certifications.

**Variables:**

```typescript
{
  logoUrl: string;                    // GreenChainz logo URL
  projectName: string;                // RFQ project name
  materialType: string;               // Material type
  projectLocation: string;            // Project location
  distanceMiles?: number;             // Distance in miles (optional)
  quantity?: string;                  // Quantity (optional)
  deadline?: string;                  // Deadline (optional)
  certificationsRequired?: string[];  // Required certifications (optional)
  specifications?: string;            // Project specifications (optional)
  respondUrl: string;                 // URL to respond to RFQ
  dashboardUrl: string;               // Dashboard URL
  settingsUrl: string;                // Settings URL
  serviceRadius: number;              // Supplier service radius
  currentYear: number;                // Current year
}
```

**Usage Example:**

```javascript
const template = fs.readFileSync('public/emails/rfq-notification-supplier.html', 'utf8');
const html = template
  .replace(/\{\{logoUrl\}\}/g, 'https://greenchainz.com/logo.png')
  .replace(/\{\{projectName\}\}/g, rfq.project_name)
  .replace(/\{\{materialType\}\}/g, rfq.material_type)
  .replace(/\{\{projectLocation\}\}/g, rfq.project_location)
  .replace(/\{\{distanceMiles\}\}/g, match.distance_miles || '')
  .replace(/\{\{respondUrl\}\}/g, `https://greenchainz.com/rfqs/${rfq.id}/respond`)
  // ... other replacements
```

---

### 2. RFQ Response Notification to Architect

**File:** `rfq-response-architect.html`

**Purpose:** Notify architects when a supplier responds to their RFQ.

**Variables:**

```typescript
{
  logoUrl: string;                    // GreenChainz logo URL
  supplierName: string;               // Supplier name
  supplierLocation?: string;          // Supplier location (optional)
  projectName: string;                // RFQ project name
  quotedPrice?: number;               // Quoted price (optional)
  message?: string;                   // Supplier message (optional)
  deliveryTimeline?: string;          // Delivery timeline (optional)
  distanceMiles?: number;             // Distance in miles (optional)
  certificationsProvided?: string[];  // Certifications provided (optional)
  rfqUrl: string;                     // URL to view RFQ
  dashboardUrl: string;               // Dashboard URL
  settingsUrl: string;                // Settings URL
  responseCount: number;              // Total response count
  deadline?: string;                  // RFQ deadline (optional)
  currentYear: number;                // Current year
}
```

**Usage Example:**

```javascript
const template = fs.readFileSync('public/emails/rfq-response-architect.html', 'utf8');
const html = template
  .replace(/\{\{supplierName\}\}/g, supplier.name)
  .replace(/\{\{projectName\}\}/g, rfq.project_name)
  .replace(/\{\{quotedPrice\}\}/g, response.quoted_price?.toLocaleString() || '')
  .replace(/\{\{message\}\}/g, response.message || '')
  .replace(/\{\{rfqUrl\}\}/g, `https://greenchainz.com/rfqs/${rfq.id}`)
  // ... other replacements
```

---

### 3. Weekly RFQ Summary

**File:** `rfq-summary-weekly.html`

**Purpose:** Weekly summary email showing RFQ activity, responses, and performance metrics.

**Variables:**

```typescript
{
  logoUrl: string;                    // GreenChainz logo URL
  weekRange: string;                  // Week range (e.g., "Jan 1 - Jan 7, 2025")
  totalRFQs: number;                  // Total RFQs matched
  responsesCount: number;             // Total responses sent
  awardsCount?: number;               // Awards received (optional)
  winRate: number;                    // Win rate percentage
  recentRFQs?: Array<{                // Recent RFQs (optional)
    projectName: string;
    materialType: string;
    projectLocation: string;
    distanceMiles: number;
    deadline: string;
    status: string;
  }>;
  dashboardUrl: string;               // Dashboard URL
  settingsUrl: string;                // Settings URL
  unsubscribeUrl: string;             // Unsubscribe URL
  avgResponseTime: number;            // Average response time (hours)
  avgDistance: number;                // Average distance (miles)
  topMaterialType?: string;           // Top material type (optional)
  currentYear: number;                // Current year
}
```

**Usage Example:**

```javascript
const template = fs.readFileSync('public/emails/rfq-summary-weekly.html', 'utf8');
const html = template
  .replace(/\{\{weekRange\}\}/g, 'Jan 1 - Jan 7, 2025')
  .replace(/\{\{totalRFQs\}\}/g, stats.totalRFQs.toString())
  .replace(/\{\{responsesCount\}\}/g, stats.responsesCount.toString())
  .replace(/\{\{winRate\}\}/g, stats.winRate.toFixed(1))
  // ... other replacements
```

---

## Integration with Email Service

### Using Resend (Recommended)

```javascript
const { Resend } = require('resend');
const fs = require('fs');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendRFQNotification(supplier, rfq, match) {
  const template = fs.readFileSync('public/emails/rfq-notification-supplier.html', 'utf8');
  
  const html = template
    .replace(/\{\{logoUrl\}\}/g, 'https://greenchainz.com/logo.png')
    .replace(/\{\{projectName\}\}/g, rfq.project_name)
    .replace(/\{\{materialType\}\}/g, rfq.material_type)
    .replace(/\{\{projectLocation\}\}/g, rfq.project_location)
    .replace(/\{\{distanceMiles\}\}/g, match.distance_miles?.toFixed(1) || '')
    .replace(/\{\{respondUrl\}\}/g, `https://greenchainz.com/rfqs/${rfq.id}/respond`)
    .replace(/\{\{dashboardUrl\}\}/g, 'https://greenchainz.com/dashboard')
    .replace(/\{\{settingsUrl\}\}/g, 'https://greenchainz.com/settings')
    .replace(/\{\{serviceRadius\}\}/g, supplier.service_radius?.toString() || '100')
    .replace(/\{\{currentYear\}\}/g, new Date().getFullYear().toString());

  await resend.emails.send({
    from: 'GreenChainz <notifications@greenchainz.com>',
    to: supplier.email,
    subject: `New RFQ Match: ${rfq.project_name}`,
    html: html,
  });
}
```

### Using Nodemailer

```javascript
const nodemailer = require('nodemailer');
const fs = require('fs');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendRFQNotification(supplier, rfq, match) {
  const template = fs.readFileSync('public/emails/rfq-notification-supplier.html', 'utf8');
  
  // Replace template variables
  const html = template.replace(/\{\{.*?\}\}/g, (match) => {
    // Handle variable replacement
  });

  await transporter.sendMail({
    from: 'GreenChainz <notifications@greenchainz.com>',
    to: supplier.email,
    subject: `New RFQ Match: ${rfq.project_name}`,
    html: html,
  });
}
```

---

## Template Helper Functions

### Recommended Helper Library

Use Handlebars for better template rendering:

```bash
npm install handlebars
```

```javascript
const Handlebars = require('handlebars');
const fs = require('fs');

// Register helpers
Handlebars.registerHelper('if', function(conditional, options) {
  if (conditional) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('each', function(context, options) {
  let ret = '';
  for (let i = 0; i < context.length; i++) {
    ret += options.fn(context[i]);
  }
  return ret;
});

// Load and compile template
const templateSource = fs.readFileSync('public/emails/rfq-notification-supplier.html', 'utf8');
const template = Handlebars.compile(templateSource);

// Render
const html = template({
  logoUrl: 'https://greenchainz.com/logo.png',
  projectName: rfq.project_name,
  // ... other variables
});
```

---

## Email Service Setup

### Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Get API key from dashboard
3. Add to environment variables:
   ```bash
   RESEND_API_KEY=re_xxxxx
   ```
4. Verify sender domain
5. Use in code (see example above)

### Nodemailer Setup (SMTP)

1. Configure SMTP server (e.g., Gmail, SendGrid, Mailgun)
2. Add to environment variables:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your_api_key
   ```
3. Use in code (see example above)

---

## Testing

### Test Email Function

```javascript
async function testEmailTemplate() {
  const testData = {
    logoUrl: 'https://greenchainz.com/logo.png',
    projectName: 'Test Office Building',
    materialType: 'Low-carbon Concrete',
    projectLocation: 'San Francisco, CA',
    distanceMiles: 12.5,
    respondUrl: 'https://greenchainz.com/rfqs/123/respond',
    dashboardUrl: 'https://greenchainz.com/dashboard',
    settingsUrl: 'https://greenchainz.com/settings',
    serviceRadius: 50,
    currentYear: 2025,
  };

  const template = fs.readFileSync('public/emails/rfq-notification-supplier.html', 'utf8');
  const html = Handlebars.compile(template)(testData);

  // Save to file for preview
  fs.writeFileSync('test-email-preview.html', html);
  console.log('Email preview saved to test-email-preview.html');
}
```

### Preview in Browser

1. Generate HTML with test data
2. Save to file
3. Open in browser
4. Test responsive design (resize window)
5. Check email clients (Gmail, Outlook, etc.)

---

## Best Practices

### 1. Always Include Unsubscribe Link

Weekly summary emails must include unsubscribe option.

### 2. Use Responsive Design

Templates are mobile-responsive. Test on various screen sizes.

### 3. Include Clear CTAs

Each email should have a clear call-to-action button.

### 4. Personalize Content

Use supplier/architect name and location-specific data.

### 5. Track Email Opens

Consider adding tracking pixels (respect privacy preferences).

### 6. Handle Missing Data

Templates handle optional fields gracefully with conditional rendering.

---

## Customization

### Changing Colors

Update CSS variables in template `<style>` blocks:

```css
/* Primary green color */
#10b981  /* Default green */
#059669  /* Darker green for hover states */

/* Background colors */
#ecfdf5  /* Light green background */
#f9fafb  /* Light gray background */
```

### Adding Custom Fields

1. Add variable to template: `{{customField}}`
2. Include in data object when rendering
3. Add conditional rendering if optional: `{{#if customField}}{{customField}}{{/if}}`

---

## Troubleshooting

### Email not sending

1. Check API keys/SMTP credentials
2. Verify sender domain (Resend)
3. Check spam folder
4. Review email service logs

### Template not rendering

1. Verify variable names match exactly
2. Check for unclosed Handlebars tags
3. Ensure data object has all required fields
4. Test with sample data first

### Images not loading

1. Use absolute URLs (https://)
2. Host images on CDN
3. Include alt text for accessibility
4. Test in multiple email clients

---

**Last Updated:** January 8, 2025
