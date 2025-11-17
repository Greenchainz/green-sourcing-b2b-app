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

interface WelcomeEmailProps {
  firstName: string;
}

export default function WelcomeEmail({ firstName = 'there' }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to GreenChainz – Your Green Material Sourcing Starts Here</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>Welcome to GreenChainz!</Heading>

            <Text style={paragraph}>
              Hi {firstName},
            </Text>

            <Text style={paragraph}>
              We're excited to help you discover and compare verified sustainable building materials.
            </Text>

            <Text style={paragraph}>
              <strong>Here's what you can do now:</strong>
            </Text>

            <Text style={list}>
              ✓ Search 1,000+ certified green products<br />
              ✓ Compare lifecycle costs and certifications<br />
              ✓ Request quotes directly from suppliers
            </Text>

            <EmailButton href="https://greenchainz.com/search">
              Get Started
            </EmailButton>

            <Text style={paragraph}>
              Need help? Check out our <a href="https://greenchainz.com/how-it-works" style={link}>How It Works</a> guide or reply to this email.
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