# DarkPool — Complete UI Design Specification

> **Purpose**: This document is the single source of truth for the DarkPool app's visual design system. Any agent or developer updating the UI MUST follow this spec exactly. When in doubt, reference the screenshot and these values — do not improvise.

---

## 1. Visual Identity & Philosophy

### What is DarkPool?
A premium Hebrew (RTL) financial app — news, markets, community, journal, academy. The aesthetic is a **hybrid of Robinhood's clean minimalism + Bloomberg's information density + Apple's native iOS polish**, wrapped in a **dark-mode-first** identity with a signature green accent.

### Core Design Principles
1. **Dark-first, always** — The app lives in darkness. Every surface is a shade of near-black with subtle warm/cool undertones. Light mode is secondary.
2. **Green = Money = Action** — The accent `#00C805` represents profit, success, and interactive elements. It's used surgically, never splashed everywhere.
3. **Glass & Depth** — Cards and surfaces use semi-transparent backgrounds with blur, creating a layered glass effect that gives depth without harsh borders.
4. **Information hierarchy through opacity** — Text importance is communicated through opacity levels on white, not through color changes.
5. **RTL-native** — Everything is designed right-to-left from the ground up. Hebrew typography, right-aligned text, mirrored layouts.
6. **Breathing room** — Generous spacing. Never cramped. Financial data needs space to be readable.

### What Makes This Design Special
- The dark green-tinted backgrounds (not pure black, not blue-black — **green-black**)
- Glass-morphism cards with subtle blur
- The signature `#00C805` green used only for active/positive states
- Pill-shaped tab navigation with filled active state
- Clean bottom tab bar with Lottie-ready icon slots
- Screen headers inside frosted glass containers

### What Should NEVER Be Changed
- The `#00C805` accent green — this IS DarkPool's identity
- The dark-first approach — no bright backgrounds
- The glass/blur card aesthetic
- Hebrew RTL as the primary layout direction
- The bottom tab bar structure (5 tabs)

### Known Areas for Improvement
- Light mode needs proper implementation (currently dark-only)
- Some screens may have inconsistent spacing
- Loading/skeleton states need standardization
- Animations could be more polished (spring configs)

### Reference Apps
- **Robinhood** — Clean card layouts, green accent, financial data presentation
- **Bloomberg** — Information density, dark theme, professional feel
- **Apple Stocks** — Native iOS feel, glass effects, typography
- **Trading 212** — Dark theme, card-based UI, modern feel

---

## 2. Color System

### 2.1 Background Colors

| Token | Hex / Value | Role |
|-------|------------|------|
| `background.primary` | `#0A0E0A` | Main screen background — near-black with green undertone |
| `background.secondary` | `#0F1A0F` | Slightly elevated areas, section backgrounds |
| `background.tertiary` | `#142014` | Third-level surfaces, nested sections |
| `background.elevated` | `#1A2B1A` | Elevated cards, bottom sheets, modals |
| `background.card` | `rgba(255, 255, 255, 0.05)` | Default card surface (glass) |
| `background.cardHover` | `rgba(255, 255, 255, 0.08)` | Card on press/hover |
| `background.cardSolid` | `#141F14` | Cards that need solid backgrounds (no blur) |
| `background.surface` | `rgba(255, 255, 255, 0.03)` | Very subtle surface differentiation |
| `background.overlay` | `rgba(0, 0, 0, 0.60)` | Modal/overlay backdrop |
| `background.overlayHeavy` | `rgba(0, 0, 0, 0.85)` | Full-screen overlay (match animations, etc.) |
| `background.input` | `rgba(255, 255, 255, 0.06)` | Text input field background |
| `background.header` | `rgba(15, 26, 15, 0.85)` | Header glass container (with blur) |
| `background.tabBar` | `rgba(10, 14, 10, 0.95)` | Bottom tab bar (with blur) |
| `background.sheet` | `#121E12` | Bottom sheet background |

### 2.2 Text Colors

| Token | Value | When to Use |
|-------|-------|-------------|
| `text.primary` | `#FFFFFF` | Headings, important content, primary labels |
| `text.secondary` | `rgba(255, 255, 255, 0.70)` | Subtitles, descriptions, secondary info |
| `text.tertiary` | `rgba(255, 255, 255, 0.45)` | Timestamps, metadata, placeholder text |
| `text.muted` | `rgba(255, 255, 255, 0.30)` | Disabled text, very low-priority info |
| `text.inverse` | `#0A0E0A` | Text on light/accent backgrounds |
| `text.accent` | `#00C805` | Positive values, active labels, links |
| `text.danger` | `#FF4444` | Negative values, loss percentages, errors |
| `text.warning` | `#FFB800` | Warnings, caution states |

### 2.3 Primary Accent — `#00C805`

**This is the most important color in the app. Rules for usage:**

| Context | How to Use |
|---------|-----------|
| Active tab indicator | Filled pill background: `#00C805` with white text |
| Active bottom tab icon | Icon tint: `#00C805` |
| Positive stock change | Text color for +% values |
| Primary CTA button | Background: `#00C805`, text: `#0A0E0A` (dark) |
| Success states | Checkmarks, confirmations, completed |
| Profit/gain indicators | Green numbers, up arrows |
| Links / tappable text | Accent-colored text links |
| Active toggle | Toggle track background |
| Progress indicator (positive) | Progress bar fill |

**Where NOT to use `#00C805`:**
- Never as a background for large areas (cards, sections, screens)
- Never for borders (too harsh)
- Never for non-interactive decorative elements
- Never at full opacity for backgrounds — use `rgba(0, 200, 5, 0.12)` for subtle accent backgrounds

| Accent Variant | Value | Role |
|---------------|-------|------|
| `accent.default` | `#00C805` | Primary interactive elements |
| `accent.light` | `#33D43B` | Hover/light variant |
| `accent.dark` | `#00A004` | Pressed state |
| `accent.muted` | `rgba(0, 200, 5, 0.12)` | Accent backgrounds, badge backgrounds |
| `accent.subtle` | `rgba(0, 200, 5, 0.06)` | Very subtle accent tint on surfaces |

### 2.4 Border Colors

| Token | Value | Purpose |
|-------|-------|---------|
| `border.default` | `rgba(255, 255, 255, 0.08)` | Default card/section borders |
| `border.subtle` | `rgba(255, 255, 255, 0.04)` | Very subtle dividers, separators |
| `border.strong` | `rgba(255, 255, 255, 0.15)` | Input focus borders, important separators |
| `border.accent` | `rgba(0, 200, 5, 0.30)` | Active input focus, selected card border |
| `border.danger` | `rgba(255, 68, 68, 0.30)` | Error input border |
| `border.divider` | `rgba(255, 255, 255, 0.06)` | Horizontal line dividers between list items |

### 2.5 Glass / Transparency Values

| Element | Background | Blur | Border |
|---------|-----------|------|--------|
| Glass card | `rgba(255, 255, 255, 0.05)` | `blur(20px)` / `blurRadius: 20` | `rgba(255, 255, 255, 0.08)` 1px |
| Glass card (elevated) | `rgba(255, 255, 255, 0.08)` | `blur(24px)` / `blurRadius: 24` | `rgba(255, 255, 255, 0.10)` 1px |
| Header glass | `rgba(15, 26, 15, 0.85)` | `blur(30px)` / `blurRadius: 30` | `rgba(255, 255, 255, 0.06)` bottom only |
| Tab bar glass | `rgba(10, 14, 10, 0.95)` | `blur(30px)` / `blurRadius: 30` | `rgba(255, 255, 255, 0.06)` top only |
| Bottom sheet | `rgba(18, 30, 18, 0.97)` | `blur(40px)` / `blurRadius: 40` | `rgba(255, 255, 255, 0.08)` top |
| Overlay scrim | `rgba(0, 0, 0, 0.60)` | None | None |

For React Native, use `expo-blur` `BlurView` with `intensity={20-40}` and `tint="dark"`, then overlay a semi-transparent background color.

### 2.6 Chat Bubble Colors

| Element | Value |
|---------|-------|
| My message bubble | `#00C805` (accent green) |
| My message text | `#0A0E0A` (dark, for contrast on green) |
| Other's message bubble | `rgba(255, 255, 255, 0.08)` |
| Other's message text | `#FFFFFF` |
| Timestamp text | `rgba(255, 255, 255, 0.35)` |
| Chat input background | `rgba(255, 255, 255, 0.06)` |
| Chat input border | `rgba(255, 255, 255, 0.10)` |
| Chat input text | `#FFFFFF` |
| Chat input placeholder | `rgba(255, 255, 255, 0.35)` |
| Send button (active) | `#00C805` |
| Send button (disabled) | `rgba(255, 255, 255, 0.15)` |

### 2.7 Status Colors

| Status | Color | Muted Background | Text on Status |
|--------|-------|------------------|---------------|
| Success / Profit | `#00C805` | `rgba(0, 200, 5, 0.12)` | `#0A0E0A` |
| Danger / Loss | `#FF4444` | `rgba(255, 68, 68, 0.12)` | `#FFFFFF` |
| Warning | `#FFB800` | `rgba(255, 184, 0, 0.12)` | `#0A0E0A` |
| Info | `#3B82F6` | `rgba(59, 130, 246, 0.12)` | `#FFFFFF` |
| Neutral | `rgba(255, 255, 255, 0.60)` | `rgba(255, 255, 255, 0.06)` | `#FFFFFF` |

---

## 3. Typography System

### 3.1 Font Family
**Primary**: `Inter` (Google Fonts / `@expo-google-fonts/inter`)

| Weight Name | CSS Weight | Font File | Usage |
|------------|-----------|-----------|-------|
| Regular | 400 | `Inter_400Regular` | Body text, descriptions |
| Medium | 500 | `Inter_500Medium` | Body emphasis, captions, metadata |
| SemiBold | 600 | `Inter_600SemiBold` | Subtitles, card titles, labels |
| Bold | 700 | `Inter_700Bold` | Section titles, buttons, important |
| ExtraBold | 800 | `Inter_800ExtraBold` | Page titles, hero numbers |
| Black | 900 | `Inter_900Black` | Hero display text only |

### 3.2 Type Scale

| Token | Size | Line Height | Letter Spacing | Weight | Usage |
|-------|------|-------------|---------------|--------|-------|
| `display` | 40px | 46px | -1.5px | Black (900) | Large hero numbers (portfolio value) |
| `heroTitle` | 34px | 40px | -1.0px | ExtraBold (800) | Screen main titles |
| `title` | 28px | 34px | -0.5px | Bold (700) | Section titles |
| `title2` | 22px | 28px | -0.3px | Bold (700) | Sub-section titles, card headers |
| `subtitle` | 18px | 24px | 0 | SemiBold (600) | Subtitles, emphasized body |
| `body` | 16px | 24px | 0 | Regular (400) | Default body text |
| `bodyMedium` | 16px | 24px | 0 | Medium (500) | Slightly emphasized body |
| `bodySemiBold` | 16px | 24px | 0 | SemiBold (600) | Strong body emphasis |
| `callout` | 15px | 22px | 0 | Regular (400) | Card descriptions, secondary body |
| `subhead` | 14px | 20px | 0 | Medium (500) | Tab labels, nav items |
| `footnote` | 13px | 18px | 0.1px | Regular (400) | Timestamps, metadata |
| `caption` | 12px | 16px | 0.2px | Medium (500) | Badges, very small labels |
| `caption2` | 11px | 14px | 0.3px | SemiBold (600) | Micro labels, ALL CAPS tags |
| `label` | 14px | 20px | 0.5px | SemiBold (600) | Uppercase labels, `textTransform: 'uppercase'` |
| `button` | 17px | 22px | 0 | Bold (700) | Primary button text |
| `buttonSmall` | 14px | 18px | 0.2px | SemiBold (600) | Small/secondary button text |
| `tabBar` | 10px | 14px | 0.3px | Medium (500) | Bottom tab bar labels |

### 3.3 RTL Typography Rules
```
writingDirection: 'rtl'
textAlign: 'right'
```
Apply to ALL text elements. Numbers and English text within Hebrew sentences naturally flow LTR within the RTL context.

---

## 4. Spacing & Layout System

### 4.1 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `2xs` | 2px | Micro adjustments, icon-to-text gaps within tight groups |
| `xs` | 4px | Tight padding, badge internal padding, between icon and text |
| `sm` | 8px | Small gaps, between related items in a row, pill internal vertical padding |
| `md` | 12px | Medium gap, between card internal elements |
| `base` | 16px | Default gap between sections, card padding |
| `lg` | 20px | Screen horizontal padding, section gaps |
| `xl` | 24px | Large section separators |
| `2xl` | 32px | Between major screen sections |
| `3xl` | 40px | Top padding after header |
| `4xl` | 48px | Large spacers, pre-footer gaps |
| `5xl` | 64px | Maximum spacing, hero section padding |

### 4.2 Screen Layout Values

| Element | Value |
|---------|-------|
| Screen horizontal padding | 20px (both sides) |
| Screen top padding (below safe area) | 12-16px |
| Screen bottom padding (above tab bar) | 16px |
| Content max width | None (full width minus padding) |

### 4.3 Fixed Heights

| Element | Height |
|---------|--------|
| Header area (title + subtitle) | Auto (content-based) |
| Header glass container | Auto + 16px vertical padding |
| Tab pill row | 40px |
| Bottom tab bar | 56px + safe area inset bottom |
| Bottom tab bar total (with safe area) | ~88px on notched devices |
| Primary button | 52px |
| Small button | 40px |
| Text input | 48px |
| Large text input | 52px |
| News card image area | Aspect ratio 16:9 |
| Compact card | 72px |
| List item row | 56-64px |
| Bottom sheet handle | 4px height, 36px width, 2px border-radius |

### 4.4 Border Radius Scale

| Token | Value | Used On |
|-------|-------|---------|
| `xs` | 4px | Small badges, micro elements |
| `sm` | 8px | Inline tags, small chips |
| `md` | 12px | Buttons, input fields, small cards |
| `lg` | 16px | Standard cards, news cards, images within cards |
| `xl` | 20px | Large cards, bottom sheets (top corners) |
| `2xl` | 24px | Pill tabs, header glass containers |
| `full` | 9999px | Circular avatars, round buttons, pill shapes |

**Specific assignments:**
- Cards: `16px`
- Buttons (primary): `12px`
- Buttons (pill/tag): `9999px`
- Input fields: `12px`
- Bottom sheet: `20px` (top-left, top-right only)
- Tab pills: `9999px`
- Avatars: `9999px`
- Images inside cards: `12px` (or match card radius minus card padding)
- Header glass container: `20-24px`

---

## 5. Component Patterns

### 5.1 Tab Bar (Horizontal Pill Tabs)

The tab bar at the top of content sections uses pill-shaped segments.

```
┌─────────────────────────────────────────────────┐
│  [  חדשות מתפרצות  ]   יומן כלכלי    דיווחים רבעוניים  │
│     ^^^ACTIVE^^^        ^^inactive^^    ^^inactive^^     │
└─────────────────────────────────────────────────┘
```

| Property | Active Tab | Inactive Tab |
|----------|-----------|--------------|
| Background | `#00C805` | `transparent` |
| Text color | `#0A0E0A` (dark) | `rgba(255, 255, 255, 0.55)` |
| Font | SemiBold 600, 14px | Medium 500, 14px |
| Padding horizontal | 18px | 18px |
| Padding vertical | 8px | 8px |
| Border radius | `9999px` (full pill) | `9999px` (full pill) |
| Border | None | None |

- Container: Horizontal `ScrollView` with `showsHorizontalScrollIndicator: false`
- Container padding: Match screen horizontal padding (20px)
- Gap between pills: 8px
- Animate active state transition with 200ms ease

### 5.2 Bottom Tab Bar

5 tabs: אקדמיה | יומן | חדשות | שווקים | קהילה (right-to-left)

| Property | Value |
|----------|-------|
| Background | `rgba(10, 14, 10, 0.95)` with `blur(30)` |
| Border top | `rgba(255, 255, 255, 0.06)` 0.5px |
| Height | 56px + safe area bottom |
| Icon size | 24px |
| Label font | Medium 500, 10px |
| Active icon color | `#00C805` |
| Inactive icon color | `rgba(255, 255, 255, 0.40)` |
| Active label color | `#00C805` |
| Inactive label color | `rgba(255, 255, 255, 0.40)` |
| Icon-to-label gap | 4px |
| Active indicator | The center tab (חדשות) has a special highlighted icon with a subtle green glow/background |

Active tab special treatment:
- The currently active tab gets `#00C805` for both icon and label
- The active tab icon can optionally have a subtle glow: `shadowColor: '#00C805'`, `shadowOpacity: 0.3`, `shadowRadius: 6`
- The center tab (חדשות) has a special highlighted circular background: `rgba(0, 200, 5, 0.12)`, 42px diameter behind the icon

Icons: Use outline-style icons (SF Symbols / Phosphor aesthetic). When active, either fill them or tint with `#00C805`. Consider Lottie animations for tab transitions.

**Tab order (RTL, right to left):**

| Position | Label | Icon (outline) | Icon (active) |
|----------|-------|----------------|--------------|
| 1 (far right) | אקדמיה | graduation-cap-outline | graduation-cap-fill, `#00C805` |
| 2 | יומן | calendar-outline | calendar-fill, `#00C805` |
| 3 (center) | חדשות | newspaper-outline | newspaper-fill, `#00C805` + glow bg |
| 4 | שווקים | trending-up-outline | trending-up-fill, `#00C805` |
| 5 (far left) | קהילה | people-outline | people-fill, `#00C805` |

### 5.3 Card System

#### When to Use Each Card Type

| Card Type | Background | Blur | Border | When |
|-----------|-----------|------|--------|------|
| **Glass card** | `rgba(255, 255, 255, 0.05)` | `blurRadius: 20` | `rgba(255, 255, 255, 0.08)` 1px | Default for most cards — news, lists, sections |
| **Glass card elevated** | `rgba(255, 255, 255, 0.08)` | `blurRadius: 24` | `rgba(255, 255, 255, 0.10)` 1px | Important cards, featured content, modals |
| **Solid card** | `#141F14` | None | `rgba(255, 255, 255, 0.06)` 1px | Fallback when blur is expensive (long lists, FlatList items) |
| **Outlined card** | `transparent` | None | `rgba(255, 255, 255, 0.10)` 1px | Minimal emphasis cards, settings rows |
| **Accent card** | `rgba(0, 200, 5, 0.06)` | None | `rgba(0, 200, 5, 0.15)` 1px | Special/promoted content, selected state |

#### Standard Card Anatomy
```
╭──────────────────────────────╮  ← borderRadius: 16
│  [Image area — 16:9 ratio]   │  ← borderRadius top: 16, overflow: hidden
│                               │
│  Title text (bold, white)     │  ← padding: 16
│  Author · Date               │  ← text.tertiary
│                               │
│  Description preview text...  │  ← text.secondary, 2 lines max
│                               │
│  ♡  ↗                        │  ← action icons row, 24px icons
╰──────────────────────────────╯
```

#### News Card with Image Overlay
```
╭──────────────────────────────╮
│                               │
│    [Full bleed image]         │
│                               │
│  ░░ gradient overlay ░░░░░░  │  ← LinearGradient from transparent → rgba(0,0,0,0.75)
│  Title on image (bold white) │      locations: [0.3, 0.65, 1.0]
│  Author · Date               │
╰──────────────────────────────╯
│  Title repeated (below card)  │  ← outside the image card
│  ♡  ↗                        │
╰──────────────────────────────╯
```

### 5.4 Button Variants

#### Primary Button
```
Background: #00C805
Text: #0A0E0A (dark)
Font: Bold 700, 17px
Height: 52px
Border radius: 12px
Padding horizontal: 24px
Shadow: none (clean flat look)
Pressed: #00A004 (darker green)
Disabled: rgba(0, 200, 5, 0.25), text rgba(0, 0, 0, 0.40)
```

#### Secondary Button
```
Background: rgba(255, 255, 255, 0.08)
Text: #FFFFFF
Font: SemiBold 600, 16px
Height: 48px
Border radius: 12px
Border: rgba(255, 255, 255, 0.10) 1px
Pressed: rgba(255, 255, 255, 0.12)
```

#### Ghost Button
```
Background: transparent
Text: #00C805 (or #FFFFFF)
Font: SemiBold 600, 16px
Height: 48px
Pressed: rgba(255, 255, 255, 0.05)
```

#### Pill Button (Tag/Filter)
```
Background: rgba(255, 255, 255, 0.06)
Text: rgba(255, 255, 255, 0.70)
Font: Medium 500, 13px
Height: 32px
Padding horizontal: 14px
Border radius: 9999px
Active: background #00C805, text #0A0E0A
```

#### Danger Button
```
Background: #FF4444
Text: #FFFFFF
Font: Bold 700, 17px
Height: 52px
Border radius: 12px
```

#### Icon Button
```
Background: rgba(255, 255, 255, 0.06)
Size: 40x40px
Border radius: 9999px (circle)
Icon size: 20px
Icon color: rgba(255, 255, 255, 0.70)
Pressed: rgba(255, 255, 255, 0.10)
```

### 5.5 Input Fields

```
Background: rgba(255, 255, 255, 0.06)
Border: rgba(255, 255, 255, 0.08) 1px
Border (focused): rgba(0, 200, 5, 0.40) 1px (accent)
Border (error): rgba(255, 68, 68, 0.40) 1px
Border radius: 12px
Height: 48px
Padding horizontal: 16px
Text color: #FFFFFF
Placeholder color: rgba(255, 255, 255, 0.30)
Font: Regular 400, 16px
Label above: SemiBold 600, 14px, rgba(255, 255, 255, 0.70), margin-bottom 8px
Error text below: Regular 400, 13px, #FF4444, margin-top 6px
```

### 5.6 Bottom Sheet

```
Background: #121E12 (or rgba(18, 30, 18, 0.97) with blur(40))
Border radius: 20px (top-left, top-right)
Border top: rgba(255, 255, 255, 0.08) 1px
Handle bar: 
  Width: 36px
  Height: 4px
  Border radius: 2px
  Color: rgba(255, 255, 255, 0.20)
  Margin top: 8px
  Centered horizontally
Padding horizontal: 20px
Padding top (below handle): 16px
Overlay behind: rgba(0, 0, 0, 0.60)
Animation: Spring { damping: 20, stiffness: 200 }
```

### 5.7 Floating Action Button (FAB)

The FAB appears on the Community screen for creating new chat rooms.

```
Layout: Right-aligned, positioned above the search bar
Structure: Large circle + small badge circle + label below

       ╭───────╮
       │       │   ← Main circle: 56x56px
       │   +   │      Border: #00C805, 2px
       │       │      Background: rgba(0, 200, 5, 0.08)
       ╰───────╯      Icon: "+", 28px, #00C805
          ╭─╮
          │+│          ← Badge circle: 22x22px
          ╰─╯            Background: #00C805 (solid)
                          Icon: "+", 12px, #0A0E0A
         הוסף          ← Label: Medium 500, 12px, #00C805
```

| Property | Value |
|----------|-------|
| Main circle size | 56x56px |
| Main circle background | `rgba(0, 200, 5, 0.08)` |
| Main circle border | `#00C805` 2px |
| Main circle border radius | `9999px` |
| Main "+" icon size | 28px |
| Main "+" icon color | `#00C805` |
| Badge circle size | 22x22px |
| Badge circle background | `#00C805` (solid green) |
| Badge position | Bottom-right of main circle, overlapping |
| Badge "+" icon size | 12px |
| Badge "+" icon color | `#0A0E0A` (dark) |
| Label below | `הוסף`, Medium 500, 12px, `#00C805` |
| Label margin-top | 4px |
| Entire FAB margin-right | Aligned with screen horizontal padding (20px) |
| Shadow | `shadows.md` — subtle elevation |
| Press animation | Scale to 0.92, 100ms |

### 5.8 Search Bar

```
╭──────────────────────────────────────────╮
│                     ...חיפוש        🔍  │
╰──────────────────────────────────────────╯
```

| Property | Value |
|----------|-------|
| Background | `rgba(255, 255, 255, 0.06)` |
| Border | `rgba(255, 255, 255, 0.08)` 1px |
| Border (focused) | `rgba(0, 200, 5, 0.30)` 1px |
| Border radius | `14px` |
| Height | 48px |
| Padding horizontal | 16px |
| Placeholder text | `...חיפוש` (RTL) |
| Placeholder color | `rgba(255, 255, 255, 0.30)` |
| Input text color | `#FFFFFF` |
| Input font | Regular 400, 16px |
| Search icon | Right side (RTL), 20px, `rgba(255, 255, 255, 0.40)` |
| Clear button | "✕" appears when text is entered, 16px, `rgba(255, 255, 255, 0.40)` |
| Margin horizontal | 20px (matches screen padding) |

### 5.9 Filter Pills (Toggle Chips)

Different from Tab Pills (5.1). Filter pills toggle states ON/OFF rather than selecting one tab.

```
     [ לא נקראו ]     [ הכל ]
      ^^active^^       ^^default^^
```

| Property | Active State | Default State |
|----------|-------------|---------------|
| Background | `#00C805` | `rgba(255, 255, 255, 0.10)` |
| Text color | `#0A0E0A` (dark on green) | `rgba(255, 255, 255, 0.70)` |
| Font | SemiBold 600, 14px | Medium 500, 14px |
| Height | 34px | 34px |
| Padding horizontal | 18px | 18px |
| Border radius | `9999px` | `9999px` |
| Border | None | None |

- Layout: Row, centered in container, `gap: 8px`
- The filter row sits between search bar and content list
- Margin top from search bar: 12px
- Margin bottom to list: 16px

### 5.10 Chat Room List Item

Each chat room in the community list follows this exact layout:

```
RTL Layout (right to left):
┌─────────────────────────────────────────────────┐
│                                                   │
│  [Date]        Title               [Neon Icon]   │
│                Member count                       │
│                                                   │
└─────────────────────────────────────────────────┘
       ↑              ↑                    ↑
    left side     center area          right side
```

| Element | Style |
|---------|-------|
| Container height | 72px |
| Container padding horizontal | 20px |
| Container padding vertical | 14px |
| Background | transparent (no card, sits on screen bg) |
| Press state | `rgba(255, 255, 255, 0.04)` background |
| Divider between items | `rgba(255, 255, 255, 0.06)` 0.5px, inset 20px from right (below icon) |
| **Neon Icon** (right side) | See 5.11 |
| **Title** | Bold 700, 16px, `#FFFFFF`, right-aligned |
| **Subtitle** (member count) | Regular 400, 13px, `rgba(255, 255, 255, 0.45)`, right-aligned |
| Title-to-subtitle gap | 2px |
| **Date** (left side) | Regular 400, 13px, `rgba(255, 255, 255, 0.45)` |
| Date alignment | Left side, vertically centered |
| Unread indicator | Blue dot 8px or bold title text when unread |
| Layout | `flexDirection: 'row-reverse'` (RTL), `alignItems: 'center'` |

### 5.11 Neon Green Icon (Community/Chat Channel Icons)

The chat room icons have a distinctive neon-green glow style that is KEY to DarkPool's identity.

```
    ╭─────────╮
    │         │   ← Dark circle with green border
    │  💰🎲📊 │   ← Emoji or custom icon inside
    │         │
    ╰─────────╯
      ↓ glow
```

| Property | Value |
|----------|-------|
| Container size | 52x52px |
| Border radius | `9999px` (circle) |
| Background | `rgba(0, 200, 5, 0.08)` (very subtle green tint) |
| Border | `#00C805` 1.5px |
| Icon/Emoji size | 24-28px, centered |
| **Neon glow effect** | `shadowColor: '#00C805'`, `shadowOffset: { width: 0, height: 0 }`, `shadowOpacity: 0.40`, `shadowRadius: 10`, on iOS. On Android: use a slightly larger (58px) blurred green circle behind |
| Glow intensity | Medium — visible but not overpowering |

The glow creates a "neon sign" effect. This is achieved differently per platform:
- **iOS**: Native `shadow*` properties with green `shadowColor`
- **Android**: Layered view — a `blurRadius: 8` view with `backgroundColor: rgba(0, 200, 5, 0.25)` placed behind the icon circle, sized 4-6px larger

**Icon variants per channel type:**
- Announcements: 💰 (money bag emoji)
- Trading/Swings: 📊 (chart emoji)
- Discussion: 🎲 (dice emoji) or custom
- General: 💬 (chat bubble emoji)
- Alerts: 🔔 (bell emoji)

Each channel can have a custom emoji. The green neon treatment is consistent.

### 5.13 Screen Background

The screen background is NOT pure black. It's a layered gradient:

```
Layer 1 (base): #0A0E0A (solid dark green-black)
Layer 2 (optional gradient): 
  LinearGradient
    colors: ['#0A0E0A', '#0F1A0F', '#0A0E0A']
    locations: [0, 0.4, 1]
    start: { x: 0.5, y: 0 }
    end: { x: 0.5, y: 1 }
```

Some screens may add a subtle radial accent glow at the top:
```
Layer 3 (optional accent glow):
  RadialGradient centered at top
  colors: ['rgba(0, 200, 5, 0.04)', 'transparent']
  radius: 60% of screen width
```

Status bar: `light-content` (white text/icons on dark background).

---

## 6. Screen-by-Screen Patterns

### 6.1 Standard Screen Layout

Every screen follows this vertical structure:

```
┌─ SafeAreaView ─────────────────────────┐
│  ┌─ StatusBar (light-content) ────────┐ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌─ Header Glass Container ───────────┐ │  ← optional, for screens with prominent headers
│  │  Title (heroTitle / title)          │ │    background: rgba(15, 26, 15, 0.85) + blur
│  │  Subtitle (body, secondary color)   │ │    borderRadius: 20-24px
│  │                                     │ │    padding: 16-20px
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─ Tab Pills Row ────────────────────┐ │  ← optional, if screen has sub-tabs
│  │  [Active] [Inactive] [Inactive]    │ │    horizontal ScrollView
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─ Content Area (ScrollView) ────────┐ │  ← flex: 1
│  │                                     │ │    paddingHorizontal: 20px
│  │  [Cards / Lists / Content]          │ │
│  │                                     │ │
│  │                                     │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─ Bottom Tab Bar ───────────────────┐ │  ← fixed at bottom
│  │  [Tab] [Tab] [Tab] [Tab] [Tab]     │ │    glass background + blur
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 6.2 Header Patterns

#### Type A: Glass Container Header (News, Markets)
```
╭──────────────────────────────────╮
│       חדשות פיננסיות             │  ← heroTitle, centered, white
│  כל אירוע פיננסי שסוחר צריך     │  ← body, secondary, centered
╰──────────────────────────────────╯
```
- Background: `rgba(255, 255, 255, 0.05)` with `blur(20)`
- Border: `rgba(255, 255, 255, 0.08)` 1px
- Border radius: `20px`
- Padding: `20px` horizontal, `16px` vertical
- Text alignment: `center`
- Margin horizontal: `20px` (matches screen padding)

#### Type B: Simple Header (Detail screens, Settings)
```
←  Title text here
```
- Back button: 40x40px circle, `rgba(255, 255, 255, 0.06)` background
- Title: SemiBold 600, 18px, white
- No glass container
- Inline with back button

#### Type C: Toolbar Header (Swipe, Interactive screens)
```
[✕]  [👤👤👤 compact avatars]  3/12
```
- Close button left, compact user list center, counter right
- Background: transparent (merges with screen)

#### Type D: Action Header (Community, Profile, Chat)
```
  [🔔]           צ'אטים           [👤]
  left           center           right
```
- Title: Bold 700, 22px, `#FFFFFF`, centered
- Left action: Icon button (bell/notification), 36x36px circle
  - Border: `rgba(255, 255, 255, 0.15)` 1px
  - Background: transparent
  - Icon: 20px, `rgba(255, 255, 255, 0.70)`
- Right action: Icon button (profile/user), 36x36px circle
  - Border: `rgba(255, 255, 255, 0.15)` 1px
  - Background: transparent
  - Icon: 20px, `rgba(255, 255, 255, 0.70)`
- Layout: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`
- Padding horizontal: 20px
- No glass container — sits directly on screen background
- Notification badge (if unread): 8px red dot at top-right of bell icon

### 6.3 Tab Section Pattern

When a screen has sub-categories (like News with "Breaking", "Economic", "Quarterly"):

1. Tab row sits below the header, full width minus screen padding
2. Pills are scrollable horizontally if they overflow
3. Content below transitions with a subtle fade (150ms) when switching tabs
4. Pull-to-refresh is attached to the content scroll, not the whole screen

### 6.4 Community / Chat List Screen Pattern

This screen demonstrates several critical components:

```
┌─ SafeAreaView ──────────────────────────┐
│                                          │
│  [🔔]          צ'אטים          [👤]     │  ← Type D header
│                                          │
│           ╭─────╮                        │
│           │  +  │  ← FAB                 │  ← Floating Action Button (right-aligned)
│           ╰─────╯                        │
│            הוסף                          │
│                                          │
│  ╭──────────────────────────────╮        │
│  │  🔍  ...חיפוש               │        │  ← Search bar (glass)
│  ╰──────────────────────────────╯        │
│                                          │
│     [ לא נקראו ]    [ הכל ]             │  ← Filter pills
│       ^^active^^     ^^default^^         │
│                                          │
│  ┌──────────────────────────────┐        │
│  │  💰  הכרזות        20.1     │        │  ← Chat list items
│  │      18 חברים               │        │
│  ├──────────────────────────────┤        │  ← subtle divider
│  │  📊  סווינגים וסטאפים  16.3 │        │
│  │      2 חברים                │        │
│  ├──────────────────────────────┤        │
│  │  🎲  דיוני - פניסטוקס  16.3│        │
│  │      2 חברים                │        │
│  └──────────────────────────────┘        │
│                                          │
│  [קהילה] [שווקים] [חדשות] [יומן] [אקדמיה]│ ← Bottom tab bar
└──────────────────────────────────────────┘
```

### 6.5 Reusable Components Across Screens

| Component | Used In | Description |
|-----------|---------|-------------|
| Glass Card | News, Markets, Community | Semi-transparent card with blur |
| Pill Tabs | News, Markets, Academy | Horizontal tab navigation (select one) |
| Filter Pills | Community, Markets | Toggle ON/OFF chips (multi-select or single) |
| Search Bar | Community, Markets, Academy | Glass input with search icon (RTL) |
| FAB | Community | Green outlined circle with "+" for creation actions |
| Neon Icon | Community chat list | Green-glowing circular icon for channels |
| Chat List Item | Community | Row: neon icon + title + members + date |
| Avatar | Community, Chat, Lobby | Circular user photo with optional status dot |
| Badge | Markets, News | Small colored label (success/warning/info) |
| Price/Change Label | Markets | Green/red percentage with muted background |
| Action Row | News cards | Heart + share icons row |
| Section Header | All list screens | Title + "See all" link |
| Empty State | All screens | Icon + title + subtitle + CTA button, centered |
| Skeleton Loader | All content screens | Pulsing `rgba(255,255,255,0.06)` rectangles |
| Bottom Sheet | Various | Draggable modal from bottom |
| Toast / Snackbar | Global | Top or bottom notification bar |
| Action Header | Community, Profile | Title centered with icon buttons on sides |

---

## 7. Animation Guidelines

### Spring Configurations

| Type | Config | Usage |
|------|--------|-------|
| Default | `{ damping: 15, stiffness: 150, mass: 0.5 }` | General element transitions |
| Snappy | `{ damping: 20, stiffness: 300 }` | Button presses, tab switches |
| Gentle | `{ damping: 20, stiffness: 100, mass: 0.8 }` | Bottom sheet, modal entry |
| Bouncy | `{ damping: 10, stiffness: 150, mass: 0.5 }` | Fun interactions, celebrations |

### Timing Defaults

| Transition | Duration | Easing |
|-----------|----------|--------|
| Tab content switch | 150ms | ease-out |
| Card press feedback | 100ms | ease-in-out |
| Modal overlay fade | 200ms | ease-out |
| Screen transition | 250ms | ease-in-out |
| Skeleton shimmer | 1500ms | linear, infinite |
| Toast enter/exit | 300ms | spring |

### Press Feedback
- `TouchableOpacity` default: `activeOpacity={0.7}`
- Scale-down on press: `transform: [{ scale: 0.97 }]` for cards
- Never go below `opacity: 0.5` or `scale: 0.95`

---

## 8. Implementation Notes

### Theme File Structure
```
src/theme/
  ├── index.ts          (re-exports everything)
  ├── colors.ts         (all color tokens)
  ├── typography.ts     (font families + type scale)
  ├── spacing.ts        (spacing + borderRadius + shadows)
  └── darkColors.ts     (dark mode overrides — optional if using single theme)
```

### Key Dependencies
- `expo-blur` — BlurView for glass effects
- `expo-linear-gradient` — Gradient overlays
- `@expo-google-fonts/inter` — Typography
- `react-native-reanimated` — Animations
- `react-native-gesture-handler` — Gestures

### StatusBar
```tsx
<StatusBar style="light" backgroundColor="transparent" translucent />
```

### SafeAreaView
Always use `react-native-safe-area-context`'s `SafeAreaView`, NOT the one from `react-native`.

### RTL
```tsx
import { I18nManager } from 'react-native';
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);
```
