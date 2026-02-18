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

// ============================================================================
// ROUTER
// ============================================================================
const routes = {
  '/': 'pages/home.html',
  '/login': 'pages/login.html',
  '/signup': 'pages/signup.html',
  '/dashboard': 'pages/dashboard.html',
  '/apps': 'pages/apps.html',
  '/keys': 'pages/dashboard.html', // Redirect handled in initPageHandlers
  '/domains': 'pages/domains.html',
  '/waitlist': 'pages/waitlist.html',
  '/chat': 'pages/chat.html',
  '/blog': 'pages/blog.html',
  '/blog/:slug': 'pages/post.html',
  '/skill': 'pages/skill.html'
};

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
    initPageHandlers(path, routeParams);
  } catch (err) {
    document.getElementById('app').innerHTML = '<p>Page not found</p>';
  }
}

function navigate(path) {
  window.location.hash = path;
}

function getCurrentPath() {
  const hash = window.location.hash.slice(1) || '/';
  return hash;
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
      <div class="nav-links">
        <a href="#/dashboard">Dashboard</a>
        <a href="#/apps">Apps</a>
        <a href="#/domains">Domains</a>
        <a href="#/blog">Blog</a>
        <a href="#/skill">For Agents</a>
        <a href="#/chat">Chat</a>
        <a href="#/keys">API Keys</a>
        <button onclick="logout()" class="btn-secondary">Logout</button>
      </div>
    `;
  } else {
    nav.innerHTML = `
      <a href="#/" class="logo">H</a>
      <div class="nav-links">
        <a href="#/blog">Blog</a>
        <a href="#/skill">For Agents</a>
        <a href="#/chat">Chat</a>
        <a href="#/login">Login</a>
        <a href="#/signup">Sign Up</a>
      </div>
    `;
  }
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
    case '/dashboard':
      loadDashboard();
      // Load tab content based on URL param
      const url = new URL(window.location.href);
      const tab = url.searchParams.get('tab');
      if (tab === 'keys') {
        loadKeys();
      }
      break;
    case '/apps':
      // Redirect to dashboard apps tab for backward compatibility
      navigate('/dashboard?tab=apps');
      break;
    case '/keys':
      // Redirect to dashboard keys tab for backward compatibility
      navigate('/dashboard?tab=keys');
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
          projectDescription: formData.get('project'),
          projectLink: formData.get('link'),
          apisUsed: formData.get('apis'),
          referralCode: formData.get('referral')
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

    // Load apps for the apps tab (it's the default active tab)
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
    const response = await api('/apps');
    const apps = response.apps || [];
    // Support both tab context (#tab-apps #app-list) and standalone page (#app-list)
    let list = document.querySelector('#tab-apps #app-list') || document.getElementById('app-list');

    if (apps.length === 0) {
      list.innerHTML = '<p>No apps yet. Create your first app!</p>';
    } else {
      list.innerHTML = apps.map(app => `
        <div class="app-card">
          <h3>${app.name}</h3>
          <p>${app.description || 'No description'}</p>
          <div class="app-actions">
            <a href="/a/${app.slug}" target="_blank">View</a>
            <button onclick="editApp('${app.id}')">Edit</button>
            <button onclick="deleteApp('${app.id}')" class="btn-danger">Delete</button>
          </div>
        </div>
      `).join('');
    }

    // Initialize subdomain functionality
    initSubdomainSection();
  } catch (err) {
    showError(err.message);
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
      list.innerHTML = '<p>No API keys stored. Add your first key!</p>';
      return;
    }
    
    list.innerHTML = secrets.map(secret => `
      <div class="key-card">
        <span class="key-name">${secret.name}</span>
        <span class="key-value">${secret.preview}</span>
        <button onclick="deleteKey('${secret.name}')" class="btn-danger">Delete</button>
      </div>
    `).join('');
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

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Copy agent prompt to clipboard
async function copyAgentPrompt() {
  const prompt = 'Read the OnHyper skill at https://onhyper.io/#/skill and help me build an app that securely calls AI APIs.';
  
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