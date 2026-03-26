/**
 * CONTENT SEED — Layer 1: Identity Context
 *
 * Fetches Scott Echols' professional identity from the CV site's
 * public static endpoint. No API keys required — public JSON file.
 *
 * Falls back to hardcoded identity if the fetch fails, so the
 * writing agent always has context regardless of network state.
 */

export interface IdentityContext {
  name: string;
  title: string;
  expertise: string[];
  voice: string;
  current_focus: string;
  hashtags: string[];
}

const CV_IDENTITY_URL =
  'https://robertoscottecholscv.netlify.app/api/identity.json';

const FALLBACK_IDENTITY: IdentityContext = {
  name: 'Scott Echols',
  title: 'Founder & CEO, SeaTrace | Maritime Technology | Commons Good',
  expertise: [
    'Wild fisheries traceability',
    'Maritime supply chain AI',
    'Satellite + ground-truth data fusion',
    'Multi-agent programming systems',
  ],
  voice:
    'Direct, mission-driven, transparency advocate. Speaks to maritime industry leaders, investors, and technology partners. Confident builder, not corporate.',
  current_focus:
    'SeaTrace Four Pillars: SeaSide (satellite), DeckSide (vessel), DockSide (port), MarketSide (retail) — targeting operational excellence and investor demo readiness.',
  hashtags: ['#SeaTrace', '#Fisheries', '#MaritimeTech', '#SupplyChain', '#CommonGood', '#AI'],
};

export async function fetchIdentityContext(): Promise<IdentityContext> {
  try {
    const res = await fetch(CV_IDENTITY_URL, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return FALLBACK_IDENTITY;
    const data = await res.json();
    // Validate it has the fields we need
    if (data?.name && data?.voice && data?.expertise) {
      return data as IdentityContext;
    }
    return FALLBACK_IDENTITY;
  } catch {
    return FALLBACK_IDENTITY;
  }
}

export function buildIdentityPrompt(
  identity: IdentityContext,
  producerBrief?: string
): string {
  const lines = [
    `You are writing on behalf of ${identity.name}, ${identity.title}.`,
    `Voice: ${identity.voice}`,
    `Expertise: ${identity.expertise.join(', ')}.`,
    `Current focus: ${identity.current_focus}`,
    `Use these hashtags sparingly (2-3 max): ${identity.hashtags.join(' ')}.`,
    `Write in authentic first-person. No buzzwords. No corporate speak.`,
  ];

  if (producerBrief?.trim()) {
    lines.push(`\nPost topic / Producer Brief: ${producerBrief.trim()}`);
  }

  return lines.join('\n');
}
