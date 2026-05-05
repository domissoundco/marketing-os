import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MARKETING_SCORER = `You are an expert marketing strategist who scores social media posts for outstanding marketing quality.

Score posts on these 6 principles (each worth up to 2 points, max 10 total):
1. HOOK — Does the first line stop the scroll?
2. SINGLE MESSAGE — One clear point, not trying to say everything
3. CALL TO ACTION — Does it ask something of the reader, even subtly?
4. AUTHENTIC VOICE — Human, not corporate or generic
5. PLATFORM FIT — Tone matches the platform (LinkedIn ≠ Instagram)
6. RELEVANCE — Speaks directly to the target audience's real world

Return ONLY valid JSON:
{"score": 7, "breakdown": "Strong hook and authentic voice. Loses points: no clear CTA, hashtags feel generic.", "tip": "End with a question to drive comments."}`;

export async function POST(request) {
  try {
    const { system, prompt, imageUrl, imageBrief, score: needsScore, post: postToScore, platform } = await request.json();

    // Score an existing post
    if (needsScore && postToScore) {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: MARKETING_SCORER,
        messages: [{ role:"user", content:`Platform: ${platform}\n\nPost:\n${postToScore}\n\nScore this. Return only JSON.` }]
      });
      const text = msg.content?.find(b=>b.type==="text")?.text||"";
      try {
        return Response.json(JSON.parse(text.replace(/```json|```/g,"").trim()));
      } catch {
        return Response.json({ score:0, breakdown:"Could not score", tip:"" });
      }
    }

    // Generate from image + brief
    if (imageUrl && imageBrief) {
      const content = [];
      if (imageUrl.startsWith("http")) {
        content.push({ type:"image", source:{ type:"url", url:imageUrl } });
      }
      content.push({ type:"text", text:`Your brief from the person in this photo:\n"${imageBrief}"\n\n${prompt}` });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        messages: [{ role:"user", content }]
      });
      const text = msg.content?.find(b=>b.type==="text")?.text||"";
      try {
        return Response.json(JSON.parse(text.replace(/```json|```/g,"").trim()));
      } catch {
        return Response.json({ error:"Could not parse response" }, { status:500 });
      }
    }

    // Standard generation (includes refine)
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: system || "You are a helpful social media writer.",
      messages: [{ role:"user", content: prompt }]
    });
    const text = msg.content?.find(b=>b.type==="text")?.text||"";

    // Handle style memory response (plain text, not JSON)
    if (prompt.includes("style summary") || prompt.includes("style notes")) {
      return Response.json({ post: text.trim() });
    }

    try {
      return Response.json(JSON.parse(text.replace(/```json|```/g,"").trim()));
    } catch {
      return Response.json({ error:"Could not parse response" }, { status:500 });
    }

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message||"Generation failed" }, { status:500 });
  }
}
