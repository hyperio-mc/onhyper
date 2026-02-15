import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text, } from '@react-email/components';
const baseUrl = process.env.BASE_URL || 'https://onhyper.io';
export const WelcomeEmail = ({ name, email }) => {
    const displayName = name || email.split('@')[0];
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Welcome to OnHyper - your API keys are safe here \uD83D\uDE80" }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Section, { style: header, children: _jsx(Heading, { style: logo, children: "OnHyper" }) }), _jsxs(Section, { style: content, children: [_jsx(Heading, { style: h1, children: "Welcome to OnHyper! \uD83D\uDE80" }), _jsxs(Text, { style: text, children: ["Hi ", displayName, ","] }), _jsx(Text, { style: text, children: "Welcome to OnHyper! You just made your API keys exponentially safer." }), _jsx(Heading, { style: h2, children: "Here's what you can do now:" }), _jsxs(Section, { style: stepBox, children: [_jsx(Text, { style: stepNumber, children: "1" }), _jsxs(Text, { style: stepText, children: [_jsx("strong", { children: "Add your first API key" }), _jsx("br", {}), _jsxs(Link, { href: `${baseUrl}/keys`, style: link, children: ["\u2192 ", baseUrl, "/keys"] }), _jsx("br", {}), _jsx("span", { style: muted, children: "Store your OpenAI, Anthropic, Ollama, or other keys securely." })] })] }), _jsxs(Section, { style: stepBox, children: [_jsx(Text, { style: stepNumber, children: "2" }), _jsxs(Text, { style: stepText, children: [_jsx("strong", { children: "Build your first app" }), _jsx("br", {}), _jsxs(Link, { href: `${baseUrl}/apps/new`, style: link, children: ["\u2192 ", baseUrl, "/apps/new"] }), _jsx("br", {}), _jsx("span", { style: muted, children: "Write HTML/CSS/JS and call APIs through our secure proxy." })] })] }), _jsxs(Section, { style: stepBox, children: [_jsx(Text, { style: stepNumber, children: "3" }), _jsxs(Text, { style: stepText, children: [_jsx("strong", { children: "Check out the docs" }), _jsx("br", {}), _jsxs(Link, { href: `${baseUrl}/docs`, style: link, children: ["\u2192 ", baseUrl, "/docs"] }), _jsx("br", {}), _jsx("span", { style: muted, children: "Quick start guide and API reference." })] })] }), _jsx(Section, { style: divider }), _jsx(Heading, { style: h2, children: "What to expect from us:" }), _jsx(Text, { style: listItem, children: "\u2022 Tips on building AI-powered apps securely" }), _jsx(Text, { style: listItem, children: "\u2022 New proxy endpoints and features (we're adding more soon)" }), _jsx(Text, { style: listItem, children: "\u2022 Occasional product updates (no spam, promised)" }), _jsx(Text, { style: text, children: "If you hit any blockers, just reply to this email. We read every response." })] }), _jsxs(Section, { style: footer, children: [_jsxs(Text, { style: footerText, children: ["\u2014 The OnHyper Team", _jsx("br", {}), _jsx(Link, { href: baseUrl, style: footerLink, children: baseUrl.replace('https://', '') })] }), _jsxs(Text, { style: unsubscribeText, children: ["You're receiving this because you signed up at OnHyper.", _jsx("br", {}), _jsx(Link, { href: `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`, style: unsubscribeLink, children: "Unsubscribe" })] })] })] }) })] }));
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
    textAlign: 'center',
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
//# sourceMappingURL=Welcome.js.map