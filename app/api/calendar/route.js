import { list } from "@vercel/blob";

async function loadPosts() {
  try {
    const { blobs } = await list({ prefix: "marketing-os/posts", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function GET() {
  const posts = await loadPosts();
  const BRANDS = { domissoundco: "DOMISSOUNDCo", donsole: "Donsole", wheresmyradio: "WheresMyRadio", kitdesk: "kitdesk" };
  const STATUS_EMOJI = { planned: "📝", scheduled: "⏰", published: "✅" };
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Marketing OS//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Marketing OS","REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  posts.filter(p => p.scheduledDate).forEach(post => {
    const d = post.scheduledDate.replace(/-/g, "");
    lines.push("BEGIN:VEVENT",`UID:${post.id}@marketing-os`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,`DTSTART;VALUE=DATE:${d}`,`DTEND;VALUE=DATE:${d}`,`SUMMARY:${STATUS_EMOJI[post.status]||"📱"} ${BRANDS[post.brandId]||post.brandId} — ${post.platform}`,`DESCRIPTION:${(post.content||"").replace(/\n/g,"\\n").substring(0,200)}`,"END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-cache" } });
}
