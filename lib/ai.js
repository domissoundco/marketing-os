// lib/ai.js — Claude integration for post generation and critique.
// Supports image inputs via Claude's multimodal API.

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
  if (id.audience)    parts.push(`Audience: ${id.audience}`);
  if (id.voice)       parts.push(`Voice & tone: ${id.voice}`);
  return parts.join('\n\n') || '(no identity set yet)';
}

// Fetch a private blob and return base64-encoded content + media type.
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
  const system = `You are a marketing copywriter writing for a specific brand. You only write the post — no preamble, no commentary, no quotes around the output. Match the brand's voice exactly. Keep it tight.

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
        ? `The image(s) above will be published alongside the post. Write copy that fits what's actually shown — don't describe the image, complement it.\n\nBRIEF\n${brief}\n\nOutput only the post text.`
        : `Write a single post for the brief below. Output only the post text.\n\nBRIEF\n${brief}`,
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
  { key: 'singleMessage',  label: 'Single clear message',     prompt: 'Does the post communicate one main thing, or is it muddled?' },
  { key: 'audienceFit',    label: 'Audience fit',             prompt: "Does it speak directly to the brand's stated audience in language they'd use?" },
  { key: 'hook',           label: 'Hook',                     prompt: 'Does the first line earn the reader continuing? Specific, surprising, or useful?' },
  { key: 'specificity',    label: 'Specificity',              prompt: 'Concrete details and proof, or vague claims and adjectives?' },
  { key: 'voiceMatch',     label: 'Voice match',              prompt: "Does it sound like the brand's defined voice, not generic AI prose?" },
  { key: 'cta',            label: 'Clear next step',          prompt: 'Is it obvious what the reader should do, think, or feel next?' },
  { key: 'lengthFit',      label: 'Length appropriate',       prompt: "Right length for the channel? Cut what doesn't earn its place." },
  { key: 'imageFit',       label: 'Copy ↔ image fit',         prompt: 'If images are attached: does the copy complement what is shown, or repeat / contradict it?' },
];

export async function critiquePost({ brand, draft, channel, images }) {
  const principlesUsed = images?.length ? PRINCIPLES : PRINCIPLES.filter((p) => p.key !== 'imageFit');
  const principlesBlock = principlesUsed
    .map((p) => `- "${p.key}" — ${p.label}: ${p.prompt}`)
    .join('\n');

  const system = `You are a senior marketing director reviewing a draft post against marketing principles. Be direct, specific, and useful. No flattery, no hedging.

Return ONLY a JSON object, no preamble, no code fences. Schema:
{
  "scores": { "<key>": <number 1-5> },   // one score per principle key below
  "overall": <number 1-5>,                // your overall rating
  "verdict": "<one-line summary>",
  "strengths": ["<bullet>", "<bullet>"], // 1-3 specific things working
  "fixes": ["<bullet>", "<bullet>"]      // 2-4 concrete edits to make
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
        ? `Critique this draft post against the principles above, paying attention to how the copy fits the image(s) shown. Output only the JSON object.\n\nDRAFT\n${draft}`
        : `Critique this draft post against the principles above. Output only the JSON object.\n\nDRAFT\n${draft}`,
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
