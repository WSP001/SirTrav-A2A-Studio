/**
 * UTILITY LIBRARY (lib/utils.ts)
 * 
 * Common utilities used across the project.
 * Pattern: Centralized helpers for consistency.
 */

import { type ClassValue, clsx } from 'clsx';

/**
 * Combine class names with conditional logic
 * Works like Next.js/shadcn pattern: cn("base", condition && "extra")
 */
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

/**
 * Generate a unique run ID for tracing
 */
export function generateRunId(prefix = 'run'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format currency with Commons Good 20% markup
 */
export function formatCost(baseCost: number, includeMarkup = true): string {
    const total = includeMarkup ? baseCost * 1.2 : baseCost;
    return `$${total.toFixed(4)}`;
}

/**
 * Calculate Commons Good cost breakdown
 */
export function calculateCost(baseCost: number) {
    const markup = 0.20;
    return {
        base: baseCost,
        markup: baseCost * markup,
        total: baseCost * (1 + markup),
    };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return then.toLocaleDateString();
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Check if running in browser
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if running in development
 */
export const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';
