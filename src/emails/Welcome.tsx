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
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  name?: string;
  email: string;
}

const baseUrl = process.env.BASE_URL || 'https://onhyper.io';

export const WelcomeEmail = ({ name, email }: WelcomeEmailProps) => {
  const displayName = name || email.split('@')[0];

  return (
    <Html>
      <Head />
      <Preview>Welcome to OnHyper - your API keys are safe here 🚀</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>OnHyper</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>
              Welcome to OnHyper! 🚀
            </Heading>

            <Text style={text}>
              Hi {displayName},
            </Text>

            <Text style={text}>
              Welcome to OnHyper! You just made your API keys exponentially safer.
            </Text>

            <Heading style={h2}>Here's what you can do now:</Heading>

            <Section style={stepBox}>
              <Text style={stepNumber}>1</Text>
              <Text style={stepText}>
                <strong>Add your first API key</strong>
                <br />
                <Link href={`${baseUrl}/keys`} style={link}>
                  → {baseUrl}/keys
                </Link>
                <br />
                <span style={muted}>Store your OpenAI, Anthropic, Ollama, or other keys securely.</span>
              </Text>
            </Section>

            <Section style={stepBox}>
              <Text style={stepNumber}>2</Text>
              <Text style={stepText}>
                <strong>Build your first app</strong>
                <br />
                <Link href={`${baseUrl}/apps/new`} style={link}>
                  → {baseUrl}/apps/new
                </Link>
                <br />
                <span style={muted}>Write HTML/CSS/JS and call APIs through our secure proxy.</span>
              </Text>
            </Section>

            <Section style={stepBox}>
              <Text style={stepNumber}>3</Text>
              <Text style={stepText}>
                <strong>Check out the docs</strong>
                <br />
                <Link href={`${baseUrl}/docs`} style={link}>
                  → {baseUrl}/docs
                </Link>
                <br />
                <span style={muted}>Quick start guide and API reference.</span>
              </Text>
            </Section>

            <Section style={divider} />

            <Heading style={h2}>What to expect from us:</Heading>
            <Text style={listItem}>• Tips on building AI-powered apps securely</Text>
            <Text style={listItem}>• New proxy endpoints and features (we're adding more soon)</Text>
            <Text style={listItem}>• Occasional product updates (no spam, promised)</Text>

            <Text style={text}>
              If you hit any blockers, just reply to this email. We read every response.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              — The OnHyper Team
              <br />
              <Link href={baseUrl} style={footerLink}>{baseUrl.replace('https://', '')}</Link>
            </Text>
            <Text style={unsubscribeText}>
              You're receiving this because you signed up at OnHyper.
              <br />
              <Link href={`${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`} style={unsubscribeLink}>
                Unsubscribe
              </Link>
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
};

const h2 = {
  color: '#171717',
  fontSize: '18px',
  fontWeight: '600',
  margin: '24px 0 12px',
  lineHeight: '1.4',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const muted = {
  color: '#6b7280',
  fontSize: '14px',
};

const link = {
  color: '#4f46e5',
  textDecoration: 'underline',
};

const stepBox = {
  display: 'flex',
  marginBottom: '16px',
  paddingLeft: '8px',
};

const stepNumber = {
  display: 'inline-block',
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  textAlign: 'center' as const,
  backgroundColor: '#e0e7ff',
  color: '#4f46e5',
  borderRadius: '50%',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 12px 0 0',
};

const stepText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  flex: '1',
};

const listItem = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
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
  margin: '0 0 16px',
};

const footerLink = {
  color: '#4f46e5',
  textDecoration: 'none',
};

const unsubscribeText = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0',
};

const unsubscribeLink = {
  color: '#6b7280',
  textDecoration: 'underline',
};

export default WelcomeEmail;