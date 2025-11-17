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

interface WelcomeSupplierPendingEmailProps {
  supplierName: string;
}

export default function WelcomeSupplierPendingEmail({ supplierName = 'Supplier' }: WelcomeSupplierPendingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to GreenChainz – Your Application is Under Review</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>Welcome to GreenChainz!</Heading>

            <Text style={paragraph}>
              Hi {supplierName},
            </Text>

            <Text style={paragraph}>
              Thank you for applying to join GreenChainz as a verified supplier!
            </Text>

            <Text style={paragraph}>
              <strong>--- What Happens Next? ---</strong>
            </Text>

            <Text style={paragraph}>
              Our team is reviewing your application and certifications. This typically takes 1-2 business days.
            </Text>

            <Text style={paragraph}>
              Once approved, you'll be able to:
            </Text>

            <Text style={list}>
              ✓ List your sustainable products<br />
              ✓ Receive quote requests from qualified buyers<br />
              ✓ Manage all communications in your dashboard
            </Text>

            <Text style={paragraph}>
              We'll email you as soon as your account is approved. In the meantime, explore our platform:
            </Text>

            <EmailButton href="https://greenchainz.com/search">
              Browse Products
            </EmailButton>

            <Text style={paragraph}>
              Questions? Reply to this email.
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