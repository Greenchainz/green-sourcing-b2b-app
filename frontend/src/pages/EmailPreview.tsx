import { useState, useEffect } from 'react';

const PREVIEW_DATA = {
  // User data
  firstName: 'Sarah',
  email: 'sarah@greenarchstudio.com',
  companyName: 'Green Arch Studio',

  // Product data
  productName: 'Warmcel Cellulose Insulation',
  productId: 1,
  quantity: '500 sq ft',

  // Supplier data
  supplierName: 'Warmcel Ltd',
  supplierEmail: 'sales@warmcel.com',

  // Quote data
  quotePrice: '$4,250',
  availability: 'In Stock',
  timeline: 'Ships within 5 business days',

  // RFQ data
  rfqId: 12345,
  message: 'We need this material for a LEED Gold project in Seattle. What is your lead time?',

  // Rejection data
  rejectionReason: 'The provided product documentation was incomplete.',
  requiredChanges: 'Please upload a valid Environmental Product Declaration (EPD) in PDF format.',

  // Links
  unsubscribe_url: '#',
};

const EMAIL_TEMPLATE_FILES: Record<string, string> = {
  welcome: '/emails/welcome.html',
  rfqSubmitted: '/emails/rfq-submitted.html',
  newRfqSupplier: '/emails/new-rfq-supplier.html',
  quoteReceived: '/emails/quote-received.html',
  supplierApproved: '/emails/supplier-approved.html',
  productRejected: '/emails/product-rejected.html'
};

export default function EmailPreview() {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [templateContent, setTemplateContent] = useState('');

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await fetch(EMAIL_TEMPLATE_FILES[selectedTemplate]);
        const html = await response.text();
        setTemplateContent(html);
      } catch (error) {
        console.error("Failed to fetch email template:", error);
        setTemplateContent('<p>Error loading template.</p>');
      }
    };

    fetchTemplate();
  }, [selectedTemplate]);

  // Replace all placeholder variables with preview data
  const renderTemplate = (template: string) => {
    let rendered = template;
    for (const key in PREVIEW_DATA) {
      const typedKey = key as keyof typeof PREVIEW_DATA;
      const value = PREVIEW_DATA[typedKey];
      // Ensure value is a string before replacing
      const replacement = typeof value === 'string' ? value : String(value);
      rendered = rendered.replace(new RegExp(`{{${typedKey}}}`, 'g'), replacement);
    }
    return rendered;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Email Template Preview</h1>

        {/* Template Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            <option value="welcome">Welcome Email</option>
            <option value="rfqSubmitted">RFQ Submitted (Buyer)</option>
            <option value="newRfqSupplier">New RFQ (Supplier)</option>
            <option value="quoteReceived">Quote Received (Buyer)</option>
            <option value="supplierApproved">Supplier Approved</option>
            <option value="productRejected">Product Rejected</option>
          </select>
        </div>

        {/* Email Preview */}
        <div style={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '2rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <iframe
            srcDoc={renderTemplate(templateContent)}
            style={{ width: '100%', height: '800px', border: 'none' }}
            title={`Preview of ${selectedTemplate} email`}
          />
        </div>
      </div>
    </div>
  );
}