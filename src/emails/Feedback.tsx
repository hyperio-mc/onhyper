import {
  Body,
  Button,
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

interface FeedbackEmailProps {
  name?: string;
  email: string;
}

const baseUrl = process.env.BASE_URL || 'https://onhyper.io';

export const FeedbackEmail = ({ name, email }: FeedbackEmailProps) => {
  const displayName = name || email.split('@')[0];

  return (
    <Html>
      <Head />
      <Preview>Quick question about your experience</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>OnHyper</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>
              How's it going? 👋
            </Heading>

            <Text style={text}>
              Hi {displayName},
            </Text>

            <Text style={text}>
              You've been with us for a week now. Quick question:
            </Text>

            <Heading style={questionHeading}>
              What's been the biggest blocker for you?
            </Heading>

            {/* Options */}
            <Section style={optionsContainer}>
              <Section style={optionBox}>
                <Text style={optionLetter}>A</Text>
                <Text style={optionText}>Haven't had time to try it yet</Text>
              </Section>

              <Section style={optionBox}>
                <Text style={optionLetter}>B</Text>
                <Text style={optionText}>The setup was confusing</Text>
              </Section>

              <Section style={optionBox}>
                <Text style={optionLetter}>C</Text>
                <Text style={optionText}>I'm not sure what to build</Text>
              </Section>

              <Section style={optionBox}>
                <Text style={optionLetter}>D</Text>
                <Text style={optionText}>Other — reply and tell me!</Text>
              </Section>
            </Section>

            <Text style={instruction}>
              Just reply to this email with your answer. We read every response.
            </Text>

            <Section style={divider} />

            <Heading style={h2}>Also, two things:</Heading>

            {/* Community */}
            <Section style={communityBox}>
              <Text style={boxIcon}>💬</Text>
              <Text style={boxTitle}>
                <strong>We're building a community</strong>
              </Text>
              <Text style={boxDescription}>
                Connect with other developers building AI apps securely.
              </Text>
              <Button href="https://discord.gg/onhyper" style={button}>
                Join Discord →
              </Button>
            </Section>

            {/* Feedback */}
            <Section style={feedbackBox}>
              <Text style={boxIcon}>🎁</Text>
              <Text style={boxTitle}>
                <strong>We're hiring feedback</strong>
              </Text>
              <Text style={boxDescription}>
                Reply with any feature requests or pain points.
                <br />
                <strong>First 10 responders get a free month of Pro.</strong>
              </Text>
            </Section>

            <Section style={divider} />

            <Text style={closingText}>
              Your feedback shapes what we build next.
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
  margin: '0 0 16px',
  lineHeight: '1.4',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const questionHeading = {
  color: '#4f46e5',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 20px',
  lineHeight: '1.4',
};

const optionsContainer = {
  marginBottom: '24px',
};

const optionBox = {
  display: 'flex',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
};

const optionLetter = {
  display: 'inline-block',
  width: '24px',
  height: '24px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  backgroundColor: '#e0e7ff',
  color: '#4f46e5',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: '600',
  margin: '0 12px 0 0',
  flexShrink: '0',
};

const optionText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0',
  flex: '1',
};

const instruction = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 24px',
  fontStyle: 'italic' as const,
};

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
};

const communityBox = {
  backgroundColor: '#e0f2fe',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '16px',
};

const feedbackBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '12px',
  padding: '20px 24px',
};

const boxIcon = {
  fontSize: '28px',
  margin: '0 0 8px',
};

const boxTitle = {
  color: '#171717',
  fontSize: '16px',
  margin: '0 0 8px',
};

const boxDescription = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const button = {
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  borderRadius: '6px',
};

const closingText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0',
  textAlign: 'center' as const,
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

export default FeedbackEmail;