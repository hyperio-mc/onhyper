# OnHyper Dashboard UX Redesign

## Current State Analysis

### Pain Points

1. **Fragmented Navigation** - User content is scattered across 4 separate pages:
   - Dashboard (stats + token + settings)
   - Apps (list + create form)
   - Keys (list + add form)
   - Domains (subdomain management)

2. **Dashboard feels like a menu, not a destination**
   - Shows stats but you can't DO anything with them
   - "Quick Actions" buttons just send you to other pages
   - API token takes prominent space but is a one-time setup

3. **Forms always visible, cluttering the view**
   - Apps page: create form always shown
   - Keys page: add form always shown
   - Forces user to scroll past to see existing items

4. **No visual hierarchy**
   - Stats, token, settings, actions all same visual weight
   - User's focus pulled in multiple directions

5. **Context switching required for every action**
   - Want to check apps AND add a key? Navigate to two pages
   - Want to see your token AND create an app? Three pages (dashboard → apps)

### What Works

- Clean, minimal aesthetic
- Hash-based routing is fast
- Mobile-responsive layout
- Consistent form patterns

---

## Proposed Redesign

### Core Principle: **One Dashboard, All Your Stuff**

The dashboard should be the user's "home base" - everything they need in one scroll, with contextual actions.

### Information Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (persistent)                                        │
│  Logo | Search | + New App | Profile ▼                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD (single page, tabbed sections)                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ OVERVIEW (always visible at top)                         ││
│  │                                                          ││
│  │  [3 Apps]  [5 Keys]  [1.2K Calls]  [API Token: oh_...📋]││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ TABS: [Apps] [API Keys] [Settings]                       ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                                          ││
│  │  TAB CONTENT (changes based on selection)                ││
│  │                                                          ││
│  │  Apps Tab:                                               ││
│  │  ┌───────────────────────────────────────────────────────┐│
│  │  │ + New App (button only, opens modal/slide-out)        ││
│  │  └───────────────────────────────────────────────────────┘│
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                  ││
│  │  │ App Card │ │ App Card │ │ App Card │                  ││
│  │  │          │ │          │ │   + New  │                  ││
│  │  └──────────┘ └──────────┘ └──────────┘                  ││
│  │                                                          ││
│  │  Keys Tab:                                               ││
│  │  ┌───────────────────────────────────────────────────────┐│
│  │  │ + Add Key (button only, opens modal)                  ││
│  │  └───────────────────────────────────────────────────────┘│
│  │  ┌─────────────────────────────────────────┐             ││
│  │  │ 🔑 OpenAI    ••••••••••••    [Delete]   │             ││
│  │  │ 🔑 Anthropic ••••••••••••    [Delete]   │             ││
│  │  │ 🔑 OpenRouter •••••••••••   [Delete]   │             ││
│  │  └─────────────────────────────────────────┘             ││
│  │                                                          ││
│  │  Settings Tab:                                           ││
│  │  - Enable OnHyper API access checkbox                    ││
│  │  - Generate new token                                    ││
│  │  - Danger zone (delete account)                          ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Key Changes

#### 1. Consolidated Dashboard

**Before:** 4 pages to manage everything
**After:** 1 page with tabs within it

- Apps, Keys, and Settings become **tabs**, not separate pages
- Overview stats always visible at top
- Reduces cognitive load - user knows everything is in one place

#### 2. Quick Overview Bar

Always-visible strip at the top showing:

```
┌─────────────────────────────────────────────────────────────┐
│  📦 3 Apps    🔑 5 Keys    📊 1.2K Calls    🔑 oh_live_...📋 │
└─────────────────────────────────────────────────────────────┘
```

- Stats are glanceable
- API token is copyable with one click
- No scrolling required to see your status

#### 3. Cards, Not Lists

**Before:**
```
App List:
- App 1
- App 2
- App 3
[Create form below]
```

**After:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📄 App Name  │ │ 📄 App Name  │ │     +        │
│              │ │              │ │   New App    │
│ onhyper.io/a │ │ onhyper.io/a │ │              │
│ ──────────── │ │ ──────────── │ │              │
│ Edit | Del   │ │ Edit | Del   │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

- Visual, scannable
- "New App" as an empty card slot (reduces perceived complexity)
- Inline actions

#### 4. Modal Forms, Not Inline Forms

**Before:**
Scroll down past the create form to see your apps

**After:**
- Click "+ New App" → Modal/slide-out panel appears
- Main content stays visible in background
- Form is focused, no distractions
- Close modal to return to exactly where you were

#### 5. Smarter Keys Section

**Before:**
```
Your Keys:
- OpenAI
- Anthropic

Add New Key:
[dropdown] [input] [Submit]
```

**After:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔑 OpenAI        sk-••••••••••••••••            [Delete]     │
│ 🔑 Anthropic     sk-ant-••••••••••••           [Delete]     │
│ 🔑 OpenRouter    sk-or-••••••••••••            [Delete]     │
├─────────────────────────────────────────────────────────────┤
│ + Add API Key                                                │
└─────────────────────────────────────────────────────────────┘
```

- Provider icons for visual scanning
- Masked key preview
- Add link at bottom (not a giant form)

---

## Implementation Plan

### Phase 1: Tab-Based Dashboard (Quick Win)

1. Merge Apps, Keys, Settings into Dashboard as tabs
2. Update navigation to remove individual links
3. Keep existing page templates but load them into tab content
4. Estimated effort: 2-3 hours

### Phase 2: Card-Based UI

1. Redesign app list as card grid
2. Add "New App" card slot
3. Implement modal/slide-out for create form
4. Estimated effort: 3-4 hours

### Phase 3: Polish & Details

1. Add provider icons for keys
2. Implement quick overview bar
3. Add keyboard shortcuts (n for new, 1/2/3 for tabs)
4. Improve empty states
5. Estimated effort: 2-3 hours

---

## Navigation Simplification

### Before
```
Home | Blog | For Agents | Chat | Login | Sign Up
[Logged in:]
Dashboard | Apps | Keys | Domains | Logout
```

### After
```
Home | Blog | For Agents | Chat
[Logged in:]
Dashboard | ▼ Profile
            ├─ Settings
            ├─ API Token
            └─ Logout
```

- Only ONE entry point to logged-in area
- Everything happens inside Dashboard
- Profile menu for account-level actions

---

## Mobile Considerations

- Tabs become a bottom navigation on mobile
- Cards stack vertically
- Modal forms become full-screen sheets
- Overview bar scrolls with content (sticky)

---

## Success Metrics

1. **Time to create an app** - Should decrease (fewer page loads)
2. **Page depth** - Should decrease (everything in one place)
3. **User confusion** - Qualitative feedback should improve
4. **Mobile usage** - Should increase (better mobile UX)

---

## Reference: Similar Patterns

| Platform | Pattern We'll Borrow |
|----------|---------------------|
| Vercel | Card-based project grid, tabs within project |
| Railway | Single-page service view with sections |
| Linear | Keyboard shortcuts, contextual modals |
| Notion | "+ New" as empty card slot |
| GitHub | Tabbed repo view (Code, Issues, PRs) |