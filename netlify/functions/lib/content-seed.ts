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
  process.env.CV_TRUTH_PACK_URL ||
  process.env.CV_IDENTITY_URL ||
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
 * RETRIEVAL PACK — structured prompt payload assembled before Writer runs.
 *
 * Three typed sections from separate ChromaDB partitions:
 *   cv_identity      — who Scott is, career, expertise
 *   cv_style_examples — voice patterns, real post examples
 *   cv_projects      — SeaTrace, SirTrav, Sir James, WAFC project context
 *
 * assembled: pre-built prompt block ready for direct injection.
 * No loose chunks reach the Writer — one structured payload only.
 */
export interface RetrievalPack {
  identity: string[];
  styleExamples: string[];
  projects: string[];
  assembled: string;
}

const EMPTY_PACK: RetrievalPack = {
  identity: [],
  styleExamples: [],
  projects: [],
  assembled: '',
};

/** Single-partition fetch — internal helper. Returns [] on any failure. */
async function fetchPartition(
  vectorEngineUrl: string,
  query: string,
  partition: string,
  nResults: number
): Promise<string[]> {
  try {
    const res = await fetch(`${vectorEngineUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, partitions: [partition], n_results: nResults }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.context_chunks ?? [];
  } catch {
    return [];
  }
}

/**
 * ASSEMBLE RETRIEVAL PACK — fan out to 3 partitions in parallel,
 * return one structured prompt payload for the Writer.
 *
 * Gracefully returns EMPTY_PACK if VECTOR_ENGINE_URL is not set
 * or the engine is unreachable — pipeline continues with identity.json seed.
 */
export async function assembleRetrievalPack(
  query: string,
  _platform: string = 'narrative'
): Promise<RetrievalPack> {
  const vectorEngineUrl = process.env.VECTOR_ENGINE_URL;
  if (!vectorEngineUrl || !query?.trim()) return EMPTY_PACK;

  const q = query.trim();

  const [identity, styleExamples, projects] = await Promise.all([
    fetchPartition(vectorEngineUrl, q, 'cv_identity', 3),
    fetchPartition(vectorEngineUrl, q, 'cv_style_examples', 2),
    fetchPartition(vectorEngineUrl, q, 'cv_projects', 3),
  ]);

  const total = identity.length + styleExamples.length + projects.length;
  if (total === 0) return EMPTY_PACK;

  console.log(`[RetrievalPack] ${identity.length} identity · ${styleExamples.length} style · ${projects.length} project chunks`);

  const sections: string[] = ['RETRIEVED KNOWLEDGE PACK (CV — verified context):'];

  if (identity.length > 0) {
    sections.push('');
    sections.push('🧠 IDENTITY:');
    identity.forEach(c => sections.push(c.trim()));
  }
  if (styleExamples.length > 0) {
    sections.push('');
    sections.push('✍️ STYLE EXAMPLES:');
    styleExamples.forEach(c => sections.push(c.trim()));
  }
  if (projects.length > 0) {
    sections.push('');
    sections.push('🗂️ PROJECTS:');
    projects.forEach(c => sections.push(c.trim()));
  }

  return { identity, styleExamples, projects, assembled: sections.join('\n') };
}

/** Legacy single-partition query — kept for backwards compat. Use assembleRetrievalPack() for new work. */
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
    if (!res.ok) return [];
    const data = await res.json();
    return data?.context_chunks ?? [];
  } catch {
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

/** Detect whether a producer brief is about music/rap/production rather than SeaTrace/maritime. */
function isProducerBrief(brief?: string): boolean {
  if (!brief) return false;
  const lower = brief.toLowerCase();
  return /\b(rap|beat|drop|track|verse|hook|bars|producer|music|studio|bpm|sample|mix|master|record|lyric|rhyme|flow|freestyle|album|single|ep|tape|tiktok|reel|sirtrav studio)\b/.test(lower);
}

export function buildIdentityPrompt(
  identity: IdentityContext,
  producerBrief?: string,
  platform: 'linkedin' | 'twitter' | 'instagram' | 'narrative' = 'narrative',
  retrievalPack: string = ''
): string {
  const producerMode = isProducerBrief(producerBrief);

  // Producer mode: swap voice and context to SirTrav Studio creative identity
  if (producerMode) {
    const producerLines = [
      `You are writing on behalf of R. Scott Echols — independent rap producer and director at SirTrav Studio.`,
      ``,
      `VOICE: First-person, direct, street-credible but cerebral. References production craft (808s, sample chops, layering, director cuts). Speaks as a 35-year practitioner, not a hype man. No filler. No corporate speak. Every line earns its place.`,
      ``,
      `CREDIT LINE: Produced by SirTrav | Directed by R. Scott Echols`,
      ``,
      `STYLE: Short punchy sentences. Hook-first. Producer's perspective — behind the board, not on the mic (unless the brief says otherwise). Paradox openings work well. End with impact, not with a fade.`,
    ];

    if (retrievalPack) {
      producerLines.push(``);
      producerLines.push(retrievalPack);
    }

    producerLines.push(``);
    producerLines.push(`PLATFORM: ${platform.toUpperCase()}`);
    if (platform === 'instagram' || platform === 'twitter') {
      producerLines.push(`- 150-220 characters for Instagram. Under 280 for Twitter/X.`);
      producerLines.push(`- 5-8 hashtags: always #SirTravStudio #ProducedBySirTrav + 3-5 from rotation.`);
      producerLines.push(`- Hashtag rotation: #RapProducer #DirectorCut #OriginalMusic #BeatMaker #IndependentProducer #AIAssistedProduction`);
    } else if (platform === 'narrative') {
      producerLines.push(`- Cinematic director's cut format. 2-3 sentences per scene.`);
      producerLines.push(`- Speak as the producer/director: what the beat does, what the cut reveals, what the listener feels.`);
    } else if (platform === 'linkedin') {
      producerLines.push(`- 200-400 words. Behind-the-scenes producer perspective. What the creative process actually looks like.`);
      producerLines.push(`- 4-6 hashtags: #SirTravStudio #ProducedBySirTrav #IndependentProducer #OriginalMusic`);
    }

    producerLines.push(`Write in authentic first-person. No buzzwords. Real craft specifics only.`);

    if (producerBrief?.trim()) {
      producerLines.push(``);
      producerLines.push(`PRODUCER BRIEF / DROP TOPIC: ${producerBrief.trim()}`);
    }

    return producerLines.join('\n');
  }

  // Default: SeaTrace / maritime voice
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

  // Inject retrieval pack if assembled
  if (retrievalPack) {
    lines.push(``);
    lines.push(retrievalPack);
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
  } else if (platform === 'instagram') {
    lines.push(`- 150-220 characters caption. Hook-first, punchy, one strong image in words.`);
    lines.push(`- 5-7 hashtags: #SeaTrace #IUUFishing + 3-4 from rotation.`);
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
