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

interface SupplierApprovedEmailProps {
  supplierName: string;
}

export default function SupplierApprovedEmail({ supplierName = 'Supplier' }: SupplierApprovedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your GreenChainz Supplier Account is Now Active</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>Congratulations! Your account is active.</Heading>

            <Text style={paragraph}>
              Hi {supplierName},
            </Text>

            <Text style={paragraph}>
              Your supplier account has been approved and is now live on GreenChainz.
            </Text>

            <Text style={paragraph}>
              <strong>--- What You Can Do Now ---</strong>
            </Text>

            <Text style={list}>
              ✓ Add your first product listing<br />
              ✓ Your company profile is searchable by 500+ qualified buyers<br />
              ✓ You'll receive email notifications when buyers request quotes
            </Text>

            <EmailButton href="https://greenchainz.com/dashboard/supplier/products/new">
              Add Your First Product
            </EmailButton>

            <Text style={paragraph}>
              <strong>--- Tips for Success ---</strong>
            </Text>
            <Text style={paragraph}>
              1. Add at least 3-5 products to increase visibility<br />
              2. Include high-quality images and complete certifications<br />
              3. Respond to RFQs within 24 hours for best results
            </Text>

            <Text style={paragraph}>
              Need help getting started? Check our <a href="https://greenchainz.com/help/supplier-guide" style={link}>Supplier Guide</a>.
            </Text>

            <Text style={paragraph}>
              Welcome to the GreenChainz community!
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

const list = {
  color: '#020617',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '16px 0',
};

const link = {
  color: '#1F9D55',
  textDecoration: 'underline',
};