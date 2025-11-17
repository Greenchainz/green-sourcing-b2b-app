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

interface SupplierQuoteResponseProps {
  buyerName: string;
  supplierCompany: string;
  productName: string;
  price: string;
  unit: string;
  availability: string;
  timeline: string;
  message: string;
  rfqId: string;
}

export default function SupplierQuoteResponse({
  buyerName = 'Buyer',
  supplierCompany = 'Supplier Inc.',
  productName = 'Sustainable Insulation',
  price = '100.00',
  unit = 'sq ft',
  availability = 'In Stock',
  timeline = '2-3 weeks',
  message = 'Here is the quote you requested.',
  rfqId = '123'
}: SupplierQuoteResponseProps) {
  return (
    <Html>
      <Head />
      <Preview>{supplierCompany} Has Sent You a Quote for {productName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>You have a new quote!</Heading>

            <Text style={paragraph}>
              Hi {buyerName},
            </Text>

            <Text style={paragraph}>
              Good news! <strong>{supplierCompany}</strong> has responded to your quote request for <strong>{productName}</strong>.
            </Text>

            <Section style={detailsSection}>
              <Text style={detailsHeader}>--- Quote Details ---</Text>
              <Text><strong>Price:</strong> ${price} per {unit}</Text>
              <Text><strong>Availability:</strong> {availability}</Text>
              <Text><strong>Timeline:</strong> {timeline}</Text>
              <Text><strong>Supplier Message:</strong> "{message}"</Text>
            </Section>

            <Text style={paragraph}>
              <strong>--- Next Steps ---</strong>
            </Text>
            <Text style={paragraph}>
              Reply directly to this email to discuss details with {supplierCompany}. Or accept the quote in your dashboard.
            </Text>

            <EmailButton href={`https://greenchainz.com/dashboard/rfqs/${rfqId}`}>
              View Quote
            </EmailButton>

             <Text style={paragraph}>
              Thanks for using GreenChainz!
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