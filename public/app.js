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
        <a href="#/keys">API Keys</a>
        <button onclick="logout()" class="btn-secondary">Logout</button>
      </div>
    `;
  } else {
    nav.innerHTML = `
      <a href="#/" class="logo">H</a>
      <div class="nav-links">
        <a href="#/blog">Blog</a>
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