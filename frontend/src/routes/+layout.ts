// Enable prerendering for all routes (required for adapter-static)
// This allows the site to be built as static files
export const prerender = true;

// Disable SSR to avoid hydration issues with client-side auth
// All pages will be rendered as client-side apps with a fallback to index.html
export const ssr = true;