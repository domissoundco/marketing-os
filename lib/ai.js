// lib/ai.js — Claude integration for post generation and critique.
// Critique lens: ActionCoach-style marketing — build trust through familiarity,
// be the giraffe (stand out), educate the viewer on solving their biggest problem,
// authentic voice, and be bold enough to be worth talking about.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  return new Anthropic({ apiKey });
}

function extractText(message) {
  return (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

function brandContext(brand) {
  const id = brand.identity || {};
  const parts = [];
  if (id.vision)      parts.push(`Vision: ${id.vision}`);
  if (id.mission)     parts.push(`Mission: ${id.mission}`);
  if (id.positioning) parts.push(`Positioning: ${id.positioning}`);
  if (id.coreOffer)   parts.push(`Core offer: ${id.coreOffer}`);
  if (id.audience)    parts.push(`Audience: ${id.audience}`);
  if (id.voice)       parts.push(`Voice & tone: ${id.voice}`);
  return parts.join('\n\n') || '(no identity set yet)';
}

const MARKETING_PHILOSOPHY = `Marketing lens (apply this throughout):
- Marketing is "waving at people and seeing who waves back." Outstanding marketing is the brand at its best, educating the viewer on how to solve their biggest problem.
- You can't build trust without familiarity — consistency and value over time. Each post should earn a little more trust.
- Be the giraffe: a post has to stand out, feel fresh, and create real value, or it's wallpaper.
- Lead with the reader's problem, not the brand's features.
- Authentic beats polished. It should sound like a real person worth listening to.
- Bold enough to be worth talking about — playing it safe is the most common failure.`;

async function fetchImageAsBase64(image) {
  const res = await fetch(image.url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    media_type: image.contentType || res.headers.get('content-type') || 'image/jpeg',
    data: buf.toString('base64'),
  };
}

async function buildImageBlocks(images) {
  if (!images?.length) return [];
  const blocks = [];
  for (const img of images) {
    try {
      const { media_type, data } = await fetchImageAsBase64(img);
      blocks.push({ type: 'image', source: { type: 'base64', media_type, data } });
    } catch (err) {
      console.error('Skipping image, fetch failed:', err.message);
    }
  }
  return blocks;
}

// ── Generate ──────────────────────────────────────────────────────────

export async function generatePost({ brand, brief, channel, images }) {
  const system = `You are a marketing copywriter writing for a specific brand. Output ONLY the post — no preamble, no commentary, no surrounding quotes. Match the brand's voice exactly. Tight, human, no filler.

${MARKETING_PHILOSOPHY}

BRAND
${brand.name}

BRAND IDENTITY
${brandContext(brand)}

CHANNEL
${channel || 'general social post'}`;

  const imageBlocks = await buildImageBlocks(images);
  const userContent = [
    ...imageBlocks,
    {
      type: 'text',
      text: imageBlocks.length
        ? `The image(s) above will be published alongside the post. Write copy that complements what's shown — don't describe it. Lead with the reader's problem.\n\nBRIEF\n${brief}\n\nOutput only the post text.`
        : `Write a single post for the brief below. Lead with the reader's problem, not the brand. Output only the post text.\n\nBRIEF\n${brief}`,
    },
  ];

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  return extractText(message);
}

// ── Critique ──────────────────────────────────────────────────────────

const PRINCIPLES = [
  { key: 'solvesProblem',  label: "Solves their problem", prompt: "Does it educate the reader on solving a real, specific problem THEY have — or is it really about the brand?" },
  { key: 'standsOut',      label: 'Stands out (giraffe)', prompt: 'Fresh and distinctive enough to stop the scroll, or generic wallpaper that gets ignored?' },
  { key: 'buildsTrust',    label: 'Builds trust',         prompt: 'Does it build familiarity and credibility — the kind of consistent, genuine presence that earns trust over time?' },
  { key: 'audienceFit',    label: 'Audience fit',         prompt: "Does it speak directly to the brand's stated audience, in their language?" },
  { key: 'authenticVoice', label: 'Authentic voice',      prompt: 'Sounds like the real person/brand at their best — not generic AI or corporate filler?' },
  { key: 'hook',           label: 'Hook',                 prompt: 'Does the first line earn attention and pull the reader in?' },
  { key: 'nextStep',       label: 'Path forward',         prompt: 'A clear next step that moves them along awareness → interest → conversion?' },
  { key: 'bold',           label: 'Bold enough',          prompt: 'Ballsy enough that someone would want to tell others about this brand — or is it playing it safe?' },
  { key: 'imageFit',       label: 'Copy ↔ image fit',     prompt: 'If images are attached: does the copy complement what is shown, or repeat/contradict it?' },
];

export async function critiquePost({ brand, draft, channel, images }) {
  const principlesUsed = images?.length ? PRINCIPLES : PRINCIPLES.filter((p) => p.key !== 'imageFit');
  const principlesBlock = principlesUsed
    .map((p) => `- "${p.key}" — ${p.label}: ${p.prompt}`)
    .join('\n');

  const system = `You are a sharp, no-nonsense marketing coach reviewing a draft post — think ActionCoach, not a corporate brand committee. Be direct, specific, and useful. No flattery, no hedging. Tell them what an outstanding version would do differently.

${MARKETING_PHILOSOPHY}

Return ONLY a JSON object, no preamble, no code fences. Schema:
{
  "scores": { "<key>": <number 1-5> },   // one score per principle key below
  "overall": <number 1-5>,                // overall rating
  "verdict": "<one-line gut-check>",
  "strengths": ["<bullet>", "<bullet>"], // 1-3 specific things working
  "fixes": ["<bullet>", "<bullet>"]      // 2-4 concrete edits that would make it outstanding
}

PRINCIPLES (use these exact keys in "scores"):
${principlesBlock}

BRAND
${brand.name}

BRAND IDENTITY
${brandContext(brand)}

CHANNEL
${channel || 'general social post'}`;

  const imageBlocks = await buildImageBlocks(images);
  const userContent = [
    ...imageBlocks,
    {
      type: 'text',
      text: imageBlocks.length
        ? `Critique this draft against the principles above, judging how the copy works with the image(s) shown. Output only the JSON object.\n\nDRAFT\n${draft}`
        : `Critique this draft against the principles above. Output only the JSON object.\n\nDRAFT\n${draft}`,
    },
  ];

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = extractText(message);
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Critique did not return valid JSON: ${text.slice(0, 200)}`);
  }
}

export const PRINCIPLE_LABELS = Object.fromEntries(
  PRINCIPLES.map((p) => [p.key, p.label])
);
