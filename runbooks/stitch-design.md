# 🎨 Stitch Design Runbook — SirTrav-A2A-Studio

> **Maintainer:** Antigravity Agent  
> **Last Updated:** 2026-01-30  
> **Purpose:** Document design patterns, prompts, and system tokens

---

## 🎯 Design System Overview

### Brand Identity
- **Name:** SirTrav A2A Studio
- **Vibe:** Premium, futuristic, motion-forward
- **Theme:** Dark mode with coral accents
- **Feel:** Like a high-end video production suite

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#1a1a2e` | Main backgrounds |
| `--color-secondary` | `#16213e` | Card backgrounds |
| `--color-accent` | `#e94560` | Buttons, highlights |
| `--color-success` | `#0f3460` | Success states |
| `--color-text` | `#ffffff` | Primary text |
| `--color-text-muted` | `#a0a0a0` | Secondary text |
| `--color-border` | `#2a2a4a` | Borders, dividers |

### Typography
| Element | Font | Weight | Size |
|---------|------|--------|------|
| H1 | Inter | 700 | 36px |
| H2 | Inter | 600 | 28px |
| H3 | Inter | 600 | 22px |
| Body | Inter | 400 | 16px |
| Small | Inter | 400 | 14px |
| Mono | JetBrains Mono | 400 | 14px |

### Spacing Scale (8px grid)
```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

### Border Radius
```
sm:   4px
md:   8px
lg:   16px
xl:   24px
pill: 9999px
```

---

## 🎬 Component Patterns

### Pattern: Agent Card
```
/design agent status card with:
- Dark glassmorphism background (#1a1a2e + backdrop-blur)
- Coral accent border on left edge
- Avatar circle with status indicator
- Agent name (Inter 600, 18px)
- Status badge (pill shape, success/warning/error)
- Last activity timestamp (muted text)
```

**Implementation Notes:**
- Use `backdrop-filter: blur(10px)`
- Status indicator: 8px circle, absolute positioned
- Hover: subtle glow effect

### Pattern: Click-to-Kick Button
```
/design primary action button with:
- SirTrav coral (#e94560) background
- White text, Inter 600
- 12px 24px padding
- 8px border radius
- Hover: lighten 10%
- Active: darken 5%
- Disabled: 50% opacity
- Loading: spinner icon + "Processing..."
```

**States:**
1. Default: Ready to click
2. Hover: Cursor pointer, color shift
3. Active: Pressed effect
4. Loading: Spinner, text change
5. Disabled: Greyed out
6. Success: Green flash, checkmark
7. Error: Red flash, shake animation

### Pattern: Pipeline Progress Bar
```
/design pipeline progress indicator with:
- 7 connected segments (one per agent)
- Inactive: #2a2a4a
- Active: animated pulse in coral
- Complete: solid coral
- Error: red with X icon
- Labels below each segment
```

**Segments:**
1. Curator
2. Writer (Gemini)
3. Voice (ElevenLabs)
4. Motion (Remotion)
5. Compiler
6. Publisher
7. Memory

### Pattern: Video Preview Card
```
/design video preview card with:
- 16:9 aspect ratio thumbnail
- Play button overlay (centered)
- Duration badge (bottom right)
- Title below thumbnail
- "Post to X" and "Post to LinkedIn" buttons
- Glassmorphism card background
```

### Pattern: Dashboard Stats
```
/design dashboard stat cards grid with:
- 4 cards in a row
- Each card: icon, value, label
- Values in 32px bold
- Subtle hover lift effect
- Icons use coral accent
```

Stats to show:
- Total Renders
- API Calls
- Est. Cost
- Uptime %

---

## 🔄 Stitch Prompts That Work

### Dashboard
```
/design modern dark dashboard for video production studio with:
- Left sidebar navigation (icons + labels)
- Top bar with logo and user avatar
- Main area with 4 stat cards
- Recent activity list
- Quick action buttons
- Color scheme: dark navy (#1a1a2e) with coral accent (#e94560)
```

### Settings Page
```
/design settings page with:
- Tabs: General, API Keys, Preferences, Billing
- Form fields with labels above
- Toggle switches for boolean options
- Save/Cancel buttons at bottom
- Dark theme matching main app
```

### Social Publisher Panel
```
/design social media publisher panel with:
- Preview of content to post
- Platform toggles (X, LinkedIn, YouTube, Instagram, TikTok)
- Each platform shows connection status
- "Publish All" primary button
- "Schedule" secondary button
- Cost estimate display
```

### Motion Template Picker
```
/design motion template picker grid with:
- 3 columns of template cards
- Each card: preview thumbnail, name, duration
- Hover shows "Use Template" button
- Filter tabs at top (Intro, Outro, Social, Custom)
```

---

## 📋 Design Review Checklist

Before handing off to Codex:

- [ ] Follows brand colors exactly
- [ ] Uses correct typography scale
- [ ] 8px spacing grid maintained
- [ ] Dark mode only (no light mode)
- [ ] Hover/focus states defined
- [ ] Loading states considered
- [ ] Error states designed
- [ ] Mobile responsive breakpoints noted
- [ ] Accessibility contrast checked (4.5:1+)
- [ ] Exported to `artifacts/antigravity/`

---

## 🎨 CSS Variables Export

```css
:root {
  /* Colors */
  --color-primary: #1a1a2e;
  --color-secondary: #16213e;
  --color-accent: #e94560;
  --color-success: #0f3460;
  --color-warning: #f39c12;
  --color-error: #e74c3c;
  --color-text: #ffffff;
  --color-text-muted: #a0a0a0;
  --color-border: #2a2a4a;
  
  /* Typography */
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-pill: 9999px;
  
  /* Shadows */
  --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-elevated: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
  --shadow-glow: 0 0 20px rgba(233, 69, 96, 0.3);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;
}
```

---

## 🦅 Agent Attribution

All designs generated by **Antigravity** using Google Stitch MCP.

Implemented by **Codex** following these specifications.

*For The Commons Good!*
