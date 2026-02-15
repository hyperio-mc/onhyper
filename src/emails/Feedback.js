import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text, } from '@react-email/components';
const baseUrl = process.env.BASE_URL || 'https://onhyper.io';
export const FeedbackEmail = ({ name, email }) => {
    const displayName = name || email.split('@')[0];
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Quick question about your experience" }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Section, { style: header, children: _jsx(Heading, { style: logo, children: "OnHyper" }) }), _jsxs(Section, { style: content, children: [_jsx(Heading, { style: h1, children: "How's it going? \uD83D\uDC4B" }), _jsxs(Text, { style: text, children: ["Hi ", displayName, ","] }), _jsx(Text, { style: text, children: "You've been with us for a week now. Quick question:" }), _jsx(Heading, { style: questionHeading, children: "What's been the biggest blocker for you?" }), _jsxs(Section, { style: optionsContainer, children: [_jsxs(Section, { style: optionBox, children: [_jsx(Text, { style: optionLetter, children: "A" }), _jsx(Text, { style: optionText, children: "Haven't had time to try it yet" })] }), _jsxs(Section, { style: optionBox, children: [_jsx(Text, { style: optionLetter, children: "B" }), _jsx(Text, { style: optionText, children: "The setup was confusing" })] }), _jsxs(Section, { style: optionBox, children: [_jsx(Text, { style: optionLetter, children: "C" }), _jsx(Text, { style: optionText, children: "I'm not sure what to build" })] }), _jsxs(Section, { style: optionBox, children: [_jsx(Text, { style: optionLetter, children: "D" }), _jsx(Text, { style: optionText, children: "Other \u2014 reply and tell me!" })] })] }), _jsx(Text, { style: instruction, children: "Just reply to this email with your answer. We read every response." }), _jsx(Section, { style: divider }), _jsx(Heading, { style: h2, children: "Also, two things:" }), _jsxs(Section, { style: communityBox, children: [_jsx(Text, { style: boxIcon, children: "\uD83D\uDCAC" }), _jsx(Text, { style: boxTitle, children: _jsx("strong", { children: "We're building a community" }) }), _jsx(Text, { style: boxDescription, children: "Connect with other developers building AI apps securely." }), _jsx(Button, { href: "https://discord.gg/onhyper", style: button, children: "Join Discord \u2192" })] }), _jsxs(Section, { style: feedbackBox, children: [_jsx(Text, { style: boxIcon, children: "\uD83C\uDF81" }), _jsx(Text, { style: boxTitle, children: _jsx("strong", { children: "We're hiring feedback" }) }), _jsxs(Text, { style: boxDescription, children: ["Reply with any feature requests or pain points.", _jsx("br", {}), _jsx("strong", { children: "First 10 responders get a free month of Pro." })] })] }), _jsx(Section, { style: divider }), _jsx(Text, { style: closingText, children: "Your feedback shapes what we build next." })] }), _jsxs(Section, { style: footer, children: [_jsxs(Text, { style: footerText, children: ["\u2014 The OnHyper Team", _jsx("br", {}), _jsx(Link, { href: baseUrl, style: footerLink, children: baseUrl.replace('https://', '') })] }), _jsxs(Text, { style: unsubscribeText, children: ["You're receiving this because you signed up at OnHyper.", _jsx("br", {}), _jsx(Link, { href: `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`, style: unsubscribeLink, children: "Unsubscribe" })] })] })] }) })] }));
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
    textAlign: 'center',
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
    textAlign: 'center',
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
    fontStyle: 'italic',
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
    textAlign: 'center',
    display: 'inline-block',
    padding: '10px 20px',
    borderRadius: '6px',
};
const closingText = {
    color: '#374151',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0',
    textAlign: 'center',
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
//# sourceMappingURL=Feedback.js.map