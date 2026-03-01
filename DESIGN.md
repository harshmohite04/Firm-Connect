# Law Firm Connect - Design System

## 1. Brand Identity

**Name:** Law Firm Connect Portal
**Purpose:** Premium legal case management and client collaboration platform
**Target Audience:** Legal professionals, law firms, clients
**Aesthetic:** Modern professional, sophisticated, trustworthy

---

## 2. Color Palette

### Primary Colors
- **Indigo-500 (#4f46e5)** - Primary accent for buttons, links, highlights, and CTAs
- **Indigo-600 (#4338ca)** - Hover state for primary actions
- **Indigo-700 (#4338ca)** - Active state for primary actions

### Secondary Colors
- **Emerald-500 (#10b981)** - Success states, positive actions, confirmations
- **Amber-500 (#f59e0b)** - Warning states, in-progress status
- **Red-500 (#ef4444)** - Danger states, alerts, errors
- **Blue-500 (#3b82f6)** - Info states, secondary actions

### Neutral Colors
- **Slate-900 (#0f172a)** - Text primary (dark mode), text inverse (light mode)
- **Slate-600 (#475569)** - Text secondary
- **Slate-500 (#64748b)** - Text secondary, opacity-60
- **Slate-400 (#94a3b8)** - Text tertiary, disabled states
- **Slate-200 (#e2e8f0)** - Borders, dividers
- **Slate-100 (#f1f5f9)** - Backgrounds, tertiary
- **Slate-50 (#f8fafc)** - Backgrounds, secondary
- **White (#ffffff)** - Primary background (light mode), text inverse

### Background Colors (Light Theme)
- **Primary BG:** #ffffff
- **Secondary BG:** #f8fafc
- **Tertiary BG:** #f1f5f9
- **Surface:** #ffffff with border #e2e8f0

### Dark Mode (CSS Variables)
- **--color-surface:** Dark slate with glassmorphism
- **--color-bg-secondary:** Elevated dark surface
- **--color-text-primary:** Near white
- **--color-surface-border:** Subtle dark divider

---

## 3. Typography

### Font Family
- **Primary:** Inter, Plus Jakarta Sans, sans-serif
- **Usage:** All body copy, labels, secondary text

### Font Weights & Styles
- **Headings:** 700-900 (bold, extra-bold)
- **Subheadings:** 600-700 (semi-bold)
- **Body:** 400-500 (regular, medium)
- **Labels:** 600-700 (semi-bold, uppercase)

### Font Sizes & Scales
| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Page Title (H1) | 48-64px | 900 | 1.1 |
| Section Title (H2) | 32-40px | 800 | 1.2 |
| Card Title (H3) | 20-24px | 700 | 1.3 |
| Body Text | 14-16px | 400 | 1.5 |
| Label | 11-12px | 700 | 1.4 |
| Caption | 12-13px | 500 | 1.4 |

### Text Effects
- **Tracking-tight:** Letter-spacing for headings
- **Tracking-tighter:** Extra tight letter-spacing for emphasis
- **Tracking-widest:** Wide spacing for labels and caps
- **Uppercase:** Used for labels, badges, tags

---

## 4. Component Styles

### Buttons
- **Primary Button:**
  - Background: `--gradient-accent` (indigo to purple)
  - Padding: px-12 py-6
  - Border-radius: 2.5rem-3rem
  - Font: 700, uppercase, tracking-widest
  - Shadow: shadow-2xl with indigo glow
  - Hover: scale-105, enhanced shadow
  - Active: scale-95

- **Secondary Button:**
  - Background: indigo-500/10
  - Color: indigo-500
  - Border: subtle indigo border
  - Hover: indigo-500/20 background, scale-105

- **Tertiary Button:**
  - Background: slate-500/10
  - Color: slate-600
  - Border: none
  - Hover: slate-500/20 background

### Cards & Containers
- **Standard Card:**
  - Background: `--color-surface`
  - Border: `--color-surface-border`
  - Border-radius: 3rem (48px)
  - Shadow: shadow-2xl
  - Padding: p-8 to p-12
  - Backdrop: backdrop-blur-3xl

- **Glass Card:**
  - Background: `--color-surface` with opacity
  - Border: subtle with glassmorphism
  - Shadow: shadow-xl
  - Backdrop-blur: blur-3xl

### Badges & Status Indicators
- **Open/Success:** Green badge, emerald-500, emerald-500/10 background
- **In Progress:** Amber badge, amber-500, amber-500/10 background
- **Closed:** Slate badge, slate-500, slate-500/10 background
- **Alert:** Red badge, red-500, red-500/10 background
- **Border-radius:** rounded-2xl
- **Padding:** px-5 py-1.5
- **Font:** 11px, font-black, uppercase, tracking-widest

### Input Fields
- **Background:** `--color-bg-secondary` or `--color-surface`
- **Border:** `--color-surface-border`
- **Border-radius:** 1.5rem
- **Padding:** px-6 py-3
- **Focus:** Enhanced border color, indigo glow
- **Placeholder:** slate-400, opacity-60

### Icons
- **Size:**
  - Large: w-10 h-10
  - Medium: w-6 h-6
  - Small: w-4 h-4
- **Color:** Match context (primary, secondary, accent)
- **Opacity:** 60% for secondary, 100% for primary

---

## 5. Layout & Spacing

### Grid System
- **Desktop:** Gap-8 (32px)
- **Tablet:** Gap-6 (24px)
- **Mobile:** Gap-4 (16px)

### Breakpoints
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

### Padding & Margins
- **Large containers:** p-12 to p-16 (48-64px)
- **Medium sections:** p-8 to p-10 (32-40px)
- **Small elements:** p-4 to p-6 (16-24px)

### Card Grid Layouts
- **Stats Grid:** 1 col (mobile) → 2 cols (tablet) → 4 cols (desktop)
- **Case Cards:** 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
- **Message List:** Full width with two-column split on desktop

---

## 6. Animations & Interactions

### Transitions
- **Default:** duration-500, ease-in-out
- **Fast:** duration-300
- **Slow:** duration-700

### Hover Effects
- **Scale:** hover:scale-105 (standard), hover:scale-110 (emphasis)
- **Opacity:** hover:opacity-100 (from opacity-60)
- **Shadow:** Enhanced shadows on hover
- **Color Shift:** Smooth color transitions

### Loading States
- **Spinner:** Centered, animated border-spin
- **Pulse:** opacity-60 with animate-pulse
- **Text:** "Loading..." with subtle animation

### Status Animations
- **Pulse Badges:** animate-pulse for active/unread indicators
- **Bounce:** animate-bounce for notifications
- **Fade:** fade-in animations on page load

---

## 7. Responsive Design

### Mobile-First Approach
1. **Base styles** - designed for mobile (< 640px)
2. **Tablet adjustments** - enhanced layout at 640px+
3. **Desktop enhancements** - optimized at 1024px+

### Responsive Pattern
```css
/* Mobile */
class="w-full p-6"

/* Tablet and up */
class="md:w-1/2 md:p-8"

/* Desktop and up */
class="lg:w-1/3 lg:p-12"
```

### Touch-Friendly Design
- **Minimum tap target:** 44x44px
- **Button padding:** Generous spacing
- **List items:** Full-width tappable on mobile

---

## 8. Accessibility

### Color Contrast
- **WCAG AA:** Minimum 4.5:1 for text on background
- **WCAG AAA:** Minimum 7:1 for critical elements
- **Dark mode:** Ensures high contrast

### Keyboard Navigation
- **Tab order:** Logical flow through interactive elements
- **Focus indicators:** Visible focus states with indigo outline
- **Keyboard shortcuts:** Standard shortcuts for common actions

### Screen Readers
- **ARIA labels:** Descriptive labels for icons and buttons
- **Semantic HTML:** Proper heading hierarchy (h1-h6)
- **Form labels:** Explicit labels for all inputs

### Visual Accessibility
- **Font size:** Minimum 14px for body text
- **Line height:** 1.4-1.5 for readability
- **Color not alone:** Don't rely solely on color for status

---

## 9. Design System Notes for Stitch Generation

**Key CSS Variables to Reference:**
```css
--color-surface: Background for cards
--color-surface-border: Border color for cards
--color-text-primary: Main text color
--color-text-secondary: Secondary text color
--color-accent: Primary action color (indigo-500)
--color-success: Success states (emerald-500)
--gradient-accent: Gradient for buttons and CTAs
```

**Common Patterns:**
1. **Card styling:** rounded-[3rem] border shadow-2xl with backdrop-blur
2. **Buttons:** Font-black uppercase tracking-widest with gradient
3. **Text hierarchy:** Large headings (text-5xl+) with tracking-tighter
4. **Hover states:** scale-105, enhanced shadows, color transitions
5. **Responsive:** Mobile-first, stack vertically, expand to grid on desktop

**Stitch Generation Tips:**
- Always include glassmorphism (backdrop-blur-3xl)
- Use rounded corners consistently (3rem+ for cards, 2.5rem for buttons)
- Include hover scale effects (hover:scale-105)
- Maintain generous padding (p-12 on desktop, p-6 on mobile)
- Support dark mode via CSS variables
- Ensure animations are smooth (duration-500)
- Include proper status indicators (color-coded badges)

---

## 10. File Structure

```
project/
├── src/
│   ├── pages/
│   │   ├── UserPortal.tsx (Dashboard)
│   │   ├── PortalCases.tsx (Case Management)
│   │   ├── PortalMessages.tsx (Messages)
│   │   ├── PortalCalendar.tsx (Calendar)
│   │   ├── PortalBilling.tsx (Billing)
│   │   └── case-details/
│   │       ├── CaseChat.tsx
│   │       ├── CaseDocuments.tsx
│   │       ├── CaseDraft.tsx
│   │       └── CaseActivity.tsx
│   ├── components/
│   │   └── PortalLayout.tsx (Shared layout)
│   └── index.css (Design tokens)
├── DESIGN.md (This file)
├── SITE.md (Site structure)
└── next-prompt.md (Stitch baton)
```
