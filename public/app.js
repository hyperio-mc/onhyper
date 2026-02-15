// OnHyper SPA - Simple client-side router + API

// State
let currentUser = null;
const API_BASE = '/api';

// Router
const routes = {
  '/': 'pages/home.html',
  '/login': 'pages/login.html',
  '/signup': 'pages/signup.html',
  '/dashboard': 'pages/dashboard.html',
  '/apps': 'pages/apps.html',
  '/keys': 'pages/keys.html',
  '/waitlist': 'pages/waitlist.html',
  '/chat': 'pages/chat.html',
  '/blog': 'pages/blog.html',
  '/blog/:slug': 'pages/post.html'
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
        <a href="#/blog">Blog</a>
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
      break;
    case '/apps':
      loadApps();
      break;
    case '/keys':
      loadKeys();
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
    document.getElementById('stats').innerHTML = `
      <div class="stat"><span>${stats.appCount || 0}</span> Apps</div>
      <div class="stat"><span>${stats.secretCount || 0}</span> API Keys</div>
      <div class="stat"><span>${stats.requestCount || 0}</span> API Calls</div>
    `;
  } catch (err) {
    document.getElementById('stats').innerHTML = '<p>Failed to load stats</p>';
  }
}

// Apps
async function loadApps() {
  if (!currentUser) {
    navigate('/login');
    return;
  }
  
  try {
    const apps = await api('/apps');
    const list = document.getElementById('app-list');
    
    if (apps.length === 0) {
      list.innerHTML = '<p>No apps yet. Create your first app!</p>';
      return;
    }
    
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
  } catch (err) {
    showError(err.message);
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
    const secrets = await api('/secrets');
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
  div.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
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