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

interface ProductApprovalEmailProps {
  supplierName: string;
  productName: string;
  productId: string;
}

export default function ProductApprovalEmail({
  supplierName = 'Supplier',
  productName = 'Eco-Friendly Insulation',
  productId = '123'
}: ProductApprovalEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Product "{productName}" is Now Live on GreenChainz</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>Your product is live!</Heading>

            <Text style={paragraph}>
              Hi {supplierName},
            </Text>

            <Text style={paragraph}>
              Great news! Your product <strong>{productName}</strong> has been approved and is now live on GreenChainz.
            </Text>

            <Text style={paragraph}>
              <strong>--- What This Means ---</strong>
            </Text>

            <Text style={list}>
              ✓ Your product is now searchable by 500+ qualified buyers<br />
              ✓ You'll receive email notifications when buyers request quotes<br />
              ✓ Your company profile is visible in search results
            </Text>

            <EmailButton href={`https://greenchainz.com/product/${productId}`}>
              View Your Product
            </EmailButton>

            <Text style={paragraph}>
              Want to add more products? Visit your dashboard.
            </Text>

            <EmailButton href="https://greenchainz.com/dashboard/supplier/products/new">
              Add Another Product
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

const list = {
  color: '#020617',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '16px 0',
};