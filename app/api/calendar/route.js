import { list } from "@vercel/blob";

async function loadPosts() {
  try {
    const { blobs } = await list({ prefix: "marketing-os/posts" });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch { return []; }
}

export async function GET() {
  const posts = await loadPosts();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Marketing OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Marketing OS",
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H"
  ];

  const BRANDS = {
    domissoundco: "DOMISSOUNDCo",
    donsole: "Donsole",
    wheresmyradio: "WheresMyRadio",
    kitdesk: "kitdesk"
  };

  posts.filter(p => p.scheduledDate).forEach(post => {
    const d = post.scheduledDate.replace(/-/g, "");
    const brandName = BRANDS[post.brandId] || post.brandId;
    const STATUS_EMOJI = { planned: "📝", scheduled: "⏰", published: "✅" };
    const emoji = STATUS_EMOJI[post.status] || "📱";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${post.id}@marketing-os`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${d}`,
      `SUMMARY:${emoji} ${brandName} — ${post.platform}`,
      `DESCRIPTION:${(post.content || "").replace(/\n/g, "\\n").substring(0, 300)}`,
      `CATEGORIES:${brandName},${post.platform}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Disposition": 'inline; filename="marketing-os.ics"'
    }
  });
}
