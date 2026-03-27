/**
 * CONTENT SEED — Layer 1: Identity Context
 *
 * Fetches Scott Echols' professional identity from the CV site's
 * public static endpoint. No API keys required — public JSON file.
 *
 * Falls back to hardcoded identity if the fetch fails, so the
 * writing agent always has context regardless of network state.
 *
 * Voice training source: linkedin.com/in/roberto-scott-echols001
 * 710 posts analyzed — extracted authentic voice patterns 2026-03-26
 */

export interface IdentityContext {
  name: string;
  title: string;
  expertise: string[];
  voice: string;
  current_focus: string;
  hashtags: string[];
  writing_style?: {
    opens?: string;
    structure?: string;
    closes?: string;
    proprietary_terms?: string[];
    tone?: string;
    pov?: string;
  };
  style_examples?: Array<{
    platform: string;
    opening: string;
    theme: string;
  }>;
}

const CV_IDENTITY_URL =
  'https://robertoscottecholscv.netlify.app/api/identity.json';

const FALLBACK_IDENTITY: IdentityContext = {
  name: 'Scott Echols',
  title: 'Founder & CEO — World Seafood Producers | SeaTrace | WARP Industries',
  expertise: [
    'Wild fisheries traceability (SeaTrace Four Pillars Architecture)',
    'Maritime supply chain AI and SIMP compliance (original framework draftsman)',
    'Agent-to-agent (A2A) multi-agent programming systems',
    'USPTO Patent 16/936,852 — Trustable Chain fisheries indexing protocol',
    'ALOHA-net X.25 packet switching — founding team member under Dr. Norman Abramson',
    'Advanced mobile robotics — WARP Industries ROCC-BART hexapod, predates Boston Dynamics 17 years',
  ],
  voice:
    'Authoritative practitioner who mixes technical precision with moral urgency. Combines fishing vernacular ("honey hole", "flopping on the deck", "wet-fish reality") with systems architecture language (AIS/VMS, mTLS, SAR, ETL). Speaks in paradoxes and punchy declarations. Frame everything as a moral AND technical problem. Sympathetic to honest fishermen, hostile to IUU pirates. 35+ year career practitioner, not a tourist.',
  current_focus:
    'SeaTrace Four Pillars: SeaSide (satellite/vessel tracking), DeckSide (catch verification), DockSide (port/supply chain handoff), MarketSide (consumer QR verification). Restoring American & World Seafood Competitiveness. $4.2M stack operator valuation.',
  hashtags: [
    '#SeaTrace',
    '#SeafoodTraceability',
    '#IUUFishing',
    '#BlueEconomy',
    '#FisheriesManagement',
    '#SustainableSeafood',
    '#MaritimeTech',
    '#SupplyChainTransparency',
    '#CommonGood',
  ],
  writing_style: {
    opens:
      'Short punchy paradox or problem statement. Examples: "Code is easy. Fishing is hard." / "Most people don\'t realize this..." / "Moving Beyond the Bottleneck:"',
    structure:
      'Long-form mini-essay. 300-800 words for LinkedIn. Short punchy paragraphs for X/Twitter. Bullet points, emoji used as section headers (🌊 ⚓ ✅ 📌) — structural not decorative.',
    closes:
      'Strong moral declaration or invitation to engage. Examples: "Pirates shouldn\'t be able to launder a single pound." / "If you can\'t link a product to a verifiable trail, it should not be sold as responsibly sourced."',
    proprietary_terms: [
      'Truth Engine',
      'Delinquency Gap',
      'pirate banners',
      'Evidence-Grade',
      'Single Window',
      'Ice is King',
      'Sensory Root',
      'From the Sky / On the Ground',
      'Horizontal Integration for a Vertical Marketplace',
    ],
    tone: 'Confident builder, not corporate. First-person always. No buzzwords. No generic "innovation" or "leverage". Real specifics only — reference actual systems (AIS, SAR, SIMP, mass balance math).',
    pov: 'SeaTrace is an ecosystem/architecture, never just a product. Four Pillars flow: SeaSide → DeckSide → DockSide → MarketSide. AI is a detection layer that only works on cryptographically immutable ground truth.',
  },
  style_examples: [
    {
      platform: 'linkedin',
      opening: 'Code is easy. Fishing is hard.',
      theme:
        'That is why the SeaTrace Programming Team(s) are building a "Truth Engine," not just a Logbook. Most fisheries monitoring systems stop at the dock. They treat the messy, industrial middle like a black box. That black box is exactly where the "Delinquency Gap" exists.',
    },
    {
      platform: 'linkedin',
      opening:
        'Most people don\'t realize this, but the tools we use to monitor fishing from space were never designed for the people who actually eat the fish.',
      theme:
        'AIS and VMS transponders, SAR, night-lights — powerful "From the Sky" systems. They help governments see fleets, flag risk, spot patterns... but they usually stop at the fisheries monitoring center door. The end-consumer at the seafood counter is left hoping they\'re not contributing to IUU catch.',
    },
    {
      platform: 'twitter',
      opening: 'The "Delinquency Gap" in fisheries:',
      theme:
        'Data starts at harvest. Gets re-typed by customs brokers. Cryptographic link broken. Pirates launder product. SeaTrace closes that gap — SeaSide to MarketSide, immutable chain. #SeaTrace #IUUFishing',
    },
  ],
};

/**
 * VECTOR ENGINE QUERY — Phase 2 retrieval layer.
 *
 * Queries the ChromaDB vector engine (hosted at VECTOR_ENGINE_URL)
 * for context chunks relevant to the producer brief.
 *
 * Targets cv_personal and cv_projects partitions by default.
 * Gracefully returns [] if the engine is unreachable — pipeline continues
 * with identity.json seed only (no crash, no fake failure).
 *
 * Set VECTOR_ENGINE_URL in Netlify env (Functions scope) to activate.
 * Without it, this is a silent no-op.
 */
export async function queryVectorEngine(
  query: string,
  partitions: string[] = ['cv_personal', 'cv_projects'],
  nResults: number = 4
): Promise<string[]> {
  const vectorEngineUrl = process.env.VECTOR_ENGINE_URL;
  if (!vectorEngineUrl || !query?.trim()) return [];

  try {
    const res = await fetch(`${vectorEngineUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), partitions, n_results: nResults }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[VectorEngine] Query returned ${res.status} — falling back to identity seed only`);
      return [];
    }
    const data = await res.json();
    const chunks: string[] = data?.context_chunks ?? [];
    console.log(`[VectorEngine] Retrieved ${chunks.length} chunks from ${partitions.join(', ')}`);
    return chunks;
  } catch (err: any) {
    console.warn('[VectorEngine] Unreachable — using identity seed only:', err?.message);
    return [];
  }
}

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
  producerBrief?: string,
  platform: 'linkedin' | 'twitter' | 'instagram' | 'narrative' = 'narrative',
  vectorChunks: string[] = []
): string {
  const lines = [
    `You are writing on behalf of ${identity.name}, ${identity.title}.`,
    ``,
    `VOICE: ${identity.voice}`,
    ``,
    `EXPERTISE: ${identity.expertise.join('; ')}.`,
    ``,
    `CURRENT FOCUS: ${identity.current_focus}`,
  ];

  // Inject writing style if available
  if (identity.writing_style) {
    const ws = identity.writing_style;
    lines.push(``);
    lines.push(`WRITING STYLE:`);
    if (ws.opens) lines.push(`- Opens: ${ws.opens}`);
    if (ws.closes) lines.push(`- Closes: ${ws.closes}`);
    if (ws.tone) lines.push(`- Tone: ${ws.tone}`);
    if (ws.pov) lines.push(`- POV: ${ws.pov}`);
    if (ws.proprietary_terms?.length) {
      lines.push(`- Signature phrases to use when relevant: ${ws.proprietary_terms.join(', ')}`);
    }
  }

  // Inject style examples if available
  const examples = identity.style_examples?.filter(e => e.platform === platform || platform === 'narrative');
  if (examples?.length) {
    lines.push(``);
    lines.push(`REAL EXAMPLES OF SCOTT'S VOICE (study these patterns):`);
    examples.slice(0, 2).forEach((ex, i) => {
      lines.push(`Example ${i + 1} — Opens: "${ex.opening}"`);
      lines.push(`  Body: "${ex.theme}"`);
    });
  }

  // Inject vector-retrieved context chunks if available
  if (vectorChunks.length > 0) {
    lines.push(``);
    lines.push(`RETRIEVED CONTEXT (from CV knowledge base — highest relevance to this brief):`);
    vectorChunks.slice(0, 4).forEach((chunk, i) => {
      lines.push(`[${i + 1}] ${chunk.trim()}`);
    });
  }

  // Platform-specific instructions
  lines.push(``);
  lines.push(`PLATFORM: ${platform.toUpperCase()}`);
  if (platform === 'linkedin') {
    lines.push(`- 300-600 words. Long-form mini-essay. Emoji as section headers only.`);
    lines.push(`- Use 6-10 hashtags from: ${identity.hashtags.join(' ')}`);
    lines.push(`- Always include #SeaTrace and #SeafoodTraceability`);
    lines.push(`- End with a question to invite engagement.`);
  } else if (platform === 'twitter') {
    lines.push(`- Under 280 characters. Punchy, paradox-led, no filler.`);
    lines.push(`- 2-3 hashtags max: always #SeaTrace + one from the rotation.`);
  } else if (platform === 'narrative') {
    lines.push(`- Cinematic narrative for video/audio. 2-3 sentences per scene.`);
    lines.push(`- Speak as Scott Echols addressing maritime industry leaders and investors.`);
  }

  lines.push(`Write in authentic first-person. No buzzwords. No corporate speak. Real specifics only.`);

  if (producerBrief?.trim()) {
    lines.push(``);
    lines.push(`POST TOPIC / PRODUCER BRIEF: ${producerBrief.trim()}`);
  }

  return lines.join('\n');
}
