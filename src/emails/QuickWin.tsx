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

interface QuickWinEmailProps {
  name?: string;
  email: string;
}

const baseUrl = process.env.BASE_URL || 'https://onhyper.io';

export const QuickWinEmail = ({ name, email }: QuickWinEmailProps) => {
  const displayName = name || email.split('@')[0];

  const codeExample = `// Step 1: Add your OpenAI key at onhyper.io/keys
// Key name: OPENAI_API_KEY

// Step 2: Create a new app at onhyper.io/apps/new

// Step 3: Paste this code:
async function chat(message) {
  const res = await fetch('/proxy/openai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: message }]
    })
  });
  return await res.json();
}

// That's it! Your key stays server-side.
// The user never sees it.`;

  return (
    <Html>
      <Head />
      <Preview>Build an AI chat app in 15 minutes (no backend needed)</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>OnHyper</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>
              Build an AI chat app in 15 minutes 🚀
            </Heading>

            <Text style={text}>
              Hey {displayName},
            </Text>

            <Text style={text}>
              Let's build something real.
            </Text>

            <Text style={text}>
              One of the most common questions we get: <em>"How do I call OpenAI from a static site?"</em>
            </Text>

            <Text style={text}>
              Here's the entire implementation:
            </Text>

            {/* Step 1 */}
            <Section style={stepBox}>
              <Text style={stepNumber}>1</Text>
              <Text style={stepText}>
                <strong>Add your OpenAI key</strong>
                <br />
                <Link href={`${baseUrl}/keys`} style={link}>{baseUrl}/keys</Link>
                <br />
                <span style={muted}>Key name: OPENAI_API_KEY</span>
              </Text>
            </Section>

            {/* Step 2 */}
            <Section style={stepBox}>
              <Text style={stepNumber}>2</Text>
              <Text style={stepText}>
                <strong>Create a new app</strong>
                <br />
                <Link href={`${baseUrl}/apps/new`} style={link}>{baseUrl}/apps/new</Link>
              </Text>
            </Section>

            {/* Step 3 */}
            <Section style={stepBox}>
              <Text style={stepNumber}>3</Text>
              <Text style={stepText}>
                <strong>Paste this code:</strong>
              </Text>
            </Section>

            {/* Code Block */}
            <Section style={codeContainer}>
              <pre style={{ ...codeStyle, margin: 0 }}>
                <code>{codeExample}</code>
              </pre>
            </Section>

            {/* Result */}
            <Section style={successBox}>
              <Text style={successIcon}>✓</Text>
              <Text style={successText}>
                <strong>That's it.</strong> Your key stays server-side. The user never sees it.
              </Text>
            </Section>

            <Section style={divider} />

            <Text style={text}>
              Try it now and reply with a link to what you built. We'd love to see it! 
            </Text>

            <Text style={highlight}>
              Next email: How to handle rate limiting and errors gracefully.
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
  flexShrink: '0',
};

const stepText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  flex: '1',
};

const codeContainer = {
  backgroundColor: '#1e1b4b',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '24px',
  overflow: 'hidden',
};

const codeStyle = {
  fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#e0e7ff',
};

const successBox = {
  backgroundColor: '#dcfce7',
  borderRadius: '8px',
  padding: '16px 20px',
  display: 'flex',
  alignItems: 'flex-start',
};

const successIcon = {
  fontSize: '20px',
  margin: '0 12px 0 0',
  flexShrink: '0',
};

const successText = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0',
};

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
};

const highlight = {
  color: '#4f46e5',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  fontStyle: 'italic' as const,
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

export default QuickWinEmail;