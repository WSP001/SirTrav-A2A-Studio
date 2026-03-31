/**
 * Brand Token Source of Truth — 24K Gold Palette
 * SirScott / A2A Studio v1.6.0
 *
 * AGENT RULE: All agents (Codex, Claude, Antigravity, Windsurf) must import
 * from this file for TypeScript usage. CSS vars in App.css must stay in sync.
 *
 * CSS vars (App.css :root):
 *   --brand-primary   → BRAND.primary
 *   --brand-secondary → BRAND.secondary
 *   --brand-accent    → BRAND.accent
 */

export const BRAND = {
    /** 24K gold base — primary interactive accent */
    primary: '#d4af37',
    /** Warm gold highlight — secondary / hover states */
    secondary: '#f2c94c',
    /** Dark gold shadow — accent / pressed states */
    accent: '#b8860b',
    /** Glow rgba for primary — e.g. box-shadow */
    glow: 'rgba(212, 175, 55, 0.4)',
    /** Glow rgba for accent */
    glowAccent: 'rgba(184, 134, 11, 0.4)',
} as const;

export type BrandKey = keyof typeof BRAND;

/**
 * X/Twitter platform identity color — keep separate from brand palette.
 * Do NOT replace with gold.
 */
export const PLATFORM_COLORS = {
    twitter: '#1DA1F2',
} as const;
