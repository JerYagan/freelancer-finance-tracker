# DESIGN_SYSTEM — Tally

Goal: calm, trustworthy, tactile, and encouraging. Designed specifically for solo freelancers. Mobile first, warm organic palette, no corporate clutter.

## Principles

1. Numbers are the hero: large, tabular, aligned.
2. Income and expense are distinguished by color **and** sign/icon, never color alone.
3. One primary action per screen.
4. Quick add is always reachable.
5. Strict iconography rule: **NO EMOJIS AS ICONS**. Use `lucide-react` icons with brand container styling.

## Tokens

Defined as CSS variables in `src/app/globals.css` and exposed through the Tailwind theme. Do not use raw hex in components.

### Color (light / dark)

| Token                  | Light (Tally Cream) | Dark (Pine Forest) | Use                    |
| ---------------------- | ------------------- | ------------------ | ---------------------- |
| `--background`         | `#f3f1e8`           | `#0e1411`          | Page canvas            |
| `--surface`            | `#ffffef`           | `#17211b`          | Cards & dialogs        |
| `--border`             | `#ddd7c8`           | `#2b3b32`          | Dividers & outlines    |
| `--text`               | `#17211b`           | `#f3f1e8`          | Primary text / body    |
| `--text-muted`         | `#5c665f`           | `#8a9e90`          | Secondary & hints      |
| `--primary`            | `#5e8c61`           | `#5e8c61`          | Primary actions, links |
| `--primary-foreground` | `#ffffef`           | `#ffffef`          | Text on primary        |
| `--income`             | `#2e7d32`           | `#4ade80`          | Income amounts         |
| `--expense`            | `#d95d50`           | `#f87171`          | Expense amounts        |
| `--warning`            | `#d97706`           | `#fbbf24`          | Overdue, caution       |
| `--focus-ring`         | `#5e8c61`           | `#5e8c61`          | Focus outline          |

Contrast: body text and amounts meet WCAG AA (>= 4.5:1).

### Typography

- Font: **Plus Jakarta Sans** (via `next/font/google`), fallback `system-ui`.
- Numbers: `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) everywhere money appears.
  | Style                   | Size / line | Weight |
  | ----------------------- | ----------- | ------ |
  | Display (hero headline) | 48–64 / 56  | 800    |
  | Display (dashboard net) | 36 / 40     | 700    |
  | H1                      | 24 / 32     | 700    |
  | H2                      | 18 / 28     | 600    |
  | Body                    | 14 / 20     | 400    |
  | Small / label           | 12 / 16     | 500    |

### Spacing and shape

- 4px base scale (Tailwind default). Page padding 16px mobile, 24px tablet, 32px desktop.
- Card padding 16–20px. Gap between cards 16px.
- Radius: 8px controls, 12px cards, full for pills.
- Shadow: one subtle shadow for popovers only; cards use borders.
- Max content width 1120px.

### Breakpoints

Tailwind defaults: `sm 640`, `md 768`, `lg 1024`. Design at 375px first.

## Layout

- Mobile: bottom tab bar (Dashboard, Transactions, Add, Clients, Settings) with a centered Add button.
- Desktop: left sidebar, content on the right, "Add transaction" button in the header.

## Components

Built from shadcn/ui primitives. Customize through tokens, not one-off classes.

| Component                           | Notes                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Button                              | variants: primary, secondary, ghost, destructive; sizes sm/md/lg; loading state        |
| Input, Select, Textarea, DatePicker | Label above, helper and error text below                                               |
| MoneyInput                          | Decimal keyboard on mobile (`inputMode="decimal"`), currency prefix, formats on blur   |
| Segmented control                   | Income / Expense toggle in the form                                                    |
| Card                                | Border, no heavy shadow                                                                |
| StatCard                            | Label, big amount, optional delta vs last month                                        |
| TransactionRow                      | Date, category chip, description, client, signed amount; swipe or menu for edit/delete |
| Badge/Chip                          | Category (with color dot), invoice status                                              |
| Dialog / Sheet                      | Sheet from bottom on mobile for quick add                                              |
| Toast                               | Success and undo (for delete)                                                          |
| EmptyState                          | Icon, one sentence, one action                                                         |
| Charts                              | Recharts bar (trend), simple list bars for top clients/categories                      |

### Amount display

- Income: `+₱15,000.00` in `--income`. Expense: `−₱499.00` in `--expense`.
- Use `formatMoney`; never hand-build currency strings.

## States

Every data view defines: loading (skeleton), empty (EmptyState), error (message + retry), success.

## Motion

Subtle only: 150ms ease for hover/press, 200ms for sheets and dialogs. Respect `prefers-reduced-motion`.

## Accessibility

- Minimum touch target 44×44px.
- Visible focus ring on all interactive elements.
- Charts have a text or table alternative.
- Dark mode follows the system and can be overridden in settings.

## Copy tone

Plain, friendly, brief. "Saved." "Couldn't save. Try again." Avoid jargon like "ledger" or "reconcile".
