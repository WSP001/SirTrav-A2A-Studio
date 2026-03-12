export interface QualityCheckItem {
    check: string;
    passed: boolean;
    severity: 'error' | 'warning';
    message: string;
    value?: string | number;
    threshold?: string | number;
}

export interface QualityCheckResult {
    passed: boolean;
    degraded: boolean;
    errors: string[];
    warnings: string[];
    items: QualityCheckItem[];
    summary: string;
}

// Patterns that indicate upstream API failures leaked into the narrative.
// Intentionally technical/log-shaped to avoid false positives on normal prose.
const API_ERROR_PATTERNS = [
    /^Error:/m,                   // Stack trace leader
    /API error/i,                 // Explicit API failure
    /rate.?limit exceeded/i,      // Rate limiting (not just "rate limit" in prose)
    /401 unauthorized/i,          // HTTP 401 (not just "unauthorized" as a word)
    /403 forbidden/i,             // HTTP 403
    /quota exceeded/i,            // API quota
    /ECONNREFUSED/,               // Node connection error (case-sensitive)
    /ETIMEDOUT/,                  // Node timeout error (case-sensitive)
    /fetch failed/i,              // Fetch API failure
    /status: ?5\d\d/,             // HTTP 5xx in logged response
];

export async function inspectOutput(artifacts: {
    scriptText?: string;
    audioUrl?: string;
    videoUrl?: string;
    images?: Array<{ url: string }>;
}): Promise<QualityCheckResult> {
    const items: QualityCheckItem[] = [];

    // Check 1: Script exists and has minimum length
    const scriptLen = artifacts.scriptText?.length || 0;
    items.push({
        check: 'script_length',
        passed: scriptLen >= 50,
        severity: 'error',
        message: scriptLen >= 50
            ? `Script is ${scriptLen} characters`
            : `Script too short or missing (${scriptLen} chars, need 50+)`,
        value: scriptLen,
        threshold: 50,
    });

    // Check 2: Script does not contain API error traces
    const hasApiError = artifacts.scriptText
        ? API_ERROR_PATTERNS.some(p => p.test(artifacts.scriptText!))
        : false;
    items.push({
        check: 'script_no_api_errors',
        passed: !hasApiError,
        severity: 'error',
        message: hasApiError
            ? 'Script contains an API error message — upstream agent likely failed'
            : 'Script content is clean',
    });

    // Check 3: Audio URL format (warning-only — placeholder is acceptable)
    if (artifacts.audioUrl) {
        const validAudio = artifacts.audioUrl.startsWith('http')
            || artifacts.audioUrl.startsWith('/')
            || artifacts.audioUrl.startsWith('placeholder://');
        items.push({
            check: 'audio_url_format',
            passed: validAudio,
            severity: 'warning',
            message: validAudio
                ? 'Audio URL format is valid'
                : `Invalid audio URL format: ${artifacts.audioUrl.substring(0, 60)}`,
        });
    }

    // Check 4: Images present (warning-only)
    const imageCount = artifacts.images?.length || 0;
    if (artifacts.images !== undefined) {
        items.push({
            check: 'images_present',
            passed: imageCount > 0,
            severity: 'warning',
            message: imageCount > 0
                ? `${imageCount} image(s) available`
                : 'No images generated — video will use fallback assets',
            value: imageCount,
        });
    }

    // Check 5: Video output exists
    items.push({
        check: 'video_output',
        passed: !!artifacts.videoUrl,
        severity: 'error',
        message: artifacts.videoUrl
            ? 'Video output generated'
            : 'No video output generated — Editor agent may have failed',
    });

    // Derive backward-compatible fields
    const errors = items.filter(i => !i.passed && i.severity === 'error').map(i => i.message);
    const warnings = items.filter(i => !i.passed && i.severity === 'warning').map(i => i.message);
    const passed = errors.length === 0;
    const degraded = passed && warnings.length > 0;

    const totalChecks = items.length;
    const passedChecks = items.filter(i => i.passed).length;
    const summary = passed
        ? (degraded
            ? `${passedChecks}/${totalChecks} checks passed with ${warnings.length} warning(s)`
            : `${passedChecks}/${totalChecks} checks passed`)
        : `Quality gate failed: ${errors.length} error(s), ${warnings.length} warning(s)`;

    return { passed, degraded, errors, warnings, items, summary };
}
