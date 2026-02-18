# Mobile Navigation Fix Plan for OnHyper

**Task ID:** task-048  
**Date:** 2026-02-18  
**Status:** Planning Complete  

---

## Current State Analysis

### Screenshot Reference
- Homepage (mobile 375px): See `/Users/mastercontrol/.openclaw/media/browser/f2bb3492-0f69-48d6-9e81-f021e7497be5.png`
- Dashboard/Login page (mobile 375px): See `/Users/mastercontrol/.openclaw/media/browser/8e007fa9-3d43-4089-b7ea-0b7f0e141e4b.png`

### Current Navigation Structure

**HTML (rendered via JavaScript in `app.js`):**
```javascript
// Logged out nav
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

// Logged in nav (has even more items!)
nav.innerHTML = `
  <a href="#/" class="logo">H</a>
  <div class="nav-links">
    <a href="#/dashboard">Dashboard</a>
    <a href="#/blog">Blog</a>
    <a href="#/skill">For Agents</a>
    <a href="#/chat">Chat</a>
    <button onclick="logout()" class="btn-secondary">Logout</button>
  </div>
`;
```

**Current CSS:**
```css
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.logo {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s;
}
```

---

## Issues Identified

### 1. **No Mobile Navigation Breakpoint**
- There is NO `@media` query specifically for the main navigation
- The only mobile nav CSS (lines 1209-1268) styles the **dashboard tabs**, not the top nav
- Links just get smaller padding at 768px but no structural change

### 2. **Link Overflow on Small Screens**
- Mobile viewport: ~375px
- Nav links: 5 items × ~60-80px each + gaps = ~350-450px needed
- Result: Links are crushed together or may overflow
- Logged-in state: 5 nav items + Logout button = 6 items (even worse)

### 3. **No Mobile Navigation Pattern**
- Missing: hamburger menu, slide-out drawer, or collapsible nav
- Missing: mobile-specific menu toggle button
- Missing: hidden menu state for small screens

### 4. **Inconsistent Mobile Styling**
- Dashboard tabs have a nice mobile bottom bar treatment
- Top navigation lacks any mobile-specific treatment
- Feels inconsistent between the two navs

### 5. **Touch Target Issues**
- Links may be too close together for comfortable touch (should be 44px min)
- No minimum touch target size defined

---

## Recommended Fix: Hamburger Menu

**Approach:** Add a hamburger menu that appears on mobile, toggling a slide-down or modal menu.

### Why Hamburger vs. Other Options:
- **Hamburger menu**: Standard pattern, users expect it
- **Bottom sheet**: Would conflict with existing dashboard bottom tabs
- **Simplified nav**: Would hide important links (Login/Signup)
- **Dropdown**: Doesn't scale well with 5-6 items

---

## Implementation Plan

### Step 1: Add Hamburger Button to Nav HTML

**File:** `/public/app.js` - Update both `updateNav()` variants

**Logged-out nav:**
```javascript
nav.innerHTML = `
  <a href="#/" class="logo">H</a>
  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
    <span class="hamburger"></span>
  </button>
  <div class="nav-links">
    <a href="#/blog">Blog</a>
    <a href="#/skill">For Agents</a>
    <a href="#/chat">Chat</a>
    <a href="#/login">Login</a>
    <a href="#/signup" class="btn-primary">Sign Up</a>
  </div>
`;
```

**Logged-in nav:**
```javascript
nav.innerHTML = `
  <a href="#/" class="logo">H</a>
  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
    <span class="hamburger"></span>
  </button>
  <div class="nav-links">
    <a href="#/dashboard">Dashboard</a>
    <a href="#/blog">Blog</a>
    <a href="#/skill">For Agents</a>
    <a href="#/chat">Chat</a>
    <button onclick="logout()" class="btn-secondary">Logout</button>
  </div>
`;
```

---

### Step 2: Add Hamburger Toggle JavaScript

**File:** `/public/app.js` - Add after `updateNav()` function

```javascript
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

// Initialize mobile nav listeners (call after updateNav)
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
}
```

Then call `initMobileNav()` at the end of `updateNav()`:

```javascript
function updateNav() {
  // ... existing innerHTML code ...
  
  // Initialize mobile nav toggle
  initMobileNav();
}
```

---

### Step 3: Add Mobile Navigation Styles

**File:** `/public/styles.css` - Add after the existing nav styles

```css
/* ============================================
   MOBILE NAVIGATION
   ============================================ */

/* Hamburger button - hidden on desktop */
.nav-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  z-index: 1001;
}

.hamburger {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--text);
  position: relative;
  transition: all 0.2s ease;
}

.hamburger::before,
.hamburger::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 2px;
  background: var(--text);
  left: 0;
  transition: all 0.2s ease;
}

.hamburger::before {
  top: -7px;
}

.hamburger::after {
  top: 7px;
}

/* Hamburger animation when open */
.nav-open .hamburger {
  background: transparent;
}

.nav-open .hamburger::before {
  top: 0;
  transform: rotate(45deg);
}

.nav-open .hamburger::after {
  top: 0;
  transform: rotate(-45deg);
}

/* Mobile breakpoint */
@media (max-width: 768px) {
  /* Show hamburger button */
  .nav-toggle {
    display: block;
  }
  
  /* Reduce nav padding on mobile */
  nav {
    padding: 0.75rem 1rem;
    position: relative;
  }
  
  /* Position nav links as dropdown */
  .nav-links {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    flex-direction: column;
    padding: 0;
    gap: 0;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }
  
  /* Open state */
  .nav-open .nav-links {
    max-height: 400px;
    padding: 1rem 0;
  }
  
  /* Style individual links */
  .nav-links a,
  .nav-links button {
    width: 100%;
    padding: 0.875rem 1.5rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
    font-size: 1rem;
  }
  
  .nav-links a:hover,
  .nav-links button:hover {
    background: var(--bg-alt);
  }
  
  .nav-links a:last-child,
  .nav-links button:last-child {
    border-bottom: none;
  }
  
  /* Style buttons in mobile menu */
  .nav-links .btn-primary,
  .nav-links .btn-secondary {
    margin: 0.5rem 1rem;
    width: calc(100% - 2rem);
    text-align: center;
    border-radius: var(--radius);
  }
}

/* Extra small screens */
@media (max-width: 480px) {
  nav {
    padding: 0.5rem 0.75rem;
  }
  
  .logo {
    font-size: 1.25rem;
  }
}
```

---

### Step 4: Ensure Body Scroll Lock (Optional Enhancement)

**Add to CSS when menu is open:**

```css
/* Prevent body scroll when mobile menu is open */
body.nav-menu-open {
  overflow: hidden;
}
```

**Add to JavaScript:**

```javascript
function toggleMobileNav() {
  const nav = document.getElementById('nav');
  const toggle = nav.querySelector('.nav-toggle');
  const isOpen = nav.classList.toggle('nav-open');
  toggle.setAttribute('aria-expanded', isOpen);
  
  // Prevent body scroll when menu is open
  document.body.classList.toggle('nav-menu-open', isOpen);
}

function closeMobileNav() {
  const nav = document.getElementById('nav');
  const toggle = nav.querySelector('.nav-toggle');
  nav.classList.remove('nav-open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-menu-open');
}
```

---

## Alternative Approaches Considered

### Option B: Simplified Mobile Nav (Less Preferred)
Keep visible links but prioritize essential ones:

```css
@media (max-width: 600px) {
  .nav-links {
    gap: 0.5rem;
  }
  
  .nav-links a:not(.nav-primary) {
    display: none;
  }
  
  /* Show only Login/Signup and maybe Dashboard */
}
```

**Rejected because:** Hides important navigation options, confusing UX.

### Option C: Bottom Sheet (Not Recommended)
Would conflict with existing dashboard bottom tabs on mobile.

---

## Files to Modify

| File | Changes |
|------|---------|
| `/public/styles.css` | Add hamburger button styles + mobile nav breakpoint (~80 lines) |
| `/public/app.js` | Update `updateNav()` function + add `toggleMobileNav()`, `closeMobileNav()`, `initMobileNav()` (~40 lines) |

---

## Testing Checklist

After implementation, verify:

- [ ] Hamburger button appears at mobile breakpoint (768px)
- [ ] Hamburger animates to X when open
- [ ] Menu slides down smoothly
- [ ] All nav links are accessible and readable
- [ ] Touch targets are 44px+ minimum
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Menu closes when clicking a link
- [ ] Menu closes when pressing Escape
- [ ] Works on both logged-in and logged-out states
- [ ] Dashboard bottom tabs don't conflict
- [ ] No horizontal scroll on mobile
- [ ] Works in Safari, Chrome, Firefox

---

## Accessibility Considerations

1. **ARIA attributes:** `aria-label`, `aria-expanded` on toggle button
2. **Keyboard:** Escape should close menu
3. **Focus management:** Move focus to first link when menu opens
4. **Screen reader:** Announce menu state (expanded/collapsed)

---

## Performance Impact

- **Minimal:** CSS-only animations (no heavy JS libraries)
- **No blocking resources:** Pure CSS hamburger
- **Accessibility-first:** ARIA and keyboard support built-in

---

## Implementation Order

1. Add CSS for hamburger button and mobile menu (styles.css)
2. Update `updateNav()` to include hamburger button (app.js)
3. Add toggle functions (app.js)
4. Test on mobile viewport
5. Test accessibility (keyboard nav, screen reader)
6. Commit changes

---

## Estimated Effort

- **CSS changes:** ~80 lines, 15-20 min
- **JavaScript changes:** ~40 lines, 15-20 min
- **Testing:** 15-20 min
- **Total:** ~45-60 minutes