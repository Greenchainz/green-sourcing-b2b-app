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

interface NewRFQNotificationProps {
  supplierName: string;
  buyerCompany: string;
  productName: string;
  quantity: string;
  buyerMessage: string;
}

export default function NewRFQNotification({
  supplierName = 'Supplier',
  buyerCompany = 'Buyer Co.',
  productName = 'Sustainable Insulation',
  quantity = '100 units',
  buyerMessage = 'Please provide a quote.'
}: NewRFQNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>New Quote Request from {buyerCompany} for {productName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>You have a new quote request!</Heading>

            <Text style={paragraph}>
              Hi {supplierName},
            </Text>

            <Text style={paragraph}>
              <strong>{buyerCompany}</strong> is interested in <strong>{productName}</strong>.
            </Text>

            <Section style={detailsSection}>
              <Text style={detailsHeader}>--- Request Details ---</Text>
              <Text><strong>Buyer:</strong> {buyerCompany}</Text>
              <Text><strong>Product:</strong> {productName}</Text>
              <Text><strong>Quantity:</strong> {quantity}</Text>
              <Text><strong>Message:</strong> "{buyerMessage}"</Text>
            </Section>

            <Text style={paragraph}>
              <strong>--- Respond Now ---</strong>
            </Text>
            <Text style={paragraph}>
              Log in to your dashboard to send a quote. Fast responses win more business!
            </Text>

            <EmailButton href="https://greenchainz.com/dashboard/supplier/rfqs">
              Respond to RFQ
            </EmailButton>

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