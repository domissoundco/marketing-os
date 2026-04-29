'use client'
import { useState, useEffect, useCallback } from "react";

const BRANDS = {
  domissoundco: {
    id: "domissoundco",
    name: "DOMISSOUNDCo",
    short: "DSC",
    color: "#FF6B35",
    accent: "#FFD700",
    desc: "Freelance Audio, RF & Comms Tech",
    voice: `You are writing social media content for DOMISSOUNDCo, a freelance audio, RF and comms systems technician who has worked with artists including Massive Attack, Björk, Groove Armada, Sophie Ellis-Bextor and Belinda Carlisle. The tone is confident, professional, insider knowledge — the voice of a seasoned touring and corporate audio professional. Never boastful, just matter-of-fact expertise. Use industry language naturally. Posts should feel like they come from someone who really knows their craft and has seen it all — from complex MIDI-triggered corporate shows to festival RF coordination.`,
    platforms: ["Instagram", "LinkedIn"],
    tagline: "Audio · RF · Comms Systems"
  },
  donsole: {
    id: "donsole",
    name: "Donsole",
    short: "DON",
    color: "#00D4AA",
    accent: "#0099CC",
    desc: "Venue Audio & Lighting",
    voice: `You are writing social media content for Donsole, a venue audio and lighting provider focused on doing small gigs brilliantly. The tone is warm, local, passionate about live music — the kind of people who genuinely care that every band sounds great regardless of the venue size. Friendly, approachable, community-focused. Speaks to local bands, promoters and event organisers.`,
    platforms: ["Facebook", "Instagram"],
    tagline: "Small Gigs Done Brilliantly"
  },
  wheresmyradio: {
    id: "wheresmyradio",
    name: "WheresMyRadio",
    short: "WMR",
    color: "#7C3AED",
    accent: "#10B981",
    desc: "Two-Way Radio Hire",
    voice: `You are writing social media content for WheresMyRadio, a two-way radio hire company specialising in Motorola radios with a strong green ethos — well-packed, reliable, eco-conscious. The tone is efficient, no-nonsense, reliable. Speaks to event producers, stage managers and corporate event planners who need comms sorted without hassle. Emphasise reliability, easy hire process and the green credentials.`,
    platforms: ["Instagram", "Facebook"],
    tagline: "Motorola Radio Hire · Green Ethos"
  },
  kitdesk: {
    id: "kitdesk",
    name: "kitdesk",
    short: "KD",
    color: "#E11D48",
    accent: "#FB923C",
    desc: "Hire Management Software",
    voice: `You are writing social media content for kitdesk, hire management software built by a working director of a small hire company who got fed up with overpriced, bloated alternatives and built his own. The tone is straight-talking, industry-insider, founder-led — never corporate, never salesy. Speaks directly to small AV and event hire companies, freelancers and one-man-bands who've outgrown spreadsheets. Key messages: built by someone who lives this world, simple and cheap, you don't pay for what you're not going to use, scales with you, makes small companies look bigger than they are. Price point around £9.99/month. The founder has worked with Massive Attack, Björk and other major artists — this is software with real credibility behind it.`,
    platforms: ["LinkedIn", "Facebook"],
    tagline: "Hire Management · Built for the Real World"
  }
};

const PLATFORMS = ["LinkedIn", "Facebook", "Instagram", "Twitter/X"];
const STORAGE_KEY = "marketing-os-v1";

function loadData() {
  if (typeof window === 'undefined') return { posts: [], images: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { posts: [], images: {} };
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function generateICS(posts) {
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Marketing OS//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  posts.filter(p => p.scheduledDate).forEach(post => {
    const d = post.scheduledDate.replace(/-/g, "");
    const brand = BRANDS[post.brandId];
    lines.push("BEGIN:VEVENT",`UID:${post.id}@marketing-os`,`DTSTART;VALUE=DATE:${d}`,`DTEND;VALUE=DATE:${d}`,`SUMMARY:📱 ${brand?.name} — ${post.platform}`,`DESCRIPTION:${(post.content||"").replace(/\n/g,"\\n").substring(0,200)}`,"END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS(posts) {
  const blob = new Blob([generateICS(posts)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "marketing-os.ics"; a.click();
  URL.revokeObjectURL(url);
}

const STATUS_COLORS = { planned: "#6B7280", scheduled: "#F59E0B", published: "#10B981" };
const STATUS_LABELS = { planned: "Planned", scheduled: "Scheduled", published: "Published" };

export default function MarketingOS() {
  const [mounted, setMounted] = useState(false);
  const [activeBrand, setActiveBrand] = useState("kitdesk");
  const [activeTab, setActiveTab] = useState("generate");
  const [data, setData] = useState({ posts: [], images: {} });

  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [genError, setGenError] = useState("");

  const [showPostForm, setShowPostForm] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [postForm, setPostForm] = useState({ platform: "LinkedIn", scheduledDate: "", content: "", status: "planned", notes: "", stats: "" });

  const [calMonth, setCalMonth] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() }; });
  const [imageCaption, setImageCaption] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { setMounted(true); setData(loadData()); }, []);

  const persist = useCallback((newData) => { setData(newData); saveData(newData); }, []);
  const brand = BRANDS[activeBrand];
  const brandPosts = data.posts.filter(p => p.brandId === activeBrand);
  const brandImages = (data.images[activeBrand] || []);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true); setGenError(""); setGenerated(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: brand.voice,
          messages: [{ role: "user", content: `Write a ${platform} post about: "${topic}"\n\nReturn ONLY a JSON object:\n{\n  "post": "ready to copy-paste post text",\n  "hashtags": "3-5 relevant hashtags",\n  "tip": "one short posting tip"\n}\nNo markdown, no backticks, raw JSON only.` }]
        })
      });
      const json = await res.json();
      const text = json.content?.find(b => b.type === "text")?.text || "";
      setGenerated(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch { setGenError("Generation failed — check your connection and try again."); }
    setGenerating(false);
  }

  function saveGeneratedPost() {
    if (!generated) return;
    const post = { id: Date.now().toString(), brandId: activeBrand, platform, content: `${generated.post}\n\n${generated.hashtags}`, status: "planned", scheduledDate: "", notes: generated.tip || "", stats: "", createdAt: new Date().toISOString() };
    persist({ ...data, posts: [post, ...data.posts] });
    setGenerated(null); setTopic(""); setActiveTab("posts");
  }

  function openNewPost() {
    setEditPost(null);
    setPostForm({ platform: brand.platforms[0] || "LinkedIn", scheduledDate: "", content: "", status: "planned", notes: "", stats: "" });
    setShowPostForm(true);
  }

  function openEditPost(post) {
    setEditPost(post);
    setPostForm({ platform: post.platform, scheduledDate: post.scheduledDate || "", content: post.content || "", status: post.status || "planned", notes: post.notes || "", stats: post.stats || "" });
    setShowPostForm(true);
  }

  function savePost() {
    if (editPost) {
      persist({ ...data, posts: data.posts.map(p => p.id === editPost.id ? { ...p, ...postForm } : p) });
    } else {
      persist({ ...data, posts: [{ id: Date.now().toString(), brandId: activeBrand, createdAt: new Date().toISOString(), ...postForm }, ...data.posts] });
    }
    setShowPostForm(false);
  }

  function deletePost(id) {
    if (!confirm("Delete this post?")) return;
    persist({ ...data, posts: data.posts.filter(p => p.id !== id) });
  }

  function cycleStatus(post) {
    const cycle = { planned: "scheduled", scheduled: "published", published: "planned" };
    persist({ ...data, posts: data.posts.map(p => p.id === post.id ? { ...p, status: cycle[p.status] || "planned" } : p) });
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = { id: Date.now().toString(), src: reader.result, caption: imageCaption, createdAt: new Date().toISOString() };
      persist({ ...data, images: { ...data.images, [activeBrand]: [...(data.images[activeBrand] || []), img] } });
      setImageCaption("");
    };
    reader.readAsDataURL(file); e.target.value = "";
  }

  function deleteImage(imgId) {
    persist({ ...data, images: { ...data.images, [activeBrand]: (data.images[activeBrand] || []).filter(i => i.id !== imgId) } });
  }

  function calDays() {
    const { year, month } = calMonth;
    return { first: (new Date(year, month, 1).getDay() + 6) % 7, days: new Date(year, month + 1, 0).getDate() };
  }

  function postsOnDay(day) {
    const { year, month } = calMonth;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return data.posts.filter(p => p.scheduledDate === dateStr);
  }

  function handleCopy(text) {
    navigator.clipboard?.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  if (!mounted) return <div style={{ background: "#0A0A0A", minHeight: "100vh" }} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#E8E8E8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        textarea { resize: vertical; }
        .brand-btn { transition: all 0.15s ease; } .brand-btn:hover { transform: translateY(-1px); }
        .tab-btn { transition: all 0.15s ease; } .tab-btn:hover { opacity: 1 !important; }
        .post-card:hover { border-color: #444 !important; }
        .action-btn { transition: opacity 0.15s ease; cursor: pointer; } .action-btn:hover { opacity: 0.7; }
        .img-card:hover .img-delete { opacity: 1 !important; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} } .generating { animation: pulse 1.2s infinite; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } .fade-in { animation: fadeIn 0.3s ease; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1A1A1A", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 3, color: brand.color }}>MARKETING OS</span>
          <span style={{ fontSize: 11, color: "#444", letterSpacing: 2 }}>v1.0</span>
        </div>
        <button onClick={() => downloadICS(data.posts)} style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#888", padding: "6px 12px", fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 4, fontFamily: "inherit" }}>↓ ICS EXPORT</button>
      </div>

      {/* Brand switcher */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #1A1A1A", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.values(BRANDS).map(b => (
          <button key={b.id} className="brand-btn" onClick={() => setActiveBrand(b.id)} style={{ background: activeBrand === b.id ? b.color : "#111", color: activeBrand === b.id ? "#000" : "#666", border: `1px solid ${activeBrand === b.id ? b.color : "#222"}`, padding: "8px 16px", fontSize: 11, letterSpacing: 2, cursor: "pointer", borderRadius: 4, fontFamily: "inherit", fontWeight: activeBrand === b.id ? 500 : 400 }}>
            {b.name.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Brand bar */}
      <div style={{ padding: "10px 20px", background: "#0E0E0E", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ fontSize: 11, color: brand.color, letterSpacing: 2 }}>{brand.tagline}</span>
          <span style={{ fontSize: 11, color: "#444", marginLeft: 12 }}>· {brandPosts.length} posts · {brandImages.length} images</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {brand.platforms.map(p => <span key={p} style={{ fontSize: 10, color: "#555", border: "1px solid #222", padding: "2px 8px", borderRadius: 3, letterSpacing: 1 }}>{p.toUpperCase()}</span>)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 20px", borderBottom: "1px solid #1A1A1A", display: "flex", gap: 0, overflowX: "auto" }}>
        {[["generate","⚡ GENERATE"],["posts","📋 POSTS"],["calendar","📅 CALENDAR"],["images","🖼 IMAGES"]].map(([id, label]) => (
          <button key={id} className="tab-btn" onClick={() => setActiveTab(id)} style={{ background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === id ? brand.color : "transparent"}`, color: activeTab === id ? brand.color : "#444", padding: "14px 16px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit", opacity: activeTab === id ? 1 : 0.6, whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>

        {/* GENERATE */}
        {activeTab === "generate" && (
          <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 8 }}>WHAT'S THE TOPIC OR UPDATE?</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={`e.g. "just shipped radios to a festival" or "new asset tracking feature live"`}
                style={{ width: "100%", background: "#111", border: "1px solid #222", color: "#E8E8E8", padding: 14, fontSize: 13, fontFamily: "inherit", borderRadius: 6, minHeight: 90 }} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: "block", fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 8 }}>PLATFORM</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ width: "100%", background: "#111", border: "1px solid #222", color: "#E8E8E8", padding: "10px 14px", fontSize: 13, fontFamily: "inherit", borderRadius: 6 }}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ background: brand.color, color: "#000", border: "none", padding: "10px 28px", fontSize: 12, letterSpacing: 2, cursor: generating || !topic.trim() ? "not-allowed" : "pointer", borderRadius: 6, fontFamily: "inherit", fontWeight: 500, opacity: generating || !topic.trim() ? 0.5 : 1 }}>
                  {generating ? <span className="generating">GENERATING...</span> : "GENERATE POST"}
                </button>
              </div>
            </div>

            {genError && <div style={{ background: "#1A0A0A", border: "1px solid #440000", padding: 14, borderRadius: 6, color: "#FF6B6B", fontSize: 12, marginBottom: 16 }}>{genError}</div>}

            {generated && (
              <div className="fade-in" style={{ background: "#111", border: `1px solid ${brand.color}33`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 11, color: brand.color, letterSpacing: 2, marginBottom: 12 }}>✓ GENERATED · {platform.toUpperCase()}</div>
                <div style={{ background: "#0A0A0A", padding: 16, borderRadius: 6, marginBottom: 12, lineHeight: 1.7, fontSize: 13, whiteSpace: "pre-wrap" }}>{generated.post}</div>
                <div style={{ fontSize: 12, color: "#7C3AED", marginBottom: 12 }}>{generated.hashtags}</div>
                {generated.tip && <div style={{ fontSize: 11, color: "#555", borderLeft: "2px solid #222", paddingLeft: 12, marginBottom: 16 }}>💡 {generated.tip}</div>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => handleCopy(`${generated.post}\n\n${generated.hashtags}`)} style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: copied ? "#10B981" : "#888", padding: "8px 16px", fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 4, fontFamily: "inherit" }}>
                    {copied ? "✓ COPIED" : "COPY"}
                  </button>
                  <button onClick={saveGeneratedPost} style={{ background: brand.color, border: "none", color: "#000", padding: "8px 16px", fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 4, fontFamily: "inherit", fontWeight: 500 }}>
                    SAVE TO POSTS →
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[["PLANNED", brandPosts.filter(p => p.status==="planned").length, "#6B7280"],["SCHEDULED", brandPosts.filter(p=>p.status==="scheduled").length,"#F59E0B"],["PUBLISHED",brandPosts.filter(p=>p.status==="published").length,"#10B981"]].map(([label, count, color]) => (
                <div key={label} style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color }}>{count}</div>
                  <div style={{ fontSize: 10, color: "#444", letterSpacing: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POSTS */}
        {activeTab === "posts" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: "#444", letterSpacing: 2 }}>{brandPosts.length} POSTS</span>
              <button onClick={openNewPost} style={{ background: brand.color, border: "none", color: "#000", padding: "8px 16px", fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 4, fontFamily: "inherit", fontWeight: 500 }}>+ NEW POST</button>
            </div>
            {brandPosts.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#333", fontSize: 13 }}>No posts yet — generate one or add manually.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {brandPosts.map(post => (
                <div key={post.id} className="post-card" style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 8, padding: 16, transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "#555", border: "1px solid #222", padding: "2px 8px", borderRadius: 3, letterSpacing: 1 }}>{post.platform?.toUpperCase()}</span>
                      <button onClick={() => cycleStatus(post)} style={{ fontSize: 10, color: STATUS_COLORS[post.status], border: `1px solid ${STATUS_COLORS[post.status]}44`, padding: "2px 8px", borderRadius: 3, letterSpacing: 1, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                        {STATUS_LABELS[post.status]?.toUpperCase()}
                      </button>
                      {post.scheduledDate && <span style={{ fontSize: 10, color: "#555", letterSpacing: 1 }}>📅 {post.scheduledDate}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="action-btn" onClick={() => openEditPost(post)} style={{ fontSize: 11, color: "#555", background: "transparent", border: "none" }}>EDIT</button>
                      <button className="action-btn" onClick={() => deletePost(post.id)} style={{ fontSize: 11, color: "#FF6B6B", background: "transparent", border: "none" }}>DEL</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#BBB", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{post.content?.substring(0,240)}{post.content?.length > 240 ? "..." : ""}</div>
                  {post.notes && <div style={{ fontSize: 11, color: "#555", borderLeft: "2px solid #222", paddingLeft: 10, marginTop: 8 }}>💡 {post.notes}</div>}
                  {post.stats && <div style={{ fontSize: 11, color: "#10B981", marginTop: 6 }}>📊 {post.stats}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {activeTab === "calendar" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month-1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: "transparent", border: "1px solid #222", color: "#666", padding: "6px 14px", cursor: "pointer", borderRadius: 4, fontFamily: "inherit", fontSize: 13 }}>←</button>
              <span style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 3, color: brand.color }}>{new Date(calMonth.year, calMonth.month).toLocaleString("default",{month:"long"}).toUpperCase()} {calMonth.year}</span>
              <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month+1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: "transparent", border: "1px solid #222", color: "#666", padding: "6px 14px", cursor: "pointer", borderRadius: 4, fontFamily: "inherit", fontSize: 13 }}>→</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 1 }}>
              {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#444", letterSpacing: 1, padding: "8px 0" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
              {Array.from({ length: calDays().first }).map((_,i) => <div key={`e${i}`} style={{ background: "#0A0A0A", minHeight: 70, borderRadius: 4 }} />)}
              {Array.from({ length: calDays().days }).map((_,i) => {
                const day = i+1, dayPosts = postsOnDay(day);
                const today = new Date();
                const isToday = today.getDate()===day && today.getMonth()===calMonth.month && today.getFullYear()===calMonth.year;
                return (
                  <div key={day} style={{ background: "#111", minHeight: 70, borderRadius: 4, padding: 6, border: isToday ? `1px solid ${brand.color}` : "1px solid transparent" }}>
                    <div style={{ fontSize: 11, color: isToday ? brand.color : "#444", marginBottom: 4 }}>{day}</div>
                    {dayPosts.map(post => (
                      <div key={post.id} onClick={() => { openEditPost(post); setActiveTab("posts"); }} style={{ fontSize: 9, background: STATUS_COLORS[post.status]+"22", color: STATUS_COLORS[post.status], padding: "2px 4px", borderRadius: 2, marginBottom: 2, cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", letterSpacing: 0.5 }}>
                        {BRANDS[post.brandId]?.short} · {post.platform?.substring(0,2)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 16 }}>
                {Object.entries(STATUS_COLORS).map(([s,c]) => <span key={s} style={{ fontSize: 10, color: c, letterSpacing: 1 }}>● {s.toUpperCase()}</span>)}
              </div>
              <button onClick={() => downloadICS(data.posts)} style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#666", padding: "8px 16px", fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 4, fontFamily: "inherit" }}>↓ DOWNLOAD ICS</button>
            </div>
          </div>
        )}

        {/* IMAGES */}
        {activeTab === "images" && (
          <div className="fade-in">
            <div style={{ marginBottom: 20, background: "#111", border: "1px dashed #2A2A2A", borderRadius: 8, padding: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 8 }}>UPLOAD IMAGE FOR {brand.name.toUpperCase()}</label>
              <input value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Caption or tag (optional)" style={{ width: "100%", background: "#0A0A0A", border: "1px solid #222", color: "#E8E8E8", padding: "10px 14px", fontSize: 12, fontFamily: "inherit", borderRadius: 6, marginBottom: 10 }} />
              <label style={{ display: "inline-block", background: brand.color, color: "#000", padding: "8px 20px", fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 4, fontWeight: 500 }}>
                + CHOOSE FILE
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              </label>
              <span style={{ fontSize: 11, color: "#444", marginLeft: 12 }}>Works from mobile camera roll</span>
            </div>
            {brandImages.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#333", fontSize: 13 }}>No images yet for {brand.name}.</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {brandImages.map(img => (
                <div key={img.id} className="img-card" style={{ position: "relative", background: "#111", borderRadius: 8, overflow: "hidden", border: "1px solid #1A1A1A" }}>
                  <img src={img.src} alt={img.caption} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  <button className="img-delete" onClick={() => deleteImage(img.id)} style={{ position: "absolute", top: 6, right: 6, background: "#000000CC", border: "none", color: "#FF6B6B", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", fontSize: 12, opacity: 0, transition: "opacity 0.2s", fontFamily: "inherit" }}>×</button>
                  {img.caption && <div style={{ padding: "8px 10px", fontSize: 11, color: "#666", borderTop: "1px solid #1A1A1A" }}>{img.caption}</div>}
                  <div style={{ padding: "4px 10px 8px", fontSize: 10, color: "#333" }}>{new Date(img.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Post modal */}
      {showPostForm && (
        <div style={{ position: "fixed", inset: 0, background: "#000000CC", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "#111", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 11, color: brand.color, letterSpacing: 2, marginBottom: 20 }}>{editPost ? "EDIT POST" : "NEW POST"} · {brand.name.toUpperCase()}</div>
            {[
              ["PLATFORM", <select value={postForm.platform} onChange={e => setPostForm(f=>({...f,platform:e.target.value}))} style={{ width:"100%",background:"#0A0A0A",border:"1px solid #222",color:"#E8E8E8",padding:"10px 14px",fontSize:12,fontFamily:"inherit",borderRadius:6 }}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select>],
              ["SCHEDULED DATE", <input type="date" value={postForm.scheduledDate} onChange={e=>setPostForm(f=>({...f,scheduledDate:e.target.value}))} style={{ width:"100%",background:"#0A0A0A",border:"1px solid #222",color:"#E8E8E8",padding:"10px 14px",fontSize:12,fontFamily:"inherit",borderRadius:6 }} />],
              ["STATUS", <select value={postForm.status} onChange={e=>setPostForm(f=>({...f,status:e.target.value}))} style={{ width:"100%",background:"#0A0A0A",border:"1px solid #222",color:"#E8E8E8",padding:"10px 14px",fontSize:12,fontFamily:"inherit",borderRadius:6 }}><option value="planned">Planned</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select>],
              ["CONTENT", <textarea value={postForm.content} onChange={e=>setPostForm(f=>({...f,content:e.target.value}))} style={{ width:"100%",background:"#0A0A0A",border:"1px solid #222",color:"#E8E8E8",padding:"10px 14px",fontSize:12,fontFamily:"inherit",borderRadius:6,minHeight:120 }} />],
              ["NOTES / TIPS", <input value={postForm.notes} onChange={e=>setPostForm(f=>({...f,notes:e.target.value}))} style={{ width:"100%",background:"#0A0A0A",border:"1px solid #222",color:"#E8E8E8",padding:"10px 14px",fontSize:12,fontFamily:"inherit",borderRadius:6 }} />],
              ["PERFORMANCE NOTES", <input value={postForm.stats} onChange={e=>setPostForm(f=>({...f,stats:e.target.value}))} placeholder="e.g. 240 impressions, 3 enquiries" style={{ width:"100%",background:"#0A0A0A",border:"1px solid #222",color:"#E8E8E8",padding:"10px 14px",fontSize:12,fontFamily:"inherit",borderRadius:6 }} />]
            ].map(([label, field]) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 6 }}>{label}</label>
                {field}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowPostForm(false)} style={{ flex: 1, background: "transparent", border: "1px solid #2A2A2A", color: "#666", padding: 10, fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 6, fontFamily: "inherit" }}>CANCEL</button>
              <button onClick={savePost} style={{ flex: 2, background: brand.color, border: "none", color: "#000", padding: 10, fontSize: 11, letterSpacing: 1, cursor: "pointer", borderRadius: 6, fontFamily: "inherit", fontWeight: 500 }}>SAVE POST</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
