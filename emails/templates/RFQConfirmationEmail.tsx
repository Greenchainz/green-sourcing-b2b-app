import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import EmailHeader from '../components/EmailHeader';
import EmailFooter from '../components/EmailFooter';
import EmailButton from '../components/EmailButton';

interface RFQConfirmationEmailProps {
  buyerName: string;
  supplierCompany: string;
  productName: string;
  quantity: string;
  message: string;
}

export default function RFQConfirmationEmail({
  buyerName = 'Buyer',
  supplierCompany = 'Supplier Inc.',
  productName = 'Sustainable Insulation',
  quantity = '100 units',
  message = 'Please provide a quote for our upcoming project.'
}: RFQConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Quote Request Has Been Sent to {supplierCompany}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>Your quote request has been sent!</Heading>

            <Text style={paragraph}>
              Hi {buyerName},
            </Text>

            <Text style={paragraph}>
              Great news! Your quote request for <strong>{productName}</strong> has been sent to <strong>{supplierCompany}</strong>.
            </Text>

            <Section style={detailsSection}>
              <Text style={detailsHeader}>--- Request Details ---</Text>
              <Text><strong>Product:</strong> {productName}</Text>
              <Text><strong>Quantity:</strong> {quantity}</Text>
              <Text><strong>Your Message:</strong> "{message}"</Text>
            </Section>

            <Text style={paragraph}>
              <strong>--- What Happens Next? ---</strong>
            </Text>
            <Text style={paragraph}>
              {supplierCompany} will review your request and respond within 2-3 business days. We'll email you as soon as they send their quote.
            </Text>

            <EmailButton href="https://greenchainz.com/dashboard/rfqs">
              View Your RFQs
            </EmailButton>

            <Text style={paragraph}>
              Thanks for using GreenChainz!
            </Text>

             <Text style={paragraph}>
              Best,
              <br />
              The GreenChainz Team
            </Text>
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const content = {
  padding: '24px',
};

const h1 = {
  color: '#020617',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const paragraph = {
  color: '#020617',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const detailsSection = {
  backgroundColor: '#F1F5F9',
  padding: '16px',
  borderRadius: '8px',
  margin: '16px 0',
};

const detailsHeader = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#0F172A',
  margin: '0 0 8px',
};