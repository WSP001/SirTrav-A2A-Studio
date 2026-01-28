/**
 * BRANDING TOKEN SYSTEM (The "One Mind's Eye" Truth File)
 * 
 * All visual identity is centralized here so upstream agents can read
 * and manipulate the aesthetic physics of the SirTrav universe.
 * 
 * RULE: Never hardcode colors/fonts in components. Always import from here.
 */
import { staticFile } from 'remotion';

// ============================================================================
// THEME CONFIGURATION (The Aesthetic Physics)
// ============================================================================
export const THEME = {
    colors: {
        // Primary Palette
        primary: "#3b82f6",      // Electric Blue - Main CTA
        secondary: "#1e293b",    // Slate Dark - Backgrounds
        accent: "#f59e0b",       // Amber - Highlights
        background: "#0f172a",   // Deep Space - Canvas

        // Semantic Colors
        success: "#22c55e",      // Green - Positive feedback
        error: "#ef4444",        // Red - Errors
        warning: "#eab308",      // Yellow - Caution

        // Text Colors
        textPrimary: "#f8fafc",  // White - Headlines
        textSecondary: "#94a3b8", // Gray - Body text
        textMuted: "#64748b",    // Dim - Captions

        // Gradients (for motion graphics)
        gradientStart: "#3b82f6",
        gradientEnd: "#8b5cf6",
    },

    typography: {
        title: "Inter, system-ui, sans-serif",
        body: "Roboto Mono, monospace",
        display: "Space Grotesk, system-ui, sans-serif",
    },

    spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 48,
        xl: 96,
    },

    animation: {
        defaultEasing: [0.25, 0.1, 0.25, 1], // Cubic bezier
        staggerDelay: 5, // Frames between staggered elements
        entranceDuration: 15, // Frames for entrance animations
        exitDuration: 10, // Frames for exit animations
    },
};

// ============================================================================
// ASSET PATHS (Resolved correctly for both local preview and Lambda)
// ============================================================================
export const ASSETS = {
    // Logos
    logo: staticFile("/logo.png"),
    logoWhite: staticFile("/logo-white.png"),
    logoMark: staticFile("/logo-mark.png"),

    // Audio
    introSound: staticFile("/audio/intro-beat.mp3"),
    outroSound: staticFile("/audio/outro-stinger.mp3"),
    transitionSound: staticFile("/audio/whoosh.mp3"),

    // Overlays
    noiseTexture: staticFile("/textures/noise.png"),
    gradientOverlay: staticFile("/textures/gradient-overlay.png"),

    // Placeholder (for when no user content)
    placeholder: staticFile("/placeholder.jpg"),
};

// ============================================================================
// TEMPLATE CONFIGURATIONS (Presets for different use cases)
// ============================================================================
export const TEMPLATES = {
    IntroSlate: {
        id: "IntroSlate",
        label: "Intro Slate",
        icon: "🎬",
        duration: 150, // 5 seconds @ 30fps
        description: "Bold title card with logo animation",
    },
    Changelog: {
        id: "Changelog",
        label: "Changelog",
        icon: "📋",
        duration: 300, // 10 seconds @ 30fps
        description: "Feature list with animated checkmarks",
    },
    OutroCredits: {
        id: "OutroCredits",
        label: "Outro Credits",
        icon: "🎭",
        duration: 180, // 6 seconds @ 30fps
        description: "Attribution and call-to-action",
    },
    SocialPromo: {
        id: "SocialPromo",
        label: "Social Promo",
        icon: "📱",
        duration: 90, // 3 seconds @ 30fps (Instagram/TikTok)
        description: "Vertical format teaser clip",
        width: 1080,
        height: 1920,
    },
} as const;

export type TemplateId = keyof typeof TEMPLATES;

// ============================================================================
// PLATFORM PRESETS (Output specifications)
// ============================================================================
export const PLATFORMS = {
    youtube: {
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264' as const,
        audioBitrate: '192k',
        lufs: -14,
    },
    instagram: {
        width: 1080,
        height: 1920,
        fps: 30,
        codec: 'h264' as const,
        audioBitrate: '128k',
        lufs: -14,
    },
    tiktok: {
        width: 1080,
        height: 1920,
        fps: 30,
        codec: 'h264' as const,
        audioBitrate: '128k',
        lufs: -14,
    },
    linkedin: {
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264' as const,
        audioBitrate: '192k',
        lufs: -16,
    },
} as const;

export type PlatformId = keyof typeof PLATFORMS;
