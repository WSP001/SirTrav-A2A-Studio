export interface QualityCheckResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
}

export async function inspectOutput(artifacts: {
    scriptText?: string;
    audioUrl?: string;
    videoUrl?: string;
    images?: Array<{ url: string }>;
}): Promise<QualityCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Script validation
    if (!artifacts.scriptText || artifacts.scriptText.length < 50) {
        errors.push('Script too short or missing');
    }
    if (artifacts.scriptText?.includes('Error:')) {
        errors.push('Script contains API error message');
    }

    // Check 2: Audio validation
    if (artifacts.audioUrl) {
        if (!artifacts.audioUrl.startsWith('http') && !artifacts.audioUrl.startsWith('/') && !artifacts.audioUrl.startsWith('placeholder://')) {
            errors.push('Invalid audio URL format');
        }
    }

    // Check 3: Image validation
    if (artifacts.images && artifacts.images.length === 0) {
        warnings.push('No images generated');
    }

    // Check 4: Video validation
    if (!artifacts.videoUrl) {
        errors.push('No video output generated');
    }

    return {
        passed: errors.length === 0,
        errors,
        warnings
    };
}
