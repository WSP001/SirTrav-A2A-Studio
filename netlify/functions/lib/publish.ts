import { createHmac } from 'crypto';
import { videoStore } from './storage';

/**
 * PUBLISH & WIPE SECURITY MODULE
 * 
 * 1. Exchange: Generates signed, time-limited URLs for final artifacts.
 * 2. Wipe: Flushes sensitive API keys from memory to prevent leakage.
 */

export interface PublishResult {
    signedUrl: string;
    expiresAt: string;
    mode: 'blobs_edge_guard' | 'public_fallback';
}

const SIGNING_SECRET = process.env.NETLIFY_AUTH_TOKEN || 'local-dev-secret';

/**
 * Generates a secured, time-limited URL for the final video.
 * In a real Netlify setup, this would correspond to an Edge Function checking the signature.
 */
export async function publishVideo(
    videoKey: string,
    expiryHours: number = 24
): Promise<PublishResult> {
    try {
        // 1. Calculate Expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiryHours);
        const expiresTimestamp = expiresAt.getTime();

        // 2. Get the base URL
        let baseUrl = '';

        if (videoKey.startsWith('/') || videoKey.startsWith('http')) {
            // It's already a path or URL (e.g. fallback asset or direct link)
            baseUrl = videoKey;
        } else {
            // It's a blob key, look it up
            const blobRef = await videoStore.get(videoKey);

            if (blobRef.ok && blobRef.metadata && blobRef.metadata.url) {
                baseUrl = blobRef.metadata.url;
            } else if (blobRef.ok && blobRef.data) {
                // If we have raw data but no URL logic in metadata, fall back to a constructed path
                // In a real environment, this might be a blob store ID. 
                // For consistency with verify-golden-path, we assume the blob store puts publicUrl in metadata or we construct one.
                baseUrl = `/local-blobs/${videoKey}`;
            } else {
                throw new Error(`Video blob not found: ${videoKey}`);
            }
        }

        // If it's already a public URL (e.g. local dev), just sign it logically
        const urlObj = new URL(baseUrl, process.env.URL || 'http://localhost:8888');

        // 3. Generate HMAC Signature (The "Lock")
        // Sign: path + expiration
        const payload = `${urlObj.pathname}:${expiresTimestamp}`;
        const signature = createHmac('sha256', SIGNING_SECRET)
            .update(payload)
            .digest('hex');

        // 4. Append params
        urlObj.searchParams.set('exp', String(expiresTimestamp));
        urlObj.searchParams.set('sig', signature);

        return {
            signedUrl: urlObj.toString(),
            expiresAt: expiresAt.toISOString(),
            mode: 'blobs_edge_guard'
        };

    } catch (error) {
        console.error('❌ [Publish] Failed to generate signed URL:', error);
        // Fallback: return raw key logic or null, but prefer throwing to ensure safety
        throw error;
    }
}

/**
 * Wipes sensitive credentials from the current process environment.
 * This ensures that subsequent code (or exploited dependencies) cannot access keys.
 * Note: In Netlify Functions, this affects the recycled warm container.
 */
export function flushCredentials(): void {
    const SENSITIVE_KEYS = [
        'OPENAI_API_KEY',
        'ELEVENLABS_API_KEY',
        'SUNO_API_KEY',
        'STRIPE_SECRET_KEY',
        'NETLIFY_AUTH_TOKEN'
    ];

    let wipedCount = 0;
    SENSITIVE_KEYS.forEach(key => {
        if (process.env[key]) {
            delete process.env[key];
            wipedCount++;
        }
    });

    console.log(`🔒 [Security] Wiped ${wipedCount} sensitive keys from memory.`);
}
