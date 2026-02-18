# OnHyper Dashboard UX Redesign - Implementation Plan

## Overview

Transform the fragmented multi-page dashboard into a cohesive single-page experience with tabs, cards, and modal forms.

**Goal:** Reduce cognitive load and time-to-action for users managing their apps and API keys.

---

## Phase 1: Tab-Based Dashboard Foundation

**Goal:** Consolidate Apps, Keys, and Settings into the Dashboard as tabs.

### Task 1.1: Dashboard Shell with Tab Navigation
**File:** `public/pages/dashboard.html`
**Description:** Create tab container structure that can host Apps, Keys, and Settings content.

**Steps:**
1. Add tab navigation UI (Apps | API Keys | Settings)
2. Create content container that switches based on active tab
3. Preserve existing stats overview at top
4. Add CSS for active/inactive tab states

**Success Criteria:**
- [ ] Tabs visible and clickable
- [ ] Clicking tabs switches content area
- [ ] Active tab has visual indicator
- [ ] Stats still visible at top

**Dependencies:** None
**Can Parallelize:** No (foundation for other tasks)

---

### Task 1.2: Migrate Apps into Dashboard Tab
**File:** `public/pages/dashboard.html`, `public/app.js`
**Description:** Move the Apps page content into the Apps tab.

**Steps:**
1. Copy apps.html content into dashboard Apps tab
2. Update loadApps() to work within tab context
3. Remove inline createApp script, move to app.js
4. Test create/edit/delete flows work

**Success Criteria:**
- [ ] Apps list loads in Dashboard → Apps tab
- [ ] Create app form works
- [ ] Edit/delete flows work
- [ ] No functionality lost from original page

**Dependencies:** Task 1.1
**Can Parallelize:** No

---

### Task 1.3: Migrate Keys into Dashboard Tab
**File:** `public/pages/dashboard.html`, `public/app.js`
**Description:** Move the Keys page content into the Keys tab.

**Steps:**
1. Copy keys.html content into dashboard Keys tab
2. Update loadKeys() to work within tab context
3. Remove inline addKey script, move to app.js
4. Test add/delete flows work

**Success Criteria:**
- [ ] Keys list loads in Dashboard → Keys tab
- [ ] Add key form works
- [ ] Delete key works
- [ ] Provider dropdown populates correctly

**Dependencies:** Task 1.1
**Can Parallelize:** Yes (with Task 1.2)

---

### Task 1.4: Migrate Settings into Dashboard Tab
**File:** `public/pages/dashboard.html`, `public/app.js`
**Description:** Move settings content (OnHyper API toggle) into Settings tab.

**Steps:**
1. Move settings HTML from dashboard body to Settings tab
2. Ensure toggleOnhyperApi() works in new context
3. Add account-level settings placeholder (future: change password, delete account)

**Success Criteria:**
- [ ] Settings toggle renders in Settings tab
- [ ] Toggle saves correctly
- [ ] Visual feedback on toggle change

**Dependencies:** Task 1.1
**Can Parallelize:** Yes (with Tasks 1.2, 1.3)

---

### Task 1.5: Update Navigation
**File:** `public/app.js`
**Description:** Remove individual Apps/Keys/Domains links from nav, keep only Dashboard.

**Steps:**
1. Update updateNav() to show single "Dashboard" link when logged in
2. Move "Domains" into Dashboard as sub-section of Apps tab or Settings
3. Update router to redirect #/apps, #/keys → #/dashboard with correct tab active

**Success Criteria:**
- [ ] Nav shows only "Dashboard" when logged in
- [ ] Old URLs redirect to dashboard with correct tab
- [ ] No broken links

**Dependencies:** Tasks 1.2, 1.3, 1.4
**Can Parallelize:** No

---

## Phase 2: Card-Based App Grid

**Goal:** Replace list-style app display with visual card grid.

### Task 2.1: Design App Card Component
**File:** `public/styles.css`
**Description:** Create CSS for app card component with hover states.

**Steps:**
1. Design card dimensions (280px width, responsive)
2. Add hover elevation effect
3. Style app name, URL preview, action buttons
4. Create "empty card" style for "+ New App" slot

**Success Criteria:**
- [ ] Cards look polished and professional
- [ ] Hover state provides feedback
- [ ] Mobile: cards stack to full width

**Dependencies:** None
**Can Parallelize:** Yes (with Phase 1 tasks)

---

### Task 2.2: Implement Card Grid Layout
**File:** `public/pages/dashboard.html`, `public/app.js`
**Description:** Replace app list with card grid rendering.

**Steps:**
1. Update loadApps() to render cards instead of list items
2. Create grid container with responsive columns
3. Add "+ New App" card as last item in grid
4. Implement card HTML template

**Success Criteria:**
- [ ] Apps render as cards in grid
- [ ] Grid is responsive (4 columns → 1 column on mobile)
- [ ] "+ New App" card present when apps exist
- [ ] Empty state shows when no apps

**Dependencies:** Task 2.1, Task 1.2
**Can Parallelize:** No

---

### Task 2.3: Create Modal Form Component
**File:** `public/app.js`, `public/styles.css`
**Description:** Create reusable modal for create/edit forms.

**Steps:**
1. Create showModal(title, content) function
2. Create closeModal() function
3. Add modal CSS (overlay, centered box, close button)
4. Add escape key to close

**Success Criteria:**
- [ ] Modal appears centered on screen
- [ ] Background dimmed/overlay
- [ ] Click outside or ESC to close
- [ ] Content scrollable if tall

**Dependencies:** None
**Can Parallelize:** Yes (with Phase 1 tasks)

---

### Task 2.4: Move Create Form to Modal
**File:** `public/app.js`, `public/pages/dashboard.html`
**Description:** Move create app form into modal instead of inline.

**Steps:**
1. Remove inline form from dashboard
2. Create form HTML in modal when "+ New App" clicked
3. Form submission closes modal on success
4. Preserve subdomain check logic

**Success Criteria:**
- [ ] Clicking "+ New App" opens modal
- [ ] Form works in modal
- [ ] Success closes modal and refreshes grid
- [ ] Error shows in modal

**Dependencies:** Task 2.3, Task 2.2
**Can Parallelize:** No

---

## Phase 3: Polish & Enhancements

**Goal:** Add polish, keyboard shortcuts, and mobile optimization.

### Task 3.1: Quick Overview Bar
**File:** `public/pages/dashboard.html`, `public/styles.css`
**Description:** Create sticky stats bar with copyable token.

**Steps:**
1. Design compact stats strip
2. Make API token copyable with one click
3. Add "Generate new token" as dropdown action
4. Make bar sticky on scroll (desktop) or scroll with content (mobile)

**Success Criteria:**
- [ ] Stats visible without scrolling
- [ ] Token copies on click with tooltip feedback
- [ ] Generate token doesn't require page reload

**Dependencies:** Phase 1 complete
**Can Parallelize:** Yes (with other Phase 3 tasks)

---

### Task 3.2: Keyboard Shortcuts
**File:** `public/app.js`
**Description:** Add keyboard navigation for power users.

**Steps:**
1. n → Open new app modal
2. 1/2/3 → Switch to Apps/Keys/Settings tab
3. Escape → Close modal
4. ? → Show shortcuts help

**Success Criteria:**
- [ ] Shortcuts work from anywhere in dashboard
- [ ] Shortcuts don't trigger when typing in inputs
- [ ] Help overlay shows available shortcuts

**Dependencies:** Phase 1 complete
**Can Parallelize:** Yes (with other Phase 3 tasks)

---

### Task 3.3: Mobile Bottom Navigation
**File:** `public/styles.css`, `public/app.js`
**Description:** Implement mobile-optimized navigation.

**Steps:**
1. Transform tabs into bottom nav on mobile
2. Use icons + short labels
3. Add safe-area-inset for notched phones
4. Test on 375px viewport

**Success Criteria:**
- [ ] Tabs appear at bottom on mobile
- [ ] Touch targets are 44px minimum
- [ ] No horizontal scroll
- [ ] Works on notched devices

**Dependencies:** Phase 1 complete
**Can Parallelize:** Yes (with other Phase 3 tasks)

---

### Task 3.4: Empty States
**File:** `public/app.js`, `public/styles.css`
**Description:** Design helpful empty states for no apps/keys.

**Steps:**
1. Create illustrated empty state for apps
2. Create illustrated empty state for keys
3. Add clear CTA button
4. Use friendly, encouraging copy

**Success Criteria:**
- [ ] Empty states are visually appealing
- [ ] CTA is obvious and actionable
- [ ] Different message for each tab

**Dependencies:** Phase 1 complete
**Can Parallelize:** Yes (with other Phase 3 tasks)

---

### Task 3.5: Provider Icons for Keys
**File:** `public/app.js`, `public/styles.css`
**Description:** Add logos for each API provider.

**Steps:**
1. Add OpenAI, Anthropic, OpenRouter, Scout, Ollama logos (SVG)
2. Display icon next to key name
3. Use emoji fallback if image fails

**Success Criteria:**
- [ ] Each provider has distinct icon
- [ ] Icons load quickly
- [ ] Fallback is graceful

**Dependencies:** Task 1.3
**Can Parallelize:** Yes

---

## Parallelization Strategy

```
Phase 1 (Foundation):
  Task 1.1 ─┬─→ Task 1.2 ─┐
            ├─→ Task 1.3 ─┼─→ Task 1.5
            └─→ Task 1.4 ─┘
            
Phase 2 (Cards) - Can start in parallel with Phase 1:
  Task 2.1 ──→ Task 2.2 ──→ Task 2.4
            ↑
  Task 2.3 ─┘

Phase 3 (Polish) - Can start after Phase 1:
  Task 3.1 ─┐
  Task 3.2 ─┼─→ All parallelizable
  Task 3.3 ─┤
  Task 3.4 ─┤
  Task 3.5 ─┘
```

**Can run in parallel:**
- Task 1.2, 1.3, 1.4 (after 1.1)
- Task 2.1 (independent)
- Task 2.3 (independent)
- Task 3.1-3.5 (after Phase 1)

---

## Total Estimated Effort

| Phase | Tasks | Hours |
|-------|-------|-------|
| Phase 1 | 5 tasks | 4-5h |
| Phase 2 | 4 tasks | 3-4h |
| Phase 3 | 5 tasks | 2-3h |
| **Total** | **14 tasks** | **9-12h** |

---

## Rollback Plan

Each phase is self-contained. If issues arise:
- Phase 1: Keep original pages, tabs are additive
- Phase 2: Card grid can coexist with list view
- Phase 3: Enhancements can be toggled off

No deployment should break existing functionality.