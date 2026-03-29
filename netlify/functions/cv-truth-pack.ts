import type { Handler } from '@netlify/functions';

type SupportedPlatform = 'linkedin' | 'twitter' | 'instagram' | 'narrative';

interface CvIdentityPayload {
  display_name?: string;
  full_name?: string;
  name?: string;
  title?: string;
  contact?: {
    email?: string;
    github?: string;
  };
  creative_credits?: {
    role?: string;
    studio?: string;
    credit_line?: string;
    disciplines?: string[];
  };
  current_focus?: string[];
  verified_live_claims?: string[];
  trust_policy?: string[];
  public_projects?: string[];
  planned_projects?: string[];
  yearsExperience?: number;
  hashtags?: {
    core?: string[];
    creative_producer?: string[];
    social_bio_line?: string;
  };
  producer_style_examples?: Array<{
    platform?: string;
    opening?: string;
    theme?: string;
  }>;
  last_updated?: string;
}

const DEFAULT_IDENTITY_URL = 'https://robertoscottecholscv.netlify.app/api/identity.json';

function normalizePlatform(input?: string): SupportedPlatform {
  const value = (input || '').toLowerCase();
  if (value === 'linkedin') return 'linkedin';
  if (value === 'instagram') return 'instagram';
  if (value === 'twitter' || value === 'x') return 'twitter';
  return 'narrative';
}

function buildProducerBrief(identity: CvIdentityPayload, platform: SupportedPlatform) {
  const displayName = identity.display_name || identity.full_name || identity.name || 'R. Scott Echols';
  const title = identity.title || 'Solutions Architect';
  const currentFocus = (identity.current_focus || []).slice(0, 3).join('; ');
  const verifiedClaims = (identity.verified_live_claims || []).slice(0, 3).join(' ');
  const projects = (identity.public_projects || []).slice(0, 4).join(', ');
  const bioLine = identity.hashtags?.social_bio_line || '';
  const example = (identity.producer_style_examples || []).find((item) => item.platform === platform)
    || (identity.producer_style_examples || [])[0];

  const shared = [
    `Write from the verified public identity of ${displayName}.`,
    `Anchor on the current title: ${title}.`,
    currentFocus ? `Keep the post tied to these live priorities: ${currentFocus}.` : '',
    projects ? `Only reference confirmed public projects: ${projects}.` : '',
    verifiedClaims ? `Use only these confirmed live claims: ${verifiedClaims}` : '',
    bioLine ? `Social bio line to stay consistent with: ${bioLine}.` : '',
    `Do not invent history, roles, deployments, or product claims that are not in the CV truth pack.`,
  ].filter(Boolean);

  const platformSpecific: Record<SupportedPlatform, string[]> = {
    linkedin: [
      `Format as a grounded LinkedIn post from Scott: first-person, clear, no hype, no fake founder mythology.`,
      `Connect the Studio work back to the professional CV identity and the Commons Good mission.`,
    ],
    twitter: [
      `Format as an X post seed: punchy, first-person, under a tweet-sized idea, with one clean point.`,
      `Prioritize SirTrav Studio + SeaTrace + agentic systems overlap if the visuals support it.`,
    ],
    instagram: [
      `Format as an Instagram caption seed: visual-first, first-person, direct, no filler.`,
      `Lean into producer/director perspective when the media is creative work.`,
    ],
    narrative: [
      `Format as a cinematic producer brief for the Studio writer agent.`,
      `Make the through-line clear before the agent writes scenes or captions.`,
    ],
  };

  const exampleLine = example?.opening
    ? `Use this proven opening pattern when it fits: "${example.opening}"${example.theme ? ` — ${example.theme}` : ''}.`
    : '';

  return [...shared, ...platformSpecific[platform], exampleLine].filter(Boolean).join(' ');
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'method_not_allowed' }),
    };
  }

  try {
    const platform = normalizePlatform(event.queryStringParameters?.platform);
    const sourceUrl = process.env.CV_TRUTH_PACK_URL || process.env.CV_IDENTITY_URL || DEFAULT_IDENTITY_URL;
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw new Error(`identity_fetch_failed_${response.status}`);
    }

    const identity = await response.json() as CvIdentityPayload;

    if (!identity?.title || !(identity.display_name || identity.name || identity.full_name)) {
      throw new Error('identity_payload_invalid');
    }

    const hashtags = platform === 'linkedin'
      ? identity.hashtags?.core || []
      : identity.hashtags?.creative_producer || identity.hashtags?.core || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sourceUrl,
        fetchedAt: new Date().toISOString(),
        profile: {
          displayName: identity.display_name || identity.name,
          fullName: identity.full_name || identity.name,
          title: identity.title,
          email: identity.contact?.email || '',
          yearsExperience: identity.yearsExperience || null,
          currentFocus: identity.current_focus || [],
          verifiedClaims: identity.verified_live_claims || [],
          publicProjects: identity.public_projects || [],
          plannedProjects: identity.planned_projects || [],
          creditLine: identity.creative_credits?.credit_line || '',
          socialBioLine: identity.hashtags?.social_bio_line || '',
          lastUpdated: identity.last_updated || '',
        },
        socialSeed: {
          platform,
          producerBrief: buildProducerBrief(identity, platform),
          hashtags,
          trustPolicy: identity.trust_policy || [],
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'cv_truth_pack_failed',
      }),
    };
  }
};

export default handler;
