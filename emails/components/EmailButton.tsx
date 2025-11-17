import {
  Button,
} from '@react-email/components';
import * as React from 'react';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export default function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button style={button} href={href}>
      {children}
    </Button>
  );
}

// Styles
const button = {
  backgroundColor: '#1F9D55',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  margin: '24px 0',
};