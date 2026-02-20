/**
 * OnHyper Single Page Application (SPA)
 * 
 * A lightweight client-side router and API wrapper for the OnHyper dashboard.
 * Handles authentication state, page navigation, and API communication.
 * 
 * ## Architecture
 * 
 * - **Hash-based routing**: URLs like `#/dashboard` map to page templates
 * - **API wrapper**: Handles JWT token injection and error handling
 * - **State management**: Global `currentUser` state for auth
 * 
 * ## Page Flow
 * 
 * ```
 * URL Change → Router → Load Template → Init Handlers → Render
 *     │                                          │
 *     │                                          ▼
 *     │                              Page-specific setup:
 *     │                              - Form handlers
 *     │                              - Data loading
 *     │                              - Event listeners
 *     │
 *     └────────────────────────────────────────────┘
 * ```
 * 
 * ## Key Functions
 * 
 * | Function | Purpose |
 * |----------|---------|
 * | `loadPage(path)` | Load and render a page template |
 * | `navigate(path)` | Change URL hash (triggers loadPage) |
 * | `api(endpoint, options)` | Authenticated API request helper |
 * | `checkAuth()` | Validate stored JWT and restore session |
 * | `updateNav()` | Update navigation based on auth state |
 * 
 * ## API Integration
 * 
 * All API calls automatically include the JWT token:
 * 
 * ```javascript
 * // Simple GET
 * const apps = await api('/apps');
 * 
 * // POST with body
 * const result = await api('/apps', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'My App' })
 * });
 * ```
 * 
 * ## Chat System
 * 
 * The support chat connects to ScoutOS agent:
 * - Maintains session ID in localStorage
 * - Tracks message count for lead capture prompt
 * - Streams responses via SSE
 * 
 * @file Public-facing SPA client
 */

// ============================================================================
// STATE & CONFIGURATION
// ============================================================================

/**
 * Current authenticated user state
 * Populated by checkAuth(), cleared on logout
 * @type {Object|null}
 */
let currentUser = null;

/**
 * Base URL for API requests
 * @constant {string}
 */
const API_BASE = '/api';

// Provider icons (emoji fallback, or use SVG)
const PROVIDER_ICONS = {
  'OPENAI_API_KEY': { icon: '🤖', name: 'OpenAI', color: '#10a37f' },
  'ANTHROPIC_API_KEY': { icon: '🧠', name: 'Anthropic', color: '#d97706' },
  'OPENROUTER_API_KEY': { icon: '🔀', name: 'OpenRouter', color: '#6366f1' },
  'SCOUT_API_KEY': { icon: '🔭', name: 'Scout', color: '#8b5cf6' },
  'OLLAMA_API_KEY': { icon: '🦙', name: 'Ollama', color: '#64748b' }
};

function getProviderInfo(keyName) {
  return PROVIDER_ICONS[keyName] || { icon: '🔑', name: keyName.replace('_API_KEY', ''), color: '#6b7280' };
}

// ============================================================================
// ROUTER
// ============================================================================
const routes = {
  '/': 'pages/home.html',
  '/login': 'pages/login.html',
  '/signup': 'pages/signup.html',
  '/forgot-password': 'pages/forgot-password.html',
  '/reset-password': 'pages/reset-password.html',
  '/dashboard': 'pages/dashboard.html',
  '/apps': 'pages/dashboard.html', // Redirect handled in initPageHandlers
  '/keys': 'pages/dashboard.html', // Redirect handled in initPageHandlers
  '/domains': 'pages/dashboard.html', // Redirect handled in initPageHandlers
  '/waitlist': 'pages/waitlist.html',
  '/chat': 'pages/chat.html',
  '/blog': 'pages/blog.html',
  '/blog/:slug': 'pages/post.html',
  '/skill': 'pages/skill.html'
};

function setPageClass(path) {
  const body = document.body;
  const existing = Array.from(body.classList).filter((name) => name.startsWith('page-'));
  existing.forEach((name) => body.classList.remove(name));

  const normalized = path === '/'
    ? 'home'
    : path.replace(/^\//, '').replace(/[^a-z0-9]+/g, '-') || 'home';

  body.classList.add(`page-${normalized}`);
}

async function loadPage(path) {
  // Handle dynamic routes (e.g., /blog/:slug)
  let pagePath = routes[path];
  let routeParams = {};
  
  // Check for dynamic routes
  if (!pagePath) {
    // Check for blog post route
    const blogMatch = path.match(/^\/blog\/(.+)$/);
    if (blogMatch) {
      pagePath = routes['/blog/:slug'];
      routeParams = { slug: blogMatch[1] };
    }
  }
  
  if (!pagePath) {
    pagePath = routes['/'];
  }
  
  try {
    const response = await fetch(pagePath);
    if (!response.ok) throw new Error('Page not found');
    const html = await response.text();
    document.getElementById('app').innerHTML = html;
    setPageClass(path);
    initPageHandlers(path, routeParams);
  } catch (err) {
    document.getElementById('app').innerHTML = '<p>Page not found</p>';
    setPageClass('not-found');
  }
}

function navigate(path) {
  window.location.hash = path;
}

function getCurrentPath() {
  const hash = window.location.hash.slice(1) || '/';
  // Strip query string for routing (query params are parsed separately in page handlers)
  return hash.split('?')[0];
}

// API Helpers
async function api(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Auth
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const user = await api('/auth/me');
    currentUser = user;
    return user;
  } catch {
    localStorage.removeItem('token');
    return null;
  }
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  updateNav();
  navigate('/login');
}

// Update nav based on auth state
function updateNav() {
  const nav = document.getElementById('nav');
  if (currentUser) {
    nav.innerHTML = `
      <a href="#/" class="logo">H</a>
      <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false"><span class="hamburger"></span></button>
      <div class="nav-links">
        <a href="#/dashboard">Dashboard</a>
        <a href="#/blog">Blog</a>
        <a href="#/skill">For Agents</a>
        <a href="#/chat">Chat</a>
        <button onclick="logout()" class="btn-secondary">Logout</button>
      </div>
    `;
  } else {
    nav.innerHTML = `
      <a href="#/" class="logo">H</a>
      <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false"><span class="hamburger"></span></button>
      <div class="nav-links">
        <a href="#/blog">Blog</a>
        <a href="#/skill">For Agents</a>
        <a href="#/chat">Chat</a>
        <a href="#/login">Login</a>
        <a href="#/signup" class="btn-primary nav-cta">Start free</a>
      </div>
    `;
  }
  
  // Initialize mobile nav toggle
  initMobileNav();
}

// Toggle mobile navigation
function toggleMobileNav() {
  const nav = document.getElementById('nav');
  const toggle = nav.querySelector('.nav-toggle');
  const isOpen = nav.classList.toggle('nav-open');
  toggle.setAttribute('aria-expanded', isOpen);
}

// Close mobile nav when clicking a link
function closeMobileNav() {
  const nav = document.getElementById('nav');
  const toggle = nav.querySelector('.nav-toggle');
  nav.classList.remove('nav-open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

// Initialize mobile nav listeners
function initMobileNav() {
  const nav = document.getElementById('nav');
  const toggle = nav.querySelector('.nav-toggle');
  const links = nav.querySelectorAll('.nav-links a');
  
  if (toggle) {
    toggle.addEventListener('click', toggleMobileNav);
  }
  
  // Close menu when clicking a link
  links.forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileNav();
  });
  
  // Event delegation for data-action buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    const appId = target.dataset.appId;
    
    switch (action) {
      case 'delete-app':
        if (appId) deleteApp(appId);
        break;
      case 'edit-app':
        if (appId) editApp(appId);
        break;
      case 'show-app-analytics':
        if (appId) showAppAnalytics(appId);
        break;
    }
  });
}

// Page-specific handlers
function initPageHandlers(path, routeParams = {}) {
  switch (path) {
    case '/login':
      setupLoginForm();
      break;
    case '/signup':
      setupSignupForm();
      break;
    case '/forgot-password':
      setupForgotPasswordForm();
      break;
    case '/reset-password':
      setupResetPasswordForm();
      break;
    case '/dashboard':
      loadDashboard();
      // Initialize tab switching
      initDashboardTabs();
      break;
    case '/apps':
      // Redirect to dashboard apps tab for backward compatibility
      navigate('/dashboard?tab=apps');
      break;
    case '/keys':
      // Redirect to dashboard keys tab for backward compatibility
      navigate('/dashboard?tab=keys');
      break;
    case '/domains':
      // Redirect to dashboard settings tab (domains feature now in settings)
      navigate('/dashboard?tab=settings');
      showToast('Domain management is now in Settings', 'success');
      break;
    case '/waitlist':
      setupWaitlistForm();
      break;
    case '/chat':
      initChat();
      break;
    case '/blog':
      loadBlog();
      break;
    default:
      // Check for dynamic blog route
      if (routeParams.slug) {
        loadPost(routeParams.slug);
      }
      break;
  }
}

// Login form
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password')
        })
      });
      
      localStorage.setItem('token', result.token);
      currentUser = result.user;
      updateNav();
      navigate('/dashboard');
    } catch (err) {
      showError(err.message);
    }
  });
}

// Signup form
function setupSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      const result = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
          name: formData.get('name')
        })
      });
      
      localStorage.setItem('token', result.token);
      currentUser = result.user;
      updateNav();
      navigate('/dashboard');
    } catch (err) {
      showError(err.message);
    }
  });
}

// Forgot password form
function setupForgotPasswordForm() {
  const form = document.getElementById('forgot-password-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const submitBtn = document.getElementById('submit-btn');
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email')
        })
      });
      
      // Show success message
      const container = document.querySelector('.hero').parentElement || document.getElementById('app');
      container.innerHTML = `
        <div class="hero">
          <h1>Check Your Email</h1>
          <p>If an account with that email exists, you'll receive a password reset link shortly.</p>
        </div>
        <p style="text-align: center; margin-top: 1rem;">
          <a href="#/login">Back to Login</a>
        </p>
      `;
    } catch (err) {
      // Still show success for security (don't reveal if email exists)
      const container = document.querySelector('.hero').parentElement || document.getElementById('app');
      container.innerHTML = `
        <div class="hero">
          <h1>Check Your Email</h1>
          <p>If an account with that email exists, you'll receive a password reset link shortly.</p>
        </div>
        <p style="text-align: center; margin-top: 1rem;">
          <a href="#/login">Back to Login</a>
        </p>
      `;
    }
  });
}

// Reset password form
function setupResetPasswordForm() {
  const form = document.getElementById('reset-password-form');
  if (!form) return;
  
  // Get token from URL - check both hash (SPA routing) and search (direct URL access)
  let token = null;
  
  // First check hash (for SPA navigation: #/reset-password?token=xyz)
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  token = hashParams.get('token');
  
  // If not in hash, check search query (for direct access: /reset-password?token=xyz)
  if (!token) {
    const searchParams = new URLSearchParams(window.location.search);
    token = searchParams.get('token');
  }
  
  if (!token) {
    // No token, show error
    const container = document.querySelector('.hero');
    if (container) {
      container.innerHTML = `
        <h1>Invalid Link</h1>
        <p>This password reset link is invalid. Please request a new one.</p>
      `;
    }
    // Hide the form
    form.style.display = 'none';
    return;
  }
  
  // Hide form until we validate the token
  form.style.display = 'none';
  
  // Show loading state
  const heroSection = document.querySelector('.hero');
  const loadingIndicator = document.createElement('p');
  loadingIndicator.id = 'token-validation-loading';
  loadingIndicator.textContent = 'Validating reset link...';
  loadingIndicator.style.textAlign = 'center';
  if (heroSection && heroSection.nextSibling) {
    heroSection.parentNode.insertBefore(loadingIndicator, heroSection.nextSibling);
  } else if (heroSection) {
    heroSection.appendChild(loadingIndicator);
  }
  
  // Validate token with backend
  api('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token })
  })
    .then(result => {
      // Remove loading indicator
      const loading = document.getElementById('token-validation-loading');
      if (loading) loading.remove();
      
      if (result.valid) {
        // Token is valid, show the form
        form.style.display = 'block';
        const tokenInput = document.getElementById('token');
        if (tokenInput) {
          tokenInput.value = token;
        }
      }
    })
    .catch(err => {
      // Remove loading indicator
      const loading = document.getElementById('token-validation-loading');
      if (loading) loading.remove();
      
      // Token is invalid, show error
      const container = document.querySelector('.hero');
      if (container) {
        container.innerHTML = `
          <h1>Invalid or Expired Link</h1>
          <p>This password reset link is invalid or has expired. Please request a new one.</p>
        `;
      }
      // Keep form hidden
    });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm-password');
    const submitBtn = document.getElementById('submit-btn');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    // Validate password length
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';
    
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: formData.get('token'),
          password: password
        })
      });
      
      // Show success message
      const container = document.querySelector('.hero').parentElement || document.getElementById('app');
      container.innerHTML = `
        <div class="hero">
          <h1>Password Reset</h1>
          <p>Your password has been reset successfully. You can now log in with your new password.</p>
        </div>
        <p style="text-align: center; margin-top: 1rem;">
          <a href="#/login" class="btn-primary">Login</a>
        </p>
      `;
      
      showToast('Password reset successfully!', 'success');
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset Password';
      showToast(err.message || 'Failed to reset password', 'error');
    }
  });
}

// Waitlist form
function setupWaitlistForm() {
  const form = document.getElementById('waitlist-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      const result = await api('/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          name: formData.get('name'),
          whatBuilding: formData.get('project'),
          projectLink: formData.get('link'),
          apisUsed: formData.get('apis'),
          referredBy: formData.get('referral')
        })
      });
      
      document.getElementById('waitlist-result').innerHTML = `
        <div class="success">
          <h3>You're #${result.position} in line!</h3>
          <p>Share your referral link to move up:</p>
          <code>${window.location.origin}?ref=${result.referralCode}</code>
        </div>
      `;
    } catch (err) {
      showError(err.message);
    }
  });
}

// Dashboard
async function loadDashboard() {
  if (!currentUser) {
    navigate('/login');
    return;
  }

  try {
    const stats = await api('/dashboard/stats');
    document.getElementById('stat-apps').textContent = stats.appCount || 0;
    document.getElementById('stat-secrets').textContent = stats.keysConfigured || 0;
    document.getElementById('stat-calls').textContent = stats.requestCount || 0;

    // Load API token
    await loadApiToken();

    // Load settings
    await loadSettings();

    // Initialize tabs and load apps (apps is default active tab)
    if (typeof initTabs === 'function') {
      initTabs();
    }
    loadApps();
  } catch (err) {
    document.getElementById('stats').innerHTML = '<p>Failed to load stats</p>';
  }
}

async function loadSettings() {
  const checkbox = document.getElementById('onhyper-api-enabled');
  if (!checkbox) return;
  
  try {
    const result = await api('/settings');
    checkbox.checked = result.onhyper_api_enabled || false;
    
    // Add event listener
    checkbox.addEventListener('change', toggleOnhyperApi);
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  
  // Load activity
  loadActivity();
}

// Activity state
let activityOffset = 0;
let activityHasMore = false;

async function loadActivity() {
  const container = document.getElementById('activity-list');
  if (!container) return;
  
  activityOffset = 0;
  
  try {
    const result = await api('/audit-logs?limit=20&offset=0');
    
    if (!result.logs || result.logs.length === 0) {
      container.innerHTML = '<p class="text-muted">No recent activity</p>';
      document.getElementById('load-more-activity').style.display = 'none';
      return;
    }
    
    activityOffset = result.logs.length;
    activityHasMore = result.logs.length >= 20;
    
    container.innerHTML = renderActivityLogs(result.logs);
    document.getElementById('load-more-activity').style.display = activityHasMore ? 'inline-block' : 'none';
  } catch (err) {
    console.error('Failed to load activity:', err);
    container.innerHTML = '<p class="text-muted">Failed to load activity</p>';
  }
}

async function loadMoreActivity() {
  const container = document.getElementById('activity-list');
  const btn = document.getElementById('load-more-activity');
  if (!container || !btn) return;
  
  btn.textContent = 'Loading...';
  btn.disabled = true;
  
  try {
    const result = await api(`/audit-logs?limit=20&offset=${activityOffset}`);
    
    if (result.logs && result.logs.length > 0) {
      activityOffset += result.logs.length;
      activityHasMore = result.logs.length >= 20;
      
      container.insertAdjacentHTML('beforeend', renderActivityLogs(result.logs));
    } else {
      activityHasMore = false;
    }
    
    btn.style.display = activityHasMore ? 'inline-block' : 'none';
    btn.textContent = 'Load More';
    btn.disabled = false;
  } catch (err) {
    console.error('Failed to load more activity:', err);
    btn.textContent = 'Load More';
    btn.disabled = false;
  }
}

function renderActivityLogs(logs) {
  const actionLabels = {
    'login': 'Logged in',
    'logout': 'Logged out',
    'password_change': 'Changed password',
    'password_reset_request': 'Requested password reset',
    'password_reset_complete': 'Reset password',
    'account_delete': 'Deleted account',
    'app_create': 'Created app',
    'app_update': 'Updated app',
    'app_delete': 'Deleted app',
    'app_published': 'Published app',
    'secret_create': 'Added API key',
    'secret_update': 'Updated API key',
    'secret_delete': 'Deleted API key',
  };
  
  const actionIcons = {
    'login': '🔑',
    'logout': '🚪',
    'password_change': '🔐',
    'password_reset_request': '📧',
    'password_reset_complete': '🔓',
    'account_delete': '🗑️',
    'app_create': '✨',
    'app_update': '✏️',
    'app_delete': '❌',
    'app_published': '🚀',
    'secret_create': '🔐',
    'secret_update': '🔐',
    'secret_delete': '🔓',
  };
  
  function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  
  return '<table class="activity-table">' +
    logs.map(log => `
      <tr>
        <td class="activity-icon">${actionIcons[log.action] || '📋'}</td>
        <td class="activity-action">${actionLabels[log.action] || log.action}</td>
        <td class="activity-time">${formatRelativeTime(log.created_at)}</td>
      </tr>
    `).join('') +
    '</table>';
}

// Activity Timeline (dedicated tab)
let activityTimelineOffset = 0;
let activityTimelineHasMore = false;
let activityTimelineFilter = { action: '', since: '' };

async function loadActivityTimeline() {
  const container = document.getElementById('activity-timeline');
  if (!container) return;
  
  activityTimelineOffset = 0;
  activityTimelineFilter.action = document.getElementById('activity-action-filter')?.value || '';
  activityTimelineFilter.since = document.getElementById('activity-date-filter')?.value || '';
  
  const params = new URLSearchParams();
  params.set('limit', '20');
  params.set('offset', '0');
  if (activityTimelineFilter.action) params.set('action', activityTimelineFilter.action);
  if (activityTimelineFilter.since) params.set('since', activityTimelineFilter.since);
  
  try {
    const result = await api(`/audit-logs?${params}`);
    
    if (!result.logs || result.logs.length === 0) {
      container.innerHTML = '<p class="text-muted">No activity found</p>';
      document.getElementById('load-more-activity-timeline').style.display = 'none';
      return;
    }
    
    activityTimelineOffset = result.logs.length;
    activityTimelineHasMore = result.logs.length >= 20;
    
    container.innerHTML = renderActivityTimeline(result.logs);
    document.getElementById('load-more-activity-timeline').style.display = activityTimelineHasMore ? 'inline-block' : 'none';
  } catch (err) {
    console.error('Failed to load activity timeline:', err);
    container.innerHTML = '<p class="text-muted">Failed to load activity</p>';
  }
}

async function loadMoreActivityTimeline() {
  const container = document.getElementById('activity-timeline');
  const btn = document.getElementById('load-more-activity-timeline');
  if (!container || !btn) return;
  
  btn.textContent = 'Loading...';
  btn.disabled = true;
  
  const params = new URLSearchParams();
  params.set('limit', '20');
  params.set('offset', activityTimelineOffset.toString());
  if (activityTimelineFilter.action) params.set('action', activityTimelineFilter.action);
  if (activityTimelineFilter.since) params.set('since', activityTimelineFilter.since);
  
  try {
    const result = await api(`/audit-logs?${params}`);
    
    if (result.logs && result.logs.length > 0) {
      activityTimelineOffset += result.logs.length;
      activityTimelineHasMore = result.logs.length >= 20;
      
      container.insertAdjacentHTML('beforeend', renderActivityTimeline(result.logs));
    } else {
      activityTimelineHasMore = false;
    }
    
    btn.style.display = activityTimelineHasMore ? 'inline-block' : 'none';
    btn.textContent = 'Load More';
    btn.disabled = false;
  } catch (err) {
    console.error('Failed to load more activity:', err);
    btn.textContent = 'Load More';
    btn.disabled = false;
  }
}

function filterActivity() {
  loadActivityTimeline();
}

function renderActivityTimeline(logs) {
  const actionLabels = {
    'login': 'Logged in',
    'logout': 'Logged out',
    'password_change': 'Changed password',
    'password_reset_request': 'Requested password reset',
    'password_reset_complete': 'Reset password',
    'account_delete': 'Deleted account',
    'app_create': 'Created app',
    'app_update': 'Updated app',
    'app_delete': 'Deleted app',
    'app_published': 'Published app',
    'secret_create': 'Added API key',
    'secret_update': 'Updated API key',
    'secret_delete': 'Deleted API key',
  };
  
  const actionIcons = {
    'login': '🔑',
    'logout': '🚪',
    'password_change': '🔐',
    'password_reset_request': '📧',
    'password_reset_complete': '🔓',
    'account_delete': '🗑️',
    'app_create': '✨',
    'app_update': '✏️',
    'app_delete': '❌',
    'app_published': '🚀',
    'secret_create': '🔐',
    'secret_update': '🔐',
    'secret_delete': '🔓',
  };
  
  function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  
  return '<div class="timeline">' +
    logs.map(log => `
      <div class="timeline-item">
        <div class="timeline-icon">${actionIcons[log.action] || '📋'}</div>
        <div class="timeline-content">
          <div class="timeline-action">${actionLabels[log.action] || log.action}</div>
          <div class="timeline-time">${formatRelativeTime(log.created_at)}</div>
          ${log.details ? `<div class="timeline-details">${JSON.stringify(log.details)}</div>` : ''}
        </div>
      </div>
    `).join('') +
    '</div>';
}

async function toggleOnhyperApi(event) {
  const checkbox = event.target;
  const enabled = checkbox.checked;
  
  try {
    await api('/settings', {
      method: 'PUT',
      body: JSON.stringify({ onhyper_api_enabled: enabled })
    });
    showToast(enabled ? 'OnHyper API access enabled' : 'OnHyper API access disabled', 'success');
  } catch (err) {
    // Revert on error
    checkbox.checked = !enabled;
    showToast('Failed to update setting: ' + err.message, 'error');
  }
}

async function loadApiToken() {
  const tokenEl = document.getElementById('api-token');
  const generateBtn = document.getElementById('generate-token-btn');
  
  try {
    const result = await api('/dashboard/api-keys');
    
    if (result.keys && result.keys.length > 0) {
      // Show the most recent key
      const latestKey = result.keys[result.keys.length - 1];
      tokenEl.textContent = latestKey.fullKey;
      tokenEl.dataset.key = latestKey.fullKey;
      generateBtn.style.display = 'inline-block';
    } else {
      tokenEl.textContent = 'No API token yet';
      generateBtn.textContent = 'Generate API Token';
      generateBtn.style.display = 'inline-block';
    }
  } catch (err) {
    tokenEl.textContent = 'Failed to load token';
  }
}

async function generateApiToken() {
  const tokenEl = document.getElementById('api-token');
  const generateBtn = document.getElementById('generate-token-btn');
  
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';
  
  try {
    const result = await api('/dashboard/api-keys', { method: 'POST' });
    tokenEl.textContent = result.key;
    tokenEl.dataset.key = result.key;
    generateBtn.textContent = 'Generate New Token';
    generateBtn.disabled = false;
    
    showToast('API token generated! Copy it now.', 'success');
  } catch (err) {
    generateBtn.textContent = 'Generate API Token';
    generateBtn.disabled = false;
    showToast('Failed to generate token: ' + err.message, 'error');
  }
}

function copyApiToken() {
  const tokenEl = document.getElementById('api-token');
  const key = tokenEl.dataset.key || tokenEl.textContent;
  
  if (!key || key === 'No API token yet' || key === 'Loading...' || key === 'Failed to load token') {
    showToast('No token to copy', 'error');
    return;
  }
  
  navigator.clipboard.writeText(key).then(() => {
    showToast('Token copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy token', 'error');
  });
}

// Apps
async function loadApps() {
  if (!currentUser) {
    navigate('/login');
    return;
  }

  try {
    // Load apps (required)
    const response = await api('/apps');
    const apps = response.apps || [];
    
    // Load analytics (optional - gracefully handle failure)
    let analyticsData = [];
    try {
      const analyticsResponse = await api('/apps/analytics?days=30');
      analyticsData = analyticsResponse.apps || [];
    } catch (analyticsError) {
      console.warn('Analytics unavailable:', analyticsError.message);
      // Continue without analytics - apps still show
    }
    
    // Create a map of app analytics for quick lookup
    const analyticsMap = new Map(analyticsData.map(a => [a.id, a]));
    
    // Support both tab context (#tab-apps #app-list) and standalone page (#app-list)
    let list = document.querySelector('#tab-apps #app-list') || document.getElementById('app-list');

    if (apps.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🚀</div>
          <h3>Create Your First App</h3>
          <p>Build web apps that securely call AI APIs. Your code runs in the browser, your keys stay safe on our servers.</p>
          <button onclick="showCreateAppModal()" class="btn-primary btn-large">
            <span>Get Started</span>
          </button>
          <div class="empty-state-hint">
            <span>💡</span> Try the <a href="#/skill">For Agents</a> page to see how AI can build apps for you
          </div>
        </div>
      `;
      // Don't call initSubdomainSection() for empty state
      return;
    } else {
      list.innerHTML = `
        <div class="app-grid">
          ${apps.map(app => {
            const stats = analyticsMap.get(app.id) || { views: 0, apiCalls: 0, errors: 0 };
            return `
            <div class="app-card">
              <div class="app-card-header">
                <div class="app-icon">📄</div>
                <div>
                  <h3 class="app-card-title">${escapeHtml(app.name)}</h3>
                  <span class="app-status app-status--active">Active</span>
                </div>
              </div>
              <p class="app-card-meta">
                <a href="https://onhyper.io/a/${app.slug}" target="_blank">onhyper.io/a/${app.slug}</a>
              </p>
              <div class="app-card-stats">
                <div class="app-stat">
                  <span class="stat-icon">👁</span>
                  <span class="stat-value">${formatNumber(stats.views)}</span>
                  <span class="stat-label">views</span>
                </div>
                <div class="app-stat">
                  <span class="stat-icon">⚡</span>
                  <span class="stat-value">${formatNumber(stats.apiCalls)}</span>
                  <span class="stat-label">calls</span>
                </div>
                ${stats.errors > 0 ? `
                <div class="app-stat app-stat--error">
                  <span class="stat-icon">⚠️</span>
                  <span class="stat-value">${formatNumber(stats.errors)}</span>
                  <span class="stat-label">errors</span>
                </div>
                ` : ''}
              </div>
              <div class="app-card-actions">
                <button data-action="edit-app" data-app-id="${app.id}" class="btn-secondary">Edit</button>
                <button data-action="show-app-analytics" data-app-id="${app.id}" class="btn-secondary">Stats</button>
                <button data-action="delete-app" data-app-id="${app.id}" class="btn-danger">Delete</button>
              </div>
            </div>
          `}).join('')}
          <div class="app-card app-card--new" onclick="showCreateAppModal()">
            <div class="app-card-new-content">
              <span class="app-card-new-icon">+</span>
              <span>Create New App</span>
            </div>
          </div>
        </div>
      `;
    }

    // Initialize subdomain functionality
    initSubdomainSection();
  } catch (err) {
    showError(err.message);
  }
}

// Format numbers nicely (1234 → 1.2K)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Show detailed analytics for an app
async function showAppAnalytics(appId) {
  try {
    const [appResponse, analytics] = await Promise.all([
      api('/apps/' + appId),
      api('/apps/' + appId + '/analytics?days=30')
    ]);
    const app = appResponse;
    
    const modalContent = `
      <div class="analytics-modal">
        <div class="analytics-header">
          <h3>${escapeHtml(app.name)}</h3>
          <div class="analytics-period">Last 30 days</div>
        </div>
        
        <div class="analytics-overview">
          <div class="analytics-stat">
            <div class="stat-big">${formatNumber(analytics.totalViews)}</div>
            <div class="stat-label">Total Views</div>
          </div>
          <div class="analytics-stat">
            <div class="stat-big">${formatNumber(analytics.totalApiCalls)}</div>
            <div class="stat-label">API Calls</div>
          </div>
          <div class="analytics-stat ${analytics.totalErrors > 0 ? 'analytics-stat--warning' : ''}">
            <div class="stat-big">${formatNumber(analytics.totalErrors)}</div>
            <div class="stat-label">Errors</div>
          </div>
          <div class="analytics-stat">
            <div class="stat-big">${analytics.avgDuration}ms</div>
            <div class="stat-label">Avg Duration</div>
          </div>
        </div>
        
        ${analytics.topEndpoints.length > 0 ? `
        <div class="analytics-section">
          <h4>Top Endpoints</h4>
          <div class="endpoint-list">
            ${analytics.topEndpoints.map(ep => `
              <div class="endpoint-item">
                <code>${escapeHtml(ep.endpoint)}</code>
                <span class="endpoint-count">${formatNumber(ep.count)} calls</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        ${analytics.dailyStats.length > 0 ? `
        <div class="analytics-section">
          <h4>Daily Activity</h4>
          <div class="daily-chart">
            ${analytics.dailyStats.slice(0, 14).reverse().map(day => `
              <div class="daily-bar" style="--views: ${Math.min(day.views / (analytics.totalViews || 1) * 100, 100)}%; --calls: ${Math.min(day.apiCalls / (analytics.totalApiCalls || 1) * 100, 100)}%;">
                <div class="bar-label">${formatDateShort(day.date)}</div>
                <div class="bars">
                  <div class="bar bar--views" title="${day.views} views"></div>
                  <div class="bar bar--calls" title="${day.apiCalls} calls"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div class="analytics-url">
          <a href="https://onhyper.io/a/${app.slug}" target="_blank">onhyper.io/a/${app.slug}</a>
        </div>
      </div>
      <style>
        .analytics-modal {}
        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .analytics-header h3 {
          margin: 0;
        }
        .analytics-period {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .analytics-overview {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .analytics-stat {
          text-align: center;
          padding: 16px;
          background: var(--bg-alt);
          border-radius: 8px;
        }
        .analytics-stat--warning {
          background: #fef3c7;
        }
        .stat-big {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .analytics-stat--warning .stat-big {
          color: #d97706;
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .analytics-section {
          margin-bottom: 20px;
        }
        .analytics-section h4 {
          margin: 0 0 12px 0;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .endpoint-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .endpoint-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-alt);
          border-radius: 6px;
        }
        .endpoint-item code {
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .endpoint-count {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .daily-chart {
          display: flex;
          gap: 4px;
          height: 60px;
          align-items: flex-end;
        }
        .daily-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bar-label {
          font-size: 0.6rem;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .bars {
          display: flex;
          gap: 2px;
          width: 100%;
          height: 40px;
          align-items: flex-end;
        }
        .bar {
          flex: 1;
          border-radius: 2px 2px 0 0;
          min-height: 2px;
        }
        .bar--views {
          background: #10b981;
          height: calc(var(--views, 0) * 0.4);
        }
        .bar--calls {
          background: #3b82f6;
          height: calc(var(--calls, 0) * 0.4);
        }
        .analytics-url {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }
        .analytics-url a {
          color: var(--accent-color);
        }
        @media (max-width: 500px) {
          .analytics-overview {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      </style>
    `;
    showModal('App Analytics', modalContent);
  } catch (err) {
    showToast('Failed to load analytics: ' + err.message, 'error');
  }
}

// Format date short (2024-01-15 → Jan 15)
function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

// Create app modal
function showCreateAppModal() {
  const modalContent = `
    <form id="modal-app-form" onsubmit="createAppFromModal(event)">
      <div class="form-group">
        <label for="modal-app-name">App Name</label>
        <input type="text" id="modal-app-name" name="name" required placeholder="My Awesome App">
      </div>
      <div class="form-group">
        <label for="modal-app-slug">Slug (URL path)</label>
        <div class="slug-preview">
          <span class="slug-prefix">onhyper.io/a/</span>
          <input type="text" id="modal-app-slug" name="slug" required pattern="[a-z0-9-]+" placeholder="my-app">
        </div>
      </div>
      <div class="agent-notice">
        <strong>🤖 Agents:</strong> Read the skill docs at <a href="https://markdown.new/https://onhyper.io/pages/skill.html" target="_blank">markdown.new/.../skill.html</a>
      </div>
      <div class="modal-actions">
        <button type="button" onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button type="submit" class="btn-primary">Create App</button>
      </div>
      <p class="form-hint">After creating, use the Edit button to add your HTML, CSS, and JavaScript code.</p>
    </form>
    <style>
      .slug-preview {
        display: flex;
        align-items: center;
        gap: 0;
        background: var(--bg-alt);
        border-radius: 8px;
        overflow: hidden;
      }
      .slug-preview input {
        border: none;
        border-radius: 0;
        flex: 1;
        background: transparent;
      }
      .slug-prefix {
        color: var(--text-muted);
        font-size: 0.9em;
        padding: 0 12px;
      }
      .agent-notice {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        border: 1px solid #4f46e5;
        border-radius: 8px;
        padding: 12px 16px;
        margin: 16px 0;
        font-size: 0.9rem;
        color: #e0e7ff;
      }
      .agent-notice a {
        color: #a5b4fc;
        text-decoration: underline;
      }
      .agent-notice a:hover {
        color: #c7d2fe;
      }
      .form-hint {
        text-align: center;
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-top: 12px;
      }
    </style>
  `;
  showModal('Create New App', modalContent);
  
  // Auto-generate slug from name
  const nameInput = document.getElementById('modal-app-name');
  const slugInput = document.getElementById('modal-app-slug');
  nameInput.addEventListener('input', () => {
    slugInput.value = nameInput.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  });
}

async function createAppFromModal(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    const app = await api('/apps', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: '',
        html: '',
        css: '',
        js: ''
      })
    });
    
    closeModal();
    loadApps();
    showToast('App created! Click Edit to add your code.', 'success');
  } catch (err) {
    showToast('Failed to create app: ' + err.message, 'error');
  }
}

async function editApp(appId) {
  try {
    const response = await api('/apps');
    const app = response.apps.find(a => a.id === appId);
    if (!app) throw new Error('App not found');
    
    const modalContent = `
      <form id="modal-app-form" onsubmit="updateAppFromModal(event, '${appId}')">
        <div class="form-group">
          <label for="modal-app-name">App Name</label>
          <input type="text" id="modal-app-name" name="name" value="${escapeHtml(app.name)}" required>
        </div>
        <div class="form-group">
          <label for="modal-app-slug">Slug (URL path)</label>
          <input type="text" id="modal-app-slug" name="slug" value="${app.slug}" required pattern="[a-z0-9-]+" readonly>
        </div>
        <div class="form-group">
          <label for="modal-app-description">Description</label>
          <textarea id="modal-app-description" name="description" rows="2">${escapeHtml(app.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="modal-app-html">HTML</label>
          <textarea id="modal-app-html" name="html" rows="5">${escapeHtml(app.html || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="modal-app-css">CSS</label>
          <textarea id="modal-app-css" name="css" rows="3">${escapeHtml(app.css || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="modal-app-js">JavaScript</label>
          <textarea id="modal-app-js" name="js" rows="5">${escapeHtml(app.js || '')}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" onclick="closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    `;
    showModal('Edit App', modalContent);
  } catch (err) {
    showToast('Failed to load app: ' + err.message, 'error');
  }
}

async function updateAppFromModal(e, appId) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    await api('/apps/' + appId, {
      method: 'PUT',
      body: JSON.stringify({
        name: formData.get('name'),
        description: formData.get('description'),
        html: formData.get('html'),
        css: formData.get('css'),
        js: formData.get('js')
      })
    });
    
    closeModal();
    loadApps();
    showToast('App updated successfully!', 'success');
  } catch (err) {
    showToast('Failed to update app: ' + err.message, 'error');
  }
}

// Subdomain functionality
let currentSubdomain = null;

async function initSubdomainSection() {
  const subdomainInput = document.getElementById('subdomain-input');
  const checkBtn = document.getElementById('check-subdomain');
  const statusSpan = document.getElementById('subdomain-status');
  const previewUrl = document.getElementById('subdomain-preview-url');
  
  if (!subdomainInput || !checkBtn) return;
  
  // Load user's existing subdomains
  try {
    const result = await api('/subdomains/mine');
    if (result.subdomains && result.subdomains.length > 0) {
      currentSubdomain = result.subdomains[0];
      subdomainInput.value = currentSubdomain;
      updateSubdomainPreview(currentSubdomain);
      // Show as already claimed (editable but already owned)
      statusSpan.className = 'subdomain-status success';
      statusSpan.textContent = '✓ Your subdomain';
    }
  } catch (err) {
    // User has no subdomains yet - that's fine
    console.log('No subdomains found for user');
  }
  
  // Check button click handler
  checkBtn.addEventListener('click', checkSubdomainAvailability);
  
  // Live preview on input
  subdomainInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    e.target.value = value;
    updateSubdomainPreview(value);
    // Clear status when input changes
    statusSpan.className = 'subdomain-status';
    statusSpan.textContent = '';
  });
  
  // Initial preview
  updateSubdomainPreview('');
}

function updateSubdomainPreview(subdomain) {
  const previewUrl = document.getElementById('subdomain-preview-url');
  if (previewUrl) {
    const domain = subdomain || '__';
    previewUrl.textContent = `${domain}.onhyper.io`;
  }
}

async function checkSubdomainAvailability() {
  const subdomainInput = document.getElementById('subdomain-input');
  const statusSpan = document.getElementById('subdomain-status');
  const name = subdomainInput.value.trim().toLowerCase();
  
  if (!name) {
    statusSpan.className = 'subdomain-status error';
    statusSpan.textContent = 'Enter a subdomain name';
    return;
  }
  
  if (name.length < 3) {
    statusSpan.className = 'subdomain-status error';
    statusSpan.textContent = '✗ Must be at least 3 characters';
    return;
  }
  
  try {
    const result = await api(`/subdomains/check?name=${encodeURIComponent(name)}`);
    
    if (result.available) {
      statusSpan.className = 'subdomain-status success';
      statusSpan.textContent = '✓ Available!';
      currentSubdomain = name;
    } else {
      statusSpan.className = 'subdomain-status error';
      statusSpan.textContent = `✗ ${result.message}`;
    }
  } catch (err) {
    statusSpan.className = 'subdomain-status error';
    statusSpan.textContent = `✗ ${err.message}`;
  }
}

async function claimSubdomain(name) {
  if (!name) return { success: true }; // No subdomain to claim
  
  try {
    const result = await api('/subdomains/claim', {
      method: 'POST',
      body: JSON.stringify({ subdomain: name })
    });
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Delete app
async function deleteApp(id) {
  if (!confirm('Delete this app?')) return;
  
  try {
    await api(`/apps/${id}`, { method: 'DELETE' });
    loadApps();
  } catch (err) {
    showError(err.message);
  }
}

// Keys
async function loadKeys() {
  if (!currentUser) {
    navigate('/login');
    return;
  }
  
  try {
    const response = await api('/secrets');
    const secrets = response.secrets || [];
    const list = document.getElementById('key-list');
    
    if (secrets.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔐</div>
          <h3>Add Your First API Key</h3>
          <p>Store your API keys securely. They're encrypted and never exposed to browsers.</p>
          <div class="empty-state-providers">
            <span class="provider-badge" style="--provider-color: #10a37f;">🤖 OpenAI</span>
            <span class="provider-badge" style="--provider-color: #d97706;">🧠 Anthropic</span>
            <span class="provider-badge" style="--provider-color: #6366f1;">🔀 OpenRouter</span>
            <span class="provider-badge" style="--provider-color: #8b5cf6;">🔭 Scout</span>
            <span class="provider-badge" style="--provider-color: #64748b;">🦙 Ollama</span>
          </div>
        </div>
      `;
      return;
    }
    
    list.innerHTML = secrets.map(secret => {
      const provider = getProviderInfo(secret.name);
      return `
        <div class="key-card" style="--provider-color: ${provider.color};">
          <div class="key-icon">${provider.icon}</div>
          <div class="key-info">
            <span class="key-name">${provider.name}</span>
            <span class="key-value">${secret.preview}</span>
          </div>
          <button onclick="deleteKey('${secret.name}')" class="btn-danger btn-small">Delete</button>
        </div>
      `;
    }).join('');
  } catch (err) {
    showError(err.message);
  }
}

// Delete key
async function deleteKey(name) {
  if (!confirm('Delete this API key?')) return;
  
  try {
    await api(`/secrets/${name}`, { method: 'DELETE' });
    loadKeys();
  } catch (err) {
    showError(err.message);
  }
}

// Add key form
async function addKey(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    await api('/secrets', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        value: formData.get('value')
      })
    });
    e.target.reset();
    loadKeys();
  } catch (err) {
    showError(err.message);
  }
}

// Custom API Keys
async function loadCustomKeys() {
  if (!currentUser) {
    navigate('/login');
    return;
  }
  
  try {
    const response = await api('/secrets/custom');
    const secrets = response.secrets || [];
    const list = document.getElementById('custom-key-list');
    
    if (secrets.length === 0) {
      list.innerHTML = `
        <p class="text-muted">No custom APIs configured. Add one to connect to any backend.</p>
      `;
      return;
    }
    
    list.innerHTML = secrets.map(secret => `
      <div class="key-card custom-key-card">
        <div class="key-icon">🔗</div>
        <div class="key-info">
          <span class="key-name">${escapeHtml(secret.name)}</span>
          <span class="key-url">${escapeHtml(secret.base_url)}</span>
          <span class="key-auth">${secret.auth_type === 'bearer' ? 'Bearer Token' : escapeHtml(secret.auth_header || 'Custom Header')}</span>
        </div>
        <div class="custom-key-actions">
          <code class="endpoint-hint">/proxy/custom/${secret.id}/</code>
          <button onclick="deleteCustomKey('${secret.id}', '${escapeHtml(secret.name)}')" class="btn-danger btn-small">Delete</button>
        </div>
      </div>
    `).join('');
    
    // Update stats if on dashboard
    const statKeys = document.getElementById('stat-secrets');
    if (statKeys) {
      const regularKeysCount = await getRegularKeysCount();
      statKeys.textContent = regularKeysCount + secrets.length;
    }
  } catch (err) {
    const list = document.getElementById('custom-key-list');
    if (list) {
      list.innerHTML = `<p class="error">Failed to load custom APIs: ${err.message}</p>`;
    }
  }
}

async function getRegularKeysCount() {
  try {
    const response = await api('/secrets');
    return (response.secrets || []).length;
  } catch {
    return 0;
  }
}

function showAddCustomKeyModal() {
  const modalContent = `
    <form id="custom-key-form" onsubmit="createCustomKey(event)">
      <div class="form-group">
        <label for="custom-name">Name</label>
        <input type="text" id="custom-name" name="name" required placeholder="My API Backend" maxlength="64">
        <p class="form-hint">A friendly name for this API connection</p>
      </div>
      <div class="form-group">
        <label for="custom-base-url">Base URL</label>
        <input type="url" id="custom-base-url" name="base_url" required placeholder="https://api.example.com/v1">
        <p class="form-hint">The base URL of the API (e.g., https://api.example.com/v1)</p>
      </div>
      <div class="form-group">
        <label for="custom-api-key">API Key</label>
        <input type="password" id="custom-api-key" name="api_key" required placeholder="Your API key">
      </div>
      <div class="form-group">
        <label for="custom-auth-type">Authentication Type</label>
        <select id="custom-auth-type" name="auth_type" required onchange="toggleCustomAuthHeader()">
          <option value="bearer">Bearer Token (Authorization: Bearer &lt;key&gt;)</option>
          <option value="custom">Custom Header</option>
        </select>
      </div>
      <div class="form-group" id="custom-auth-header-group" style="display: none;">
        <label for="custom-auth-header">Header Name</label>
        <input type="text" id="custom-auth-header" name="auth_header" placeholder="X-API-Key">
        <p class="form-hint">The header name to use (e.g., X-API-Key, X-Auth-Token)</p>
      </div>
      <div class="modal-actions">
        <button type="button" onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button type="submit" class="btn-primary">Add Custom API</button>
      </div>
    </form>
    <style>
      .form-hint {
        font-size: 0.85rem;
        color: var(--text-muted);
        margin-top: 4px;
      }
    </style>
  `;
  showModal('Add Custom API Backend', modalContent);
}

function toggleCustomAuthHeader() {
  const authType = document.getElementById('custom-auth-type').value;
  const headerGroup = document.getElementById('custom-auth-header-group');
  headerGroup.style.display = authType === 'custom' ? 'block' : 'none';
}

async function createCustomKey(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const authType = formData.get('auth_type');
  const authHeader = formData.get('auth_header');
  
  if (authType === 'custom' && !authHeader) {
    showToast('Header name is required for custom auth type', 'error');
    return;
  }
  
  try {
    const result = await api('/secrets/custom', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        base_url: formData.get('base_url'),
        api_key: formData.get('api_key'),
        auth_type: authType,
        auth_header: authType === 'custom' ? authHeader : null
      })
    });
    
    closeModal();
    loadCustomKeys();
    showToast(`Custom API "${formData.get('name')}" created! Use /proxy/custom/${result.id}/...`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCustomKey(id, name) {
  if (!confirm(`Delete custom API "${name}"?`)) return;
  
  try {
    await api(`/secrets/custom/${id}`, { method: 'DELETE' });
    loadCustomKeys();
    showToast('Custom API deleted', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Blog
async function loadBlog() {
  try {
    const response = await fetch('/api/blog');
    const data = await response.json();
    
    const blogPosts = document.getElementById('blog-posts');
    
    if (data.posts.length === 0) {
      blogPosts.innerHTML = '<p>No posts yet. Check back soon!</p>';
      return;
    }
    
    blogPosts.innerHTML = data.posts.map(post => `
      <article class="blog-card" onclick="navigate('/blog/${post.slug}')">
        <h2>${post.title}</h2>
        <div class="post-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="author">${post.author}</span>
        </div>
        <p class="excerpt">${post.excerpt}</p>
        ${post.tags && post.tags.length ? `
          <div class="tags">
            ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </article>
    `).join('');
  } catch (err) {
    const blogPosts = document.getElementById('blog-posts');
    if (blogPosts) {
      blogPosts.innerHTML = `<p class="error">Failed to load posts: ${err.message}</p>`;
    }
  }
}

// Individual blog post
async function loadPost(slug) {
  try {
    const response = await fetch(`/api/blog/${slug}`);
    if (!response.ok) {
      throw new Error('Post not found');
    }
    
    const post = await response.json();
    
    const postContent = document.getElementById('post-content');
    postContent.innerHTML = `
      <h1>${post.title}</h1>
      <div class="post-meta">
        <time datetime="${post.date}">${formatDate(post.date)}</time>
        <span class="author">${post.author}</span>
      </div>
      ${post.tags && post.tags.length ? `
        <div class="tags">
          ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      ` : ''}
      <div class="post-body">${post.html}</div>
    `;
    
    // Update page title
    document.title = `${post.title} | OnHyper Blog`;
  } catch (err) {
    const postContent = document.getElementById('post-content');
    if (postContent) {
      postContent.innerHTML = `
        <h1>Post Not Found</h1>
        <p>The requested blog post could not be loaded.</p>
        <a href="#/blog" class="back-link">&larr; Back to Blog</a>
      `;
    }
  }
}

// Format date nicely
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Error display
function showError(message) {
  const existing = document.querySelector('.error');
  if (existing) existing.remove();
  
  const error = document.createElement('div');
  error.className = 'error';
  error.textContent = message;
  document.getElementById('app').prepend(error);
  
  setTimeout(() => error.remove(), 5000);
}

// Chat functionality
let chatSessionId = null;
let messageCount = 0;

function initChat() {
  // Get or create session ID
  chatSessionId = localStorage.getItem('chat_session_id');
  if (!chatSessionId) {
    chatSessionId = crypto.randomUUID();
    localStorage.setItem('chat_session_id', chatSessionId);
  }
  
  // Get message count
  messageCount = parseInt(localStorage.getItem('chat_message_count') || '0');
  
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const messages = document.getElementById('chat-messages');
  
  if (!input || !sendBtn || !messages) return;
  
  // Load history from localStorage
  loadChatHistory();
  
  // Set up event listeners
  sendBtn.addEventListener('click', sendChatMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // Focus input
  input.focus();
  
  // Check if we should show lead capture
  checkLeadCapture();
}

function loadChatHistory() {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  
  const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
  
  if (history.length === 0) {
    // Show welcome message
    addChatMessage('assistant', 'Hello! I\'m the OnHyper support assistant. How can I help you today?');
    saveChatHistory();
    return;
  }
  
  // Render history
  history.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    div.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
    messages.appendChild(div);
  });
  
  // Scroll to bottom
  messages.scrollTop = messages.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  
  const text = input.value.trim();
  if (!text) return;
  
  // Add user message
  addChatMessage('user', text);
  input.value = '';
  
  // Update and save message count
  messageCount++;
  localStorage.setItem('chat_message_count', messageCount.toString());
  
  // Track message sent in PostHog
  if (window.posthog) {
    posthog.capture('chat_message_sent_client', {
      session_id: chatSessionId,
      message_count: messageCount,
      message_length: text.length
    });
  }
  
  // Show typing indicator
  showTypingIndicator();
  
  // Send to API
  fetch('/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: text, 
      session_id: chatSessionId 
    })
  })
  .then(res => {
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  })
  .then(data => {
    hideTypingIndicator();
    
    // Extract response content
    let responseText = 'Sorry, I couldn\'t process that response.';
    if (data.response && Array.isArray(data.response)) {
      const lastMsg = data.response[data.response.length - 1];
      if (lastMsg && lastMsg.content) {
        responseText = lastMsg.content;
      }
    } else if (data.response) {
      responseText = data.response;
    } else if (data.message) {
      responseText = data.message;
    }
    
    addChatMessage('assistant', responseText);
    saveChatHistory();
    
    // Track response received in PostHog
    if (window.posthog) {
      posthog.capture('chat_response_received', {
        session_id: chatSessionId,
        message_count: messageCount,
        response_length: responseText.length
      });
    }
    
    // Check for lead capture
    checkLeadCapture();
  })
  .catch(err => {
    hideTypingIndicator();
    addChatMessage('error', 'Sorry, something went wrong. Please try again.');
    console.error('Chat error:', err);
  });
}

function addChatMessage(role, content) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  
  const div = document.createElement('div');
  div.className = `message ${role}`;
  
  // Render markdown for assistant messages, escape HTML for user messages
  let renderedContent;
  if (role === 'assistant' && typeof marked !== 'undefined') {
    // Configure marked for safe rendering
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    renderedContent = marked.parse(content);
  } else {
    renderedContent = escapeHtml(content);
  }
  
  div.innerHTML = `<div class="message-content">${renderedContent}</div>`;
  messages.appendChild(div);
  
  // Scroll to bottom
  messages.scrollTop = messages.scrollHeight;
}

function saveChatHistory() {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  
  const history = [];
  messages.querySelectorAll('.message').forEach(el => {
    const role = el.classList.contains('user') ? 'user' : 
                 el.classList.contains('error') ? 'error' : 'assistant';
    const content = el.querySelector('.message-content')?.textContent || '';
    if (role !== 'error') {
      history.push({ role, content });
    }
  });
  
  localStorage.setItem('chat_history', JSON.stringify(history));
}

function showTypingIndicator() {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;
  
  // Remove existing typing indicator if any
  hideTypingIndicator();
  
  const typing = document.createElement('div');
  typing.className = 'message assistant typing';
  typing.id = 'typing-indicator';
  typing.innerHTML = `
    <div class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;
}

function hideTypingIndicator() {
  const typing = document.getElementById('typing-indicator');
  if (typing) typing.remove();
}

function checkLeadCapture() {
  // Show lead capture after 3 messages and if not already captured
  if (messageCount >= 3 && !localStorage.getItem('chat_lead_captured')) {
    showLeadCaptureForm();
  }
}

function showLeadCaptureForm() {
  const existing = document.querySelector('.lead-capture');
  if (existing) return;
  
  const chatContainer = document.querySelector('.chat-container');
  if (!chatContainer) return;
  
  const leadForm = document.createElement('div');
  leadForm.className = 'lead-capture';
  leadForm.innerHTML = `
    <div class="lead-content">
      <p>Want updates? Drop your email:</p>
      <div class="lead-form">
        <input type="email" id="lead-email" placeholder="you@example.com">
        <button id="lead-submit">Send Updates</button>
      </div>
    </div>
  `;
  
  chatContainer.appendChild(leadForm);
  
  // Set up event listeners
  const submitBtn = document.getElementById('lead-submit');
  const emailInput = document.getElementById('lead-email');
  
  submitBtn.addEventListener('click', submitLeadCapture);
  emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitLeadCapture();
  });
}

async function submitLeadCapture() {
  const emailInput = document.getElementById('lead-email');
  const email = emailInput?.value?.trim();
  
  if (!email || !email.includes('@')) {
    emailInput.style.borderColor = 'var(--error)';
    return;
  }
  
  try {
    await fetch('/api/chat/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        session_id: chatSessionId 
      })
    });
    
    localStorage.setItem('chat_lead_captured', 'true');
    
    // Track lead captured in PostHog
    if (window.posthog) {
      posthog.capture('chat_lead_captured_client', {
        session_id: chatSessionId,
        message_count: messageCount
      });
      // Identify user with email
      posthog.identify(chatSessionId, { email });
    }
    
    // Show success message
    const leadForm = document.querySelector('.lead-capture');
    if (leadForm) {
      leadForm.innerHTML = '<div class="lead-success">Thanks! We\'ll keep you updated.</div>';
      setTimeout(() => leadForm.remove(), 3000);
    }
  } catch (err) {
    console.error('Lead capture error:', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Modal management
function showModal(title, content) {
  // Remove existing modal if any
  closeModal();
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-content">${content}</div>
    </div>
  `;
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  // Focus trap (basic)
  overlay.querySelector('.modal-close').focus();
}

function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 150);
  }
  document.body.style.overflow = '';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ignore if typing in input/textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
    return;
  }
  
  // ? - Show shortcuts help
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    e.preventDefault();
    showShortcutsHelp();
    return;
  }
  
  // Escape - Close modal
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  
  // n - New app
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    if (currentUser && typeof showCreateAppModal === 'function') {
      showCreateAppModal();
    }
    return;
  }
  
  // 1, 2, 3 - Switch tabs
  if (e.key === '1') {
    e.preventDefault();
    if (typeof switchTab === 'function') switchTab('apps');
    return;
  }
  if (e.key === '2') {
    e.preventDefault();
    if (typeof switchTab === 'function') switchTab('keys');
    return;
  }
  if (e.key === '3') {
    e.preventDefault();
    if (typeof switchTab === 'function') switchTab('settings');
    return;
  }
});

// Show keyboard shortcuts help modal
function showShortcutsHelp() {
  const content = `
    <div class="shortcuts-help">
      <h3>Keyboard Shortcuts</h3>
      <div class="shortcut-list">
        <div class="shortcut">
          <kbd>n</kbd>
          <span>Create new app</span>
        </div>
        <div class="shortcut">
          <kbd>1</kbd>
          <span>Go to Apps tab</span>
        </div>
        <div class="shortcut">
          <kbd>2</kbd>
          <span>Go to Keys tab</span>
        </div>
        <div class="shortcut">
          <kbd>3</kbd>
          <span>Go to Settings tab</span>
        </div>
        <div class="shortcut">
          <kbd>?</kbd>
          <span>Show this help</span>
        </div>
        <div class="shortcut">
          <kbd>Esc</kbd>
          <span>Close modal</span>
        </div>
      </div>
    </div>
  `;
  showModal('Keyboard Shortcuts', content);
}

// Copy agent prompt to clipboard
async function copyAgentPrompt() {
  const prompt = 'Read the OnHyper skill at https://onhyper.io/pages/skill.html and ask me what kind of app I would like to build, then interview me to create a product plan';
  
  try {
    await navigator.clipboard.writeText(prompt);
    showToast('Prompt copied! Paste it to your agent.', 'success');
  } catch (err) {
    // Fallback for older browsers or permission issues
    const textArea = document.createElement('textarea');
    textArea.value = prompt;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Prompt copied! Paste it to your agent.', 'success');
    } catch (e) {
      showToast('Could not copy. Here\'s the prompt: ' + prompt, 'error');
    }
    document.body.removeChild(textArea);
  }
}

// Change password
async function changePassword(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const currentPassword = formData.get('currentPassword');
  const newPassword = formData.get('newPassword');
  const confirmPassword = formData.get('confirmPassword');
  
  // Validate passwords match
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }
  
  // Validate password length
  if (newPassword.length < 8) {
    showToast('New password must be at least 8 characters', 'error');
    return;
  }
  
  // Disable form during submission
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating...';
  
  try {
    await api('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    showToast('Password updated successfully', 'success');
    form.reset();
  } catch (err) {
    showToast(err.message || 'Failed to update password', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function showToast(message, type) {
  // Remove any existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    ${type === 'success' ? 'background: #059669; color: white;' : 'background: #dc2626; color: white;'}
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Dashboard tab switching
function switchTab(tabName) {
  // Update hash query (keep SPA routing state in hash)
  const [hashPath] = window.location.hash.slice(1).split('?');
  const nextHash = `${hashPath || '/dashboard'}?tab=${encodeURIComponent(tabName)}`;
  window.history.replaceState(null, '', `#${nextHash}`);

  // Update tab buttons
  document.querySelectorAll('.dashboard-tabs .tab').forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  // Load tab content
  if (tabName === 'keys' && typeof loadKeys === 'function') {
    loadKeys();
    loadCustomKeys();
  }
  
  // Load activity tab content
  if (tabName === 'activity' && typeof loadActivityTimeline === 'function') {
    loadActivityTimeline();
  }
}

function initDashboardTabs() {
  const hashQuery = window.location.hash.split('?')[1] || '';
  const tab = new URLSearchParams(hashQuery).get('tab');

  // Validate tab name, default to 'apps'
  const validTabs = ['apps', 'keys', 'activity', 'settings'];
  const activeTab = validTabs.includes(tab) ? tab : 'apps';

  switchTab(activeTab);

  // Add click listeners to tab buttons
  document.querySelectorAll('.dashboard-tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      if (tabName) switchTab(tabName);
    });
  });
}

// Hash change listener
window.addEventListener('hashchange', () => {
  loadPage(getCurrentPath());
});

// Init
(async function init() {
  await checkAuth();
  updateNav();
  loadPage(getCurrentPath());
})();
