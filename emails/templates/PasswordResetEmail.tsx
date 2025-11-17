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

interface PasswordResetEmailProps {
  userName: string;
  resetLink: string;
}

export default function PasswordResetEmail({
  userName = 'User',
  resetLink = 'https://greenchainz.com/auth/reset-password?token=placeholder'
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset Your GreenChainz Password</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader />

          <Section style={content}>
            <Heading style={h1}>Reset Your Password</Heading>

            <Text style={paragraph}>
              Hi {userName},
            </Text>

            <Text style={paragraph}>
              We received a request to reset your password. Click the button below to create a new one:
            </Text>

            <EmailButton href={resetLink}>
              Reset Password
            </EmailButton>

            <Text style={paragraph}>
              This link expires in 1 hour.
            </Text>

            <Text style={paragraph}>
              If you didn't request this, you can safely ignore this email.
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