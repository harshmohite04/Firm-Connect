---
page: cases
priority: 2
status: ready
---

# 2. Cases Management Page - Smart Case Browser

A streamlined interface for managing all cases with advanced search, filtering, and status visualization.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Mobile-first responsive
- Primary Accent: Indigo-500 (#4f46e5)
- Secondary Accent: Emerald-500 (#10b981)
- Background: var(--color-surface) with glassmorphic cards
- Text Primary: var(--color-text-primary)
- Text Secondary: var(--color-text-secondary)
- Border: var(--color-surface-border)
- Cards: 3rem border-radius, shadow-2xl, backdrop-blur-3xl
- Buttons: 2.5rem-3rem rounded, gradient, uppercase, tracking-widest
- Spacing: p-12 desktop, p-6 mobile, gap-8
- Typography: Bold tracking-tight headings, uppercase labels
- Animations: duration-500, hover:scale-105
- Status badges: Green (open), Amber (in-progress), Slate (closed)

**Page Structure:**

1. **Header with Controls**
   - Large title "All Cases" with folder icon
   - Sticky on scroll (backdrop-blur)
   - Layout: Left (title + icon) | Right (search + filters)

2. **Search & Filter Bar**
   - Prominent search input with magnifying glass icon
   - Search icon left side, rounded
   - Filter tabs below: All | Active | Closed
   - Tab styling: Underline active, smooth transitions
   - Quick search functionality

3. **Case Cards Grid**
   - Responsive layout: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
   - Gap-8 between cards
   - Each card contains:
     - Large gradient avatar (case first letter, 80x80px)
     - Case title (bold, tracking-tight)
     - Case number badge (slate-500/10 background)
     - Creation date with clock icon
     - Status badge (green=open, amber=in-progress, slate=closed)
   - Card styling: 3rem radius, shadow-2xl, border, backdrop-blur
   - Hover: scale-103, enhanced shadow, background highlight
   - Click: Navigate to case details

4. **Empty State**
   - When no cases match filters
   - Folder icon (large, opacity-20)
   - "No Cases Found" heading
   - Helpful message
   - Optional: "Create New Case" button

5. **Responsive Design**
   - Mobile: 1 column, full-width cards, sticky search
   - Tablet: 2 columns, optimized spacing
   - Desktop: 3 columns, full-width search, organized layout

6. **Visual Polish**
   - Glassmorphism on all cards (backdrop-blur-3xl)
   - Consistent 3rem border-radius
   - Color-coded status badges
   - Smooth hover animations (500ms)
   - Proper touch targets (min 44x44px)
   - Accessibility-first design

---

## Next Page Queue

After cases approval:
1. ✅ Dashboard - Generated
2. → Cases - Ready for generation
3. → Messages/Chat Page
4. → Calendar & Scheduling
5. → Billing & Invoicing
6. → Case Details Hub
7. → Case Activity Timeline
8. → Case-Specific Chat
9. → Document Management
10. → Legal References
