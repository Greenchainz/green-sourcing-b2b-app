# GreenChainz Supplier Dashboard Experience Design

## 1. Authentication & Onboarding Flow

**Goal**: Convert "scraped" leads into "verified" active suppliers.

### **The "Claim Profile" Workflow**

1. **Trigger**: System sends email to `scraped_email`: _"We found [Company Name] in our sustainability index. Architects are looking for your materials. Claim your profile."_
2. **Landing**: User clicks unique link -> `https://greenchainz.com/claim?token=xyz`
   - **Frontend**: Shows company name, website, and "Is this you?"
3. **Verification**:
   - Confirm Email (pre-filled from token).
   - Set Password (or "Sign in with Microsoft/LinkedIn").
4. **Onboarding Wizard** (3 Steps):
   - **Step 1: Contact Info**: Verify phone, address, service radius.
   - **Step 2: Categories**: Select MasterFormat divisions (e.g., "09 29 00 Gypsum Board").
   - **Step 3: First Product**: "Upload one EPD or Product Sheet to get verified."

### **Authentication Tech Strategy**

> **Decision**: Use **Azure Active Directory B2C** (or just MSAL for "Sign in with Microsoft") combined with our local `Users` table.

- **Why**: "Everything Azure" rule.
- **Role Management**: Store `role='supplier'` in `Users` table (already exists).
- **Session**: JWT Tokens (handled by existing `auth.js`).

---

## 2. Dashboard Layout (Wireframe)

**Philosophy**: "Clean, Action-Oriented, Analytics-First"

### **Main Navigation (Sidebar)**

- **Dashboard** (Home)
- **RFQs** (Inbox for new leads)
- **My Products** (Catalog management)
- **Profile & Settings** (Company info, service radius)

### **Home Screen Elements**

1. **Header**: "Welcome back, [Company Name]" + Verification Badge Status.
2. **Top Cards (Metrics)**:
   - "Active RFQs" (Counter: 3) - Click to view.
   - "Profile Views" (Counter: 15 this week).
   - "Catalog Size" (Counter: 12 products).
3. **Recent Activity / Action Items**:
   - ⚠️ "New RFQ matching 'Concrete' in [City]" (Action: Quote Now).
   - ℹ️ "Please verify scraped product [Product Name]" (Action: Verify).

---

## 3. Data Architecture (PostgreSQL Schema)

Building upon existing `Users` and `materials` tables.

### **New Tables Needed:**

1.  **`supplier_profiles`** (Extends `Users`)
    - `user_id` (FK)
    - `claimed_at` (Timestamp)
    - `verification_status` ('pending', 'verified', 'rejected')
    - `masterformat_codes` (Array of strings)
    - `website_url`
    - `logo_url`

2.  **`supplier_products`** (Junction between `Users` and `materials`)
    - Tracks which supplier "owns" or "distributes" a material.
    - `supplier_id` (FK)
    - `material_id` (FK)
    - `is_verified` (Boolean)
    - `stock_status`

3.  **`rfq_responses`** (Quotes)
    - `rfq_id` (FK)
    - `supplier_id` (FK)
    - `status` ('draft', 'sent', 'accepted', 'declined')
    - `quote_amount`
    - `availability_date`
    - `message`

### **Schema Update Plan (Migration 003)**

See `backend/migrations/003_supplier_dashboard.sql` for implementation.

---

## 4. RFQ Management Workflow

1.  **Notification**: Scraper/Matcher finds match -> Email + In-App Notification.
2.  **Inbox**: Supplier sees "New RFQ: 5000 sqft Drywall - Boston, MA".
3.  **Action**:
    - **Decline**: "OutOfArea" / "NoStock" (Feedback loop improves matching).
    - **Quote**:
      - Form: "Price per unit", "Delivery Date", "Attach Spec Sheet".
      - One-click "Apply from Catalog" button to pre-fill product data.

---

## 5. Implementation Priority (4-Week MVP)

| Phase      | Feature               | Description                                                  |
| :--------- | :-------------------- | :----------------------------------------------------------- |
| **Week 1** | **Database & Auth**   | Schema updates, "Claim Profile" API, Auth flow.              |
| **Week 2** | **Profile & Catalog** | "My Products" list, Edit Company Info, Verify Scraped items. |
| **Week 3** | **RFQ Inbox**         | View RFQs, Simple Text Reply/Quote form.                     |
| **Week 4** | **Home Dashboard**    | Metrics, Polish, Email Notifications.                        |

---

## ⚠️ Key Decision: Scraped vs. User Data

- **Scraped Data** is explicitly marked `source='scrape'` in DB.
- When a supplier edits a product, update `source='supplier'` and lock it from scraper updates.
- **Verification Badge**: Only given if they upload >1 EPD or link a verified EPD.
