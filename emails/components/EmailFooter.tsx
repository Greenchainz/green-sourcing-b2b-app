import {
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export default function EmailFooter() {
  return (
    <Section style={footer}>
      <Text style={footerText}>
        © 2025 GreenChainz. All rights reserved.
      </Text>
      <Text style={footerText}>
        <a href="https://greenchainz.com" style={link}>greenchainz.com</a>
      </Text>
    </Section>
  );
}

// Styles
const footer = {
  backgroundColor: '#F1F5F9',
  padding: '24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #E2E8F0',
};

const footerText = {
  color: '#64748B',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const link = {
  color: '#1F9D55',
  textDecoration: 'underline',
};