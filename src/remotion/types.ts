/**
 * ZOD SCHEMAS FOR REMOTION PROPS
 * 
 * These schemas ensure "Garbage In" never becomes "Garbage Out."
 * The generate-motion-graphic agent validates all input against these
 * before burning Lambda compute credits.
 */
import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * Common props shared across all compositions
 */
export const BasePropsSchema = z.object({
    projectId: z.string().min(1),
    runId: z.string().optional(),
    theme: z.enum(['default', 'dark', 'light', 'neon', 'minimal']).default('default'),
});

export type BaseProps = z.infer<typeof BasePropsSchema>;

// ============================================================================
// COMPOSITION-SPECIFIC SCHEMAS
// ============================================================================

/**
 * IntroSlate - Bold title card with logo animation
 */
export const IntroSlatePropsSchema = BasePropsSchema.extend({
    title: z.string().max(60, "Title too long for legibility"),
    subtitle: z.string().max(100).optional(),
    logoUrl: z.string().url().optional(),
    showDate: z.boolean().default(true),
});

export type IntroSlateProps = z.infer<typeof IntroSlatePropsSchema>;

/**
 * Changelog - Feature list with animated checkmarks
 */
export const ChangelogPropsSchema = BasePropsSchema.extend({
    title: z.string().default("What's New"),
    features: z.array(z.object({
        text: z.string(),
        icon: z.string().optional(), // Emoji or icon name
        highlight: z.boolean().optional(),
    })).min(1).max(6, "Too many features for one slide"),
    version: z.string().optional(),
});

export type ChangelogProps = z.infer<typeof ChangelogPropsSchema>;

/**
 * OutroCredits - Attribution and call-to-action
 */
export const OutroCreditsPropsSchema = BasePropsSchema.extend({
    credits: z.array(z.object({
        role: z.string(),
        name: z.string(),
    })).max(10),
    ctaText: z.string().default("Subscribe for more"),
    ctaUrl: z.string().url().optional(),
    commonsGoodAttribution: z.string().optional(),
});

export type OutroCreditsProps = z.infer<typeof OutroCreditsPropsSchema>;

/**
 * SocialPromo - Vertical format teaser
 */
export const SocialPromoPropsSchema = BasePropsSchema.extend({
    headline: z.string().max(40, "Headline too long for mobile"),
    mediaUrl: z.string().url(), // Image or video URL
    mediaType: z.enum(['image', 'video']),
    ctaText: z.string().max(20).default("Watch Now"),
});

export type SocialPromoProps = z.infer<typeof SocialPromoPropsSchema>;

// ============================================================================
// MOTION CONFIG SCHEMA (Used by generate-motion-graphic agent)
// ============================================================================

export const MotionConfigSchema = z.object({
    templateId: z.enum(['IntroSlate', 'Changelog', 'OutroCredits', 'SocialPromo', 'SirTrav-Main']),
    props: z.record(z.any()), // Validated against template-specific schema
    projectId: z.string().min(1),
    runId: z.string().optional(),
    platform: z.enum(['youtube', 'instagram', 'tiktok', 'linkedin']).default('youtube'),
    forceRegenerate: z.boolean().default(false),
});

export type MotionConfig = z.infer<typeof MotionConfigSchema>;

// ============================================================================
// RENDER RESULT SCHEMA
// ============================================================================

export const RenderResultSchema = z.object({
    success: z.boolean(),
    renderId: z.string().optional(),
    outputUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    durationMs: z.number().optional(),
    cost: z.object({
        renderTime: z.number(), // Seconds
        estimatedUsd: z.number(),
    }).optional(),
    error: z.string().optional(),
});

export type RenderResult = z.infer<typeof RenderResultSchema>;

// ============================================================================
// MEMORY PREFERENCE SCHEMA (For regenerative learning)
// ============================================================================

export const MotionPreferenceSchema = z.object({
    preferredTemplates: z.array(z.string()).default([]),
    dislikedTemplates: z.array(z.string()).default([]),
    preferredTheme: z.enum(['default', 'dark', 'light', 'neon', 'minimal']).optional(),
    pacingPreference: z.enum(['slow', 'medium', 'fast']).default('medium'),
    colorPreference: z.enum(['vibrant', 'muted', 'monochrome']).optional(),
    lastSuccessfulConfig: z.record(z.any()).optional(),
});

export type MotionPreference = z.infer<typeof MotionPreferenceSchema>;
