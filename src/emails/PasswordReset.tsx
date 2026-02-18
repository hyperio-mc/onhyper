import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  name?: string;
  email: string;
  resetUrl: string;
}

const baseUrl = process.env.BASE_URL || 'https://onhyper.io';

export const PasswordResetEmail = ({ name, email, resetUrl }: PasswordResetEmailProps) => {
  const displayName = name || email.split('@')[0];

  return (
    <Html>
      <Head />
      <Preview>Reset your OnHyper password</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>OnHyper</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>
              Reset Your Password
            </Heading>

            <Text style={text}>
              Hi {displayName},
            </Text>

            <Text style={text}>
              We received a request to reset your password for your OnHyper account.
            </Text>

            <Section style={buttonContainer}>
              <Link href={resetUrl} style={button}>
                Reset Password
              </Link>
            </Section>

            <Text style={text}>
              Or copy and paste this URL into your browser:
            </Text>

            <Text style={linkText}>
              <Link href={resetUrl} style={linkStyle}>{resetUrl}</Link>
            </Text>

            <Section style={divider} />

            <Heading style={h2}>Security Notice</Heading>
            <Text style={mutedText}>
              This link will expire in <strong>1 hour</strong> for your security.
              If you didn't request a password reset, you can safely ignore this email.
            </Text>

            <Text style={mutedText}>
              If you have any questions or need help, just reply to this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              — The OnHyper Team
              <br />
              <Link href={baseUrl} style={footerLink}>{baseUrl.replace('https://', '')}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#fafafa',
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const header = {
  padding: '32px 48px',
  backgroundColor: '#4f46e5',
  borderRadius: '12px 12px 0 0',
};

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  padding: '32px 48px',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderTop: 'none',
};

const h1 = {
  color: '#171717',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 24px',
  lineHeight: '1.3',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#171717',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
  lineHeight: '1.4',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const mutedText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 32px',
  borderRadius: '8px',
};

const linkText = {
  textAlign: 'center' as const,
  margin: '16px 0',
};

const linkStyle = {
  color: '#4f46e5',
  fontSize: '13px',
  wordBreak: 'break-all' as const,
};

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
};

const footer = {
  padding: '24px 48px',
  backgroundColor: '#f9fafb',
  borderRadius: '0 0 12px 12px',
  border: '1px solid #e5e7eb',
  borderTop: 'none',
};

const footerText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#4f46e5',
  textDecoration: 'none',
};

export default PasswordResetEmail;