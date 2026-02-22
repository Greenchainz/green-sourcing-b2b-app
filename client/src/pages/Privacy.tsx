import Markdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const PRIVACY_CONTENT = `# Privacy Policy

**Effective Date:** February 22, 2026  
**Last Updated:** February 22, 2026

---

## 1. Introduction

GreenChainz Inc. ("Company," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services (the "Service").

By using the Service, you consent to the data practices described in this policy.

---

## 2. Information We Collect

### 2.1 Information You Provide

- **Account Information**: Name, email, phone number, company name, job title, business address
- **Profile Data**: Project details, material preferences, procurement history (Buyers); product catalogs, certifications, EPDs, pricing (Suppliers)
- **RFQ and Messages**: Material specifications, pricing inquiries, negotiation details
- **Payment Information**: Billing address, payment method (processed securely through Microsoft), transaction history
- **Support Communications**: Inquiries, attachments, correspondence history

### 2.2 Automatically Collected Information

- **Device Data**: Device type, operating system, browser, IP address, device identifiers
- **Usage Data**: Pages visited, features used, search queries, materials viewed, RFQs submitted, time on platform
- **Location Data**: Approximate location based on IP address (for supplier filtering)
- **Log Data**: Access times, referral URLs, error messages

### 2.3 Third-Party Data

- Environmental data from Autodesk Sustainability Data API, Building Transparency EC3 database
- Authentication data from Microsoft Entra ID
- Payment confirmation from Microsoft payment processing
- Analytics from third-party services

---

## 3. How We Use Your Information

We use your information to:

- **Deliver the Service**: Create accounts, process RFQs, facilitate messaging, provide core functionality
- **Personalize Experience**: Show relevant material recommendations, AI-powered swap suggestions
- **Communicate**: Send RFQ confirmations, bid notifications, subscription updates, support responses
- **Improve the Service**: Analyze usage patterns, identify trends, enhance features
- **Ensure Compliance**: Comply with laws, enforce Terms of Service, prevent fraud, protect users
- **Train AI**: Improve our AI agents (ChainBot, Material Intelligence, RFQ Assistant) for better recommendations

---

## 4. Information Sharing

### 4.1 With Other Users

- **Buyer-Supplier Communication**: When you submit an RFQ, your company name, contact info, and requirements are shared with bidding Suppliers
- **Public Supplier Profiles**: Supplier company names, certifications, material offerings, and ratings are visible to all Buyers
- **Reviews**: Material and supplier feedback may be displayed publicly

### 4.2 Service Providers

We share data with trusted third-party providers:

- **Microsoft Azure**: Cloud infrastructure, data storage (East US region)
- **Microsoft Payment Processing**: Subscription billing and payments
- **Zoho Mail**: Transactional and marketing emails
- **Microsoft Entra ID**: Authentication and identity management
- **Azure Web PubSub**: Real-time messaging
- **Azure Maps**: Location-based features
- **Analytics Services**: Usage analytics and insights

All providers are contractually obligated to protect your data and use it only for providing services to us.

### 4.3 Legal Requirements

We may disclose information if required by law, court order, government request, or to enforce our Terms, protect rights and safety, prevent fraud, or respond to emergencies.

### 4.4 Business Transfers

If GreenChainz is acquired, merged, or undergoes a business transition, your information may be transferred to the successor entity.

---

## 5. Data Retention

We retain your information for as long as your account is active or as needed to provide the Service. After account termination, we may retain certain data for legal compliance, dispute resolution, and fraud prevention (typically 7 years for financial records, 3 years for RFQ data).

---

## 6. Your Rights and Choices

### 6.1 Access and Correction

You may access and update your account information at any time through your account settings.

### 6.2 Data Deletion

You may request deletion of your account and personal data by contacting privacy@greenchainz.com. Note that we may retain certain information for legal compliance.

### 6.3 Marketing Communications

You may opt out of marketing emails by clicking "unsubscribe" in any marketing email or updating your communication preferences in account settings.

### 6.4 Cookies

You may disable cookies through your browser settings, but this may limit Service functionality.

### 6.5 California Privacy Rights (CCPA)

California residents have the right to:
- Know what personal information is collected, used, shared, or sold
- Request deletion of personal information
- Opt-out of the sale of personal information (we do not sell personal information)
- Non-discrimination for exercising privacy rights

### 6.6 European Privacy Rights (GDPR)

If you are in the European Economic Area, you have the right to:
- Access, correct, or delete your personal data
- Object to or restrict processing
- Data portability
- Withdraw consent
- Lodge a complaint with a supervisory authority

---

## 7. Data Security

We implement industry-standard security measures to protect your information, including:

- **Encryption**: Data encrypted in transit (TLS 1.3) and at rest (AES-256)
- **Access Controls**: Role-based access, multi-factor authentication for admin accounts
- **Infrastructure Security**: Microsoft Azure security features, regular security audits
- **Monitoring**: Continuous monitoring for security threats and anomalies

However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.

---

## 8. Children's Privacy

The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.

---

## 9. International Data Transfers

Your information may be transferred to and processed in the United States and other countries where our service providers operate. By using the Service, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection laws.

---

## 10. Third-Party Links

The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.

---

## 11. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Service and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.

---

## 12. Contact Us

If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:

**GreenChainz Inc.**  
1842 Ferry Rd  
Danville, VA 24541  
United States

**Email**: privacy@greenchainz.com  
**Support**: support@greenchainz.com  
**Website**: https://greenchainz.com

For GDPR-related inquiries, contact our Data Protection Officer at: dpo@greenchainz.com
`;

export function Privacy() {
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
          <Markdown>{PRIVACY_CONTENT}</Markdown>
        </article>
        
        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>Last updated: February 22, 2026</p>
          <p>For questions, contact: privacy@greenchainz.com</p>
        </div>
      </div>
    </div>
  );
}
