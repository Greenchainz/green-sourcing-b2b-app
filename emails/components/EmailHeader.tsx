import {
  Heading,
  Section,
} from '@react-email/components';
import * as React from 'react';

export default function EmailHeader() {
  return (
    <Section style={header}>
      <Heading style={headerText}>GreenChainz</Heading>
    </Section>
  );
}

// Styles
const header = {
  backgroundColor: '#0F172A',
  padding: '24px',
  textAlign: 'center' as const,
};

const headerText = {
  color: '#FFFFFF',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};