import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text, CodeBlock, } from '@react-email/components';
const baseUrl = process.env.BASE_URL || 'https://onhyper.io';
export const QuickWinEmail = ({ name, email }) => {
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
    return (_jsxs(Html, { children: [_jsx(Head, {}), _jsx(Preview, { children: "Build an AI chat app in 15 minutes (no backend needed)" }), _jsx(Body, { style: main, children: _jsxs(Container, { style: container, children: [_jsx(Section, { style: header, children: _jsx(Heading, { style: logo, children: "OnHyper" }) }), _jsxs(Section, { style: content, children: [_jsx(Heading, { style: h1, children: "Build an AI chat app in 15 minutes \uD83D\uDE80" }), _jsxs(Text, { style: text, children: ["Hey ", displayName, ","] }), _jsx(Text, { style: text, children: "Let's build something real." }), _jsxs(Text, { style: text, children: ["One of the most common questions we get: ", _jsx("em", { children: "\"How do I call OpenAI from a static site?\"" })] }), _jsx(Text, { style: text, children: "Here's the entire implementation:" }), _jsxs(Section, { style: stepBox, children: [_jsx(Text, { style: stepNumber, children: "1" }), _jsxs(Text, { style: stepText, children: [_jsx("strong", { children: "Add your OpenAI key" }), _jsx("br", {}), _jsxs(Link, { href: `${baseUrl}/keys`, style: link, children: [baseUrl, "/keys"] }), _jsx("br", {}), _jsx("span", { style: muted, children: "Key name: OPENAI_API_KEY" })] })] }), _jsxs(Section, { style: stepBox, children: [_jsx(Text, { style: stepNumber, children: "2" }), _jsxs(Text, { style: stepText, children: [_jsx("strong", { children: "Create a new app" }), _jsx("br", {}), _jsxs(Link, { href: `${baseUrl}/apps/new`, style: link, children: [baseUrl, "/apps/new"] })] })] }), _jsxs(Section, { style: stepBox, children: [_jsx(Text, { style: stepNumber, children: "3" }), _jsx(Text, { style: stepText, children: _jsx("strong", { children: "Paste this code:" }) })] }), _jsx(Section, { style: codeContainer, children: _jsx(CodeBlock, { code: codeExample, language: "javascript", style: codeStyle }) }), _jsxs(Section, { style: successBox, children: [_jsx(Text, { style: successIcon, children: "\u2713" }), _jsxs(Text, { style: successText, children: [_jsx("strong", { children: "That's it." }), " Your key stays server-side. The user never sees it."] })] }), _jsx(Section, { style: divider }), _jsx(Text, { style: text, children: "Try it now and reply with a link to what you built. We'd love to see it!" }), _jsx(Text, { style: highlight, children: "Next email: How to handle rate limiting and errors gracefully." })] }), _jsxs(Section, { style: footer, children: [_jsxs(Text, { style: footerText, children: ["\u2014 The OnHyper Team", _jsx("br", {}), _jsx(Link, { href: baseUrl, style: footerLink, children: baseUrl.replace('https://', '') })] }), _jsxs(Text, { style: unsubscribeText, children: ["You're receiving this because you signed up at OnHyper.", _jsx("br", {}), _jsx(Link, { href: `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`, style: unsubscribeLink, children: "Unsubscribe" })] })] })] }) })] }));
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
    fontStyle: 'italic',
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
//# sourceMappingURL=QuickWin.js.map