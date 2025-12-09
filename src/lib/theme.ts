/**
 * Theme Attachment Utility v1.0.0
 * --------------------------------
 * Manages localStorage persistence for project theme songs.
 * Used by SunoPromptWizard (write) and CreativeHub (read).
 * 
 * Storage key: sj:theme:<projectId>
 */

export type ThemeAttachment = {
  projectId: string;
  filename: string;           // e.g., suno_week44_weekly_reflective_88bpm_90s.mp3
  url: string;                // e.g., /music/suno_week44_weekly_reflective_88bpm_90s.mp3
  bpm?: number;               // Beats per minute for sync
  gridPath?: string;          // e.g., /data/beat-grids/filename.json
  durationSec?: number;       // Track duration in seconds
  template?: string;          // Template ID used (weekly_reflective, etc.)
  attachedAt?: string;        // ISO timestamp when attached
};

/**
 * Generate localStorage key for project theme
 */
const key = (projectId: string) => `sj:theme:${projectId}`;

/**
 * Get attached theme for a project
 * @returns ThemeAttachment or null if none attached
 */
export function getTheme(projectId: string): ThemeAttachment | null {
  if (!projectId) return null;
  try {
    const raw = localStorage.getItem(key(projectId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Set or remove theme attachment for a project
 * @param projectId - Project identifier
 * @param theme - Theme attachment object, or null to remove
 */
export function setTheme(projectId: string, theme: ThemeAttachment | null): void {
  if (!projectId) return;
  
  if (!theme) {
    localStorage.removeItem(key(projectId));
    // Dispatch storage event for cross-component sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: key(projectId),
      oldValue: localStorage.getItem(key(projectId)),
      newValue: null,
    }));
    return;
  }
  
  // Enrich with timestamp
  const enriched: ThemeAttachment = {
    ...theme,
    projectId,
    attachedAt: theme.attachedAt || new Date().toISOString(),
  };
  
  const json = JSON.stringify(enriched);
  localStorage.setItem(key(projectId), json);
  
  // Dispatch storage event for cross-component sync
  window.dispatchEvent(new StorageEvent('storage', {
    key: key(projectId),
    oldValue: null,
    newValue: json,
  }));
}

/**
 * Check if a project has an attached theme
 */
export function hasTheme(projectId: string): boolean {
  return getTheme(projectId) !== null;
}

/**
 * Get all attached themes (for debugging/admin)
 */
export function getAllThemes(): ThemeAttachment[] {
  const themes: ThemeAttachment[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('sj:theme:')) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) themes.push(JSON.parse(raw));
      } catch {}
    }
  }
  return themes;
}

/**
 * Build themePreference object for pipeline requests
 */
export function buildThemePreference(
  attachTheme: boolean,
  theme: ThemeAttachment | null
): { attached: boolean; url?: string; filename?: string; bpm?: number; gridPath?: string; durationSec?: number } {
  if (!attachTheme || !theme) {
    return { attached: false };
  }
  
  return {
    attached: true,
    url: theme.url,
    filename: theme.filename,
    bpm: theme.bpm,
    gridPath: theme.gridPath,
    durationSec: theme.durationSec,
  };
}
