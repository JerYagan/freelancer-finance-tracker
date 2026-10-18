# PLAN: Tally Branding & Public-Facing Web App (Phases B1–B5)

This document is the master implementation plan for transforming the application into **Tally** — adopting the official brand identity, color system, Plus Jakarta Sans typography, custom icon style, logo assets, and crafting a world-class public-facing landing and onboarding experience.

---

## 🎨 Brand Identity Specification

Based on the brand identity guidelines, design tokens, and assets in `SVG/`:

### 1. Brand Essence & Copy
- **Brand Name**: **Tally**
- **Primary Tagline**: *"Track it. Earn it. Grow it."*
- **Hero Headline**: *"Freelance finances, simplified."*
- **Sub-headline**: *"Track income, manage expenses, and see your growth — all in one place, built for freelancers."*
- **Secondary Slogans**:
  - *"Your freelance money, in motion."*
  - *"Good Numbers, Brighter Days. 😊"*
- **Brand Personality**: Calm, cozy, friendly, encouraging, tactile, and clear. Eliminates the anxiety of traditional accounting software with warm organic tones and human illustration.

### 2. Color Palette & Design Tokens

| Token Name | Hex Code | HSL / CSS Variable | Primary Usage |
| :--- | :--- | :--- | :--- |
| **Pine Charcoal** | `#17211B` | `hsl(147, 18%, 11%)` | Primary headings, dark buttons, high-contrast borders, dark theme surface |
| **Sage Forest** | `#5E8C61` | `hsl(124, 20%, 46%)` | Primary brand accent, logo mark color, active tabs, primary actions |
| **Pastel Mint** | `#A7C8A3` | `hsl(114, 26%, 71%)` | Secondary chips, icon tint backgrounds, positive trend badges, soft pills |
| **Warm Cream** | `#F3F1E8` | `hsl(47, 27%, 93%)` | Public page background, warm organic canvas tone, light mode background |
| **Ivory Surface** | `#FFFFEF` | `hsl(60, 100%, 97%)` | Elevated cards, modal dialogs, receipt panels, contrast card backgrounds |
| **Expense Coral** | `#D95D50` | `hsl(6, 64%, 58%)` | Expense indicators, overdue alerts, negative cash flow tags |
| **Income Emerald** | `#2E7D32` | `hsl(123, 46%, 34%)` | Income indicators, invoice paid badges, positive delta tags |

### 3. Typography
- **Primary Font Family**: **Plus Jakarta Sans** (Google Fonts / `next/font/google`)
  - **Weights**:
    - `800 ExtraBold` / `700 Bold`: Display hero titles (*"Freelance finances, simplified."*)
    - `600 SemiBold`: Section titles, metric values, navigation links
    - `500 Medium`: Form labels, button text, table headers
    - `400 Regular`: Paragraph body text, helper copy, notes
- **Numeric Font Feature**: `font-variant-numeric: tabular-nums` preserved for all currency displays.
- **Logotype**: Geometric rounded letterforms as defined in `SVG/tally-typography.svg`.

### 4. Iconography System
- **Strict Rule**: **NO EMOJIS AS ICONS**. Use the installed icon library (`lucide-react`) exclusively.
- **Style Rules**:
  - Render icons using `lucide-react` components (`Home`, `BarChart3`, `Receipt`, `Wallet`, `Folder`, `User`, `Sprout`, `Bell`, `CheckCircle2`, `ArrowUpRight`, `ArrowDownRight`).
  - Style with rounded pill/squircle badge backdrops using `#A7C8A3` (Pastel Mint) with `#17211B` (Pine Charcoal) or `#5E8C61` (Sage Forest) strokes (2px to 2.5px stroke width, rounded caps/joins).
- **Core Icon Set (via `lucide-react`)**:
  - `Home`: Dashboard & overview
  - `BarChart3`: Analytics & income growth
  - `Receipt`: Invoices & billings
  - `Wallet`: Expenses & payments
  - `Folder`: Projects & client workspaces
  - `User`: Account & settings
  - `Sprout`: Growth & retainers
  - `CheckCircle2`: Checked checklist items ("Track it. Earn it. Grow it.")

### 5. Official Logo Assets
- `SVG/tally-logo-light.svg`: 3 ascending rounded pill bars + circular base mark in `#5A7959`.
- `SVG/tally-typography.svg`: Full lockup with mark + geometric "Tally" logotype.
- Scalable SVG React components for responsive headers, dark mode variants, app icons, and favicons.

---

## 📋 Phased Implementation Plan

```
Phase B1: Brand Tokens, Typography, & Asset Foundation
   ↓
Phase B2: Public Landing Page & Interactive Product Showcase
   ↓
Phase B3: Auth & Onboarding Flow Restyling
   ↓
Phase B4: In-App Shell & Navigation Brand Harmony
   ↓
Phase B5: Verification, Accessibility, & Quality Gates
```

---

### Phase B1 — Brand Tokens, Typography, & Asset Foundation
*Goal: Establish the Tally visual design system in code, configure Plus Jakarta Sans, and export clean SVG/vector assets.*

- [x] **B1.1 Asset Migration & Organization**
  - Copy `SVG/tally-logo-light.svg` and `SVG/tally-typography.svg` into `public/brand/`.
  - Create optimized React component wrappers in `src/components/brand/tally-logo.tsx` and `src/components/brand/tally-icon.tsx` with light/dark fill support and responsive sizing (`sm`, `md`, `lg`, `xl`).
  - Optimize and copy the hero workspace illustration into `public/brand/hero-illustration.jpg` and `public/brand/brand-guide.jpg`.
- [x] **B1.2 Plus Jakarta Sans Typography Integration**
  - Configure `next/font/google` in `src/app/layout.tsx` for `Plus_Jakarta_Sans` with weights `400, 500, 600, 700, 800` and `subsets: ["latin"]`.
  - Set CSS variable `--font-plus-jakarta` / `--font-sans` and apply it as the default font across the entire app.
- [x] **B1.3 Design System & Tailwind Token Migration**
  - Update `src/app/globals.css` with Tally color tokens:
    - Light: `--background: #f3f1e8;`, `--surface: #ffffef;`, `--primary: #5e8c61;`, `--primary-dark: #17211b;`, `--mint: #a7c8a3;`.
    - Dark: Harmonious deep forest/pine dark mode (`--background: #0e1411;`, `--surface: #17211b;`, `--primary: #5e8c61;`, `--mint: #a7c8a3;`).
  - Update `docs/DESIGN_SYSTEM.md` to document the new Tally color tokens and component styling rules.
- [x] **B1.4 Custom Brand Icon Set**
  - Create `src/components/brand/brand-icon.tsx` containing dual-tone icons based on `lucide-react` with zero emojis:
    - `TallyBarChartIcon`, `TallyWalletIcon`, `TallyReceiptIcon`, `TallySproutIcon`, `TallyFolderIcon`, `TallyUserIcon`, `TallyCheckReceiptIcon`.
- [x] **B1.5 Favicon & PWA App Icons Update**
  - Copy Tally 3-bar mark to `public/icons/icon.svg` and update manifest metadata.
  - Update `src/app/manifest.ts` and `src/app/layout.tsx` title/meta (`"Tally — Freelance Finances, Simplified"`).

---

### Phase B2 — Public Landing Page & Interactive Product Showcase
*Goal: Build an extraordinary, conversion-focused public homepage at `/` that feels tactile, friendly, and stunning.*

- [x] **B2.1 Sticky Brand Navigation Bar**
  - Tally logo lockup (`<TallyLogo />`).
  - Navigation anchors: *Features*, *Product Tour*, *Tax Calculator*, *FAQ*.
  - Actions: *Sign In* (ghost/soft pine) and *Start Tracking Free* (solid Sage Forest pill button).
  - Theme toggle (light/dark) seamlessly integrated.
- [x] **B2.2 Hero Section with Interactive Floating Widgets**
  - **Left Column**:
    - Eyebrow pill: *"Track it. Earn it. Grow it."* with animated sprout icon.
    - Headline: *"Freelance finances, simplified."* (Plus Jakarta Sans 800, warm pine tone).
    - Subtitle: *"Track income, manage expenses, and see your growth — all in one place, built for freelancers."*
    - Primary CTA pill: *"Start Tracking Free"* linking to `/sign-up`, with secondary *"Explore Live Tour"* button.
    - Social proof badge: *"Trusted by designers, developers, & solo consultants"*.
  - **Right Column (Hero Artwork + Floating Cards)**:
    - Hero illustration: Freelancer working comfortably at desk with laptop, plants, warm mug (`public/brand/hero-illustration.jpg`).
    - Floating card 1: `↑ Income Received` pill (`+$1,200.00`).
    - Floating card 2: `↓ Software & Tools` pill (`-$29.99`).
    - Floating card 3: Tangible check-receipt: `✓ Track it. ✓ Earn it. ✓ Grow it. Sparkles Good Numbers, Brighter Days.` (strictly zero emojis).
- [x] **B2.3 Interactive App Preview Showcase (Mobile & Desktop)**
  - Realistic interactive preview mimicking the phone mockup in the brand board:
    - **Total Balance**: `$4,320.50` (`+12%` pill + Tally mini bar chart).
    - **Income & Expense Split**: `$5,230.00` Income vs `$909.50` Expenses.
    - **Recent Transactions list**:
      - Client Payment (`+$1,200.00`)
      - Software Subscription (`-$29.99`)
      - Creative Retainer (`+$800.00`)
    - Bottom tab bar with active Home, Analytics, (+), Invoices, Profile.
  - Interactive tab switcher allowing prospective users to click between *Live Dashboard*, *Invoices & Retainers*, and *15% Tax Set-Aside*.
- [x] **B2.4 Core Feature Pillars**
  - 3-card grid using the dual-tone brand icons and warm ivory surfaces:
    1. **Track your income**: See how much you're earning at a glance across client milestones, retainers, and royalties.
    2. **Manage expenses**: Keep your spending in check with categorized software, gear, and coworking expenses.
    3. **Grow your freelance**: Make smarter financial decisions with real-time net profit trends and tax estimates.
- [x] **B2.5 Interactive Freelancer Tax Set-Aside Widget**
  - Interactive monthly revenue slider ($1,000 to $15,000 / ₱55,000 to ₱825,000) with currency toggle (USD / PHP).
  - Tax percentage selector (8%, 15%, 20%, 30%).
  - Live calculation showing recommended quarterly tax set-aside and safe-to-spend net profit.
  - CTA button: *"Track It Automatically in Tally"*.
- [x] **B2.6 Freelancer Benefits & FAQ Section**
  - Accordion FAQ addressing differences from legacy enterprise software, offline PWA capabilities, quarterly tax reserves, accountant export, multi-currency, and spreadsheet importing.
- [x] **B2.7 Brand Footer**
  - Conversion card banner with primary CTA to sign up.
  - Tally logo with tagline: *"Track it. Earn it. Grow it."*
  - Brand sticker badge: *"Good Numbers, Brighter Days."* with Sparkles icon.

---

### Phase B3 — Auth & Onboarding Flow Restyling
*Goal: Extend the warm Tally aesthetic to Sign In, Sign Up, and Password Reset screens.*

- [x] **B3.1 Auth Layout Harmonization**
  - Update `src/app/(auth)/layout.tsx` with the warm cream canvas (`#F3F1E8`), soft ivory card container, and top Tally logo lockup.
  - Add cozy brand illustration / testimonial badge on tablet/desktop viewports alongside the auth card.
- [x] **B3.2 Sign In & Sign Up Polish**
  - Restyle form inputs to use Plus Jakarta Sans, rounded-lg borders with pine charcoal focus rings.
  - Use Sage Forest button (`#5E8C61`) with subtle hover transition for submission buttons.
  - Welcoming copy: *"Welcome back to Tally"* and *"Start your Tally account in 30 seconds"*.
- [x] **B3.3 Password Reset & Verification Pages**
  - Apply the same warm brand styling to `/forgot-password`, `/reset-password`, and `/verify-email`.
- [x] **B3.4 Email Template Brand Update**
  - Update HTML email templates in `src/server/services/email.ts` with Tally logo header, warm cream borders, and Sage Forest action buttons.

---

### Phase B4 — In-App Shell & Navigation Brand Harmony
*Goal: Ensure the authenticated application reflects the Tally brand seamlessly.*

- [x] **B4.1 Sidebar & Header Logo Integration**
  - Replace generic text header in `src/components/layout/sidebar.tsx` and mobile top bar with `TallyLogo` (`tally-typography.svg`).
- [x] **B4.2 Navigation Icon Update**
  - Align sidebar and mobile bottom tab icons with the friendly rounded Tally style (Home, Transactions, Invoices, Clients, Reports, Settings).
- [x] **B4.3 Dashboard & Widget Polish**
  - Restyle stat cards, trend charts, and category pills to use the Sage Forest and Pastel Mint palette.
  - Add the friendly *"Good Numbers, Brighter Days"* motivational greeting on the dashboard header.
- [x] **B4.4 Empty States & PWA Banner**
  - Update empty states with Tally dual-tone illustration icons.
  - Restyle the offline/PWA install banner with the Tally brand pill badge.

---

### Phase B5 — Verification, Accessibility, & Quality Gates
*Goal: Ensure high performance, full responsiveness, WCAG AA contrast compliance, and passing automated tests.*

- [x] **B5.1 Contrast & Accessibility Audit**
  - Verify WCAG AA compliance (minimum 4.5:1 for body copy and 3:1 for large headings) on `#F3F1E8` cream background and `#17211B` pine dark mode.
- [x] **B5.2 Responsive Design Testing**
  - Test on mobile (375px iPhone viewport), tablet (768px), and desktop (1280px+).
  - Ensure floating widgets stack gracefully on small screens without horizontal scroll.
- [x] **B5.3 E2E & Smoke Test Suite Updates**
  - Update Playwright E2E tests (`tests/e2e/journeys.spec.ts`) to verify landing page elements, Tally branding, and navigation.
  - Run full test suite:
    ```bash
    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build
    ```
- [x] **B5.4 Update Master Documentation**
  - Tick off tasks in `docs/PLAN.md` and append design decisions to `docs/DECISIONS.md`.

---

## 🎯 Definition of Done for Branding Phase

1. **Brand Fidelity**: The application fully mirrors the provided brand guidelines: Tally logo, Plus Jakarta Sans font, `#17211B` / `#5E8C61` / `#A7C8A3` / `#F3F1E8` / `#FFFFEF` color system, and dual-tone rounded icons.
2. **Landing Page Excellence**: The root page (`/`) is transformed into a high-converting, visually rich public presentation with hero artwork, interactive demo preview, feature pillars, tax calculator, and FAQ.
3. **Cohesive Experience**: Landing page, auth pages, email templates, and app dashboard share unified styling and tone.
4. **All Quality Gates Pass**: TypeScript strict mode (`pnpm typecheck`), ESLint (`pnpm lint`), Vitest unit tests (`pnpm test`), and Next.js production build (`pnpm build`) pass with zero errors.
