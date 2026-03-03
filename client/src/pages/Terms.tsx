import Markdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const TERMS_CONTENT = `# GreenChainz Terms of Service

**Effective Date:** February 22, 2026  
**Last Updated:** February 22, 2026

---

## 1. Acceptance of Terms

By accessing and using the GreenChainz platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. GreenChainz Inc. ("Company," "we," "us," or "our") reserves the right to modify these Terms at any time. Your continued use of the Service following the posting of revised Terms means that you accept and agree to the changes.

---

## 2. Service Description

GreenChainz is a B2B marketplace that connects architects, procurement officers, contractors, and other building professionals (collectively, "Buyers") with verified suppliers of sustainable building materials (collectively, "Suppliers"). The Service provides:

- Material search and comparison with Environmental Product Declaration (EPD) data
- Requests for Quotation (RFQ) submission and management
- Real-time messaging between Buyers and Suppliers
- AI-powered material swap recommendations
- Compliance verification and LEED credit tracking

The Service integrates data from third-party sources including Autodesk Sustainability Data API, Building Transparency EC3 database, and user-submitted material specifications.

---

## 3. User Accounts and Registration

### 3.1 Eligibility

To use the Service, you must be at least 18 years old and have the legal authority to enter into these Terms. If you are registering on behalf of an organization, you represent and warrant that you have authority to bind that organization to these Terms.

### 3.2 Account Credentials

You are responsible for maintaining the confidentiality of your account credentials and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any other breach of security.

### 3.3 Account Termination

We reserve the right to suspend or terminate your account if you violate these Terms or any applicable law, engage in fraudulent or deceptive practices, submit false or misleading material information, or if your account remains inactive for 12 consecutive months.

---

## 4. User Responsibilities and Prohibited Conduct

### 4.1 Buyer Responsibilities

Buyers agree to provide accurate and complete information when submitting RFQs, use the Service only for legitimate procurement of building materials, not submit RFQs for materials or projects that violate applicable building codes or environmental regulations, and not use the Service to solicit competitive intelligence or reverse-engineer supplier pricing.

### 4.2 Supplier Responsibilities

Suppliers agree to provide accurate, complete, and current information about their materials and certifications, maintain valid Environmental Product Declarations (EPDs) and third-party certifications, respond to RFQs in good faith within stated timeframes, not misrepresent material specifications, environmental claims, or certifications, and comply with all applicable environmental and building code regulations.

### 4.3 Prohibited Conduct

All users agree NOT to submit false, misleading, or fraudulent information, engage in harassment, discrimination, or abusive behavior toward other users, attempt to gain unauthorized access to the Service or other users' accounts, scrape, crawl, or automatically extract data from the Service without written permission, use the Service to circumvent procurement regulations or environmental mandates, post content that infringes intellectual property rights of third parties, or use the Service for any illegal purpose or in violation of applicable laws.

---

## 5. Intellectual Property Rights

### 5.1 Company Ownership

The Service, including all software, design, graphics, text, and content, is owned by or licensed to Company and is protected by copyright, trademark, and other intellectual property laws. You retain ownership of any content you submit (such as material specifications or RFQ details), but grant Company a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content for the purpose of operating and improving the Service.

### 5.2 Third-Party Data

The Service incorporates data from third-party sources including Autodesk Sustainability Data API and Building Transparency EC3 database. Your use of this data is subject to the terms and conditions of those third-party providers. Company does not warrant the accuracy or completeness of third-party data.

---

## 6. Limitation of Liability

### 6.1 Disclaimer of Warranties

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. COMPANY DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

Company does not warrant that the Service will be uninterrupted or error-free, third-party data (EPDs, certifications, compliance information) is accurate or complete, material recommendations or swap suggestions will meet your specific project requirements, or the Service will comply with all applicable building codes or environmental regulations in your jurisdiction.

### 6.2 Limitation of Damages

TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, EVEN IF COMPANY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

IN NO EVENT SHALL COMPANY'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO COMPANY IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.

---

## 7. Indemnification

You agree to indemnify, defend, and hold harmless Company and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising out of or related to your violation of these Terms, your use of the Service, your submission of false or misleading information, your infringement of third-party intellectual property rights, or your violation of applicable laws or regulations.

---

## 8. Subscription Plans and Pricing

The Service offers three subscription tiers:

- **Free**: $0/month - Material search, basic RFQ submission (5/month), messaging
- **Professional**: $99/month - Unlimited RFQs, advanced analytics, supplier filtering
- **Business**: $199/month - AI-powered recommendations, custom agent configuration, priority support

Subscriptions renew automatically on the anniversary of your subscription date. You authorize Company to charge your payment method for all fees and charges. Subscription fees are non-refundable except as required by law.

---

## 9. Dispute Resolution

### 9.1 Informal Resolution

In the event of a dispute, the parties agree to attempt informal resolution through good-faith negotiation for 30 days before pursuing formal legal action.

### 9.2 Arbitration

Any dispute arising out of or related to these Terms or the Service shall be resolved by binding arbitration administered by JAMS (Judicial Arbitration and Mediation Services) in accordance with its Comprehensive Arbitration Rules & Procedures.

### 9.3 Class Action Waiver

You agree that any arbitration or legal proceeding shall be conducted on an individual basis and not as a class action or representative action.

---

## 10. Termination

You may terminate your account at any time by providing written notice to Company. Company may terminate or suspend your account immediately without notice if you violate these Terms or applicable law, engage in fraudulent or deceptive practices, or pose a security risk to the Service or other users.

---

## 11. Governing Law and Jurisdiction

These Terms shall be governed by and construed in accordance with the laws of the Commonwealth of Virginia, United States, without regard to its conflict of law principles.

---

## 12. Contact Information

For questions about these Terms, please contact:

**GreenChainz Inc.**  
1842 Ferry Rd  
Danville, VA 24541  
United States

Email: legal@greenchainz.com  
Support: support@greenchainz.com
`;

export function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/')}
          className="mb-6"
        >
          ← Back to Home
        </Button>
        
        <article className="prose prose-invert max-w-none">
          <Markdown>{TERMS_CONTENT}</Markdown>
        </article>
        
        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>Last updated: February 22, 2026</p>
          <p>For questions, contact: legal@greenchainz.com</p>
        </div>
      </div>
    </div>
  );
}
