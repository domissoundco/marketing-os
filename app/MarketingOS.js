'use client'
import { useState, useEffect, useCallback, useRef } from "react";

const BRANDS = {
  domissoundco: {
    id: "domissoundco", name: "DOMISSOUNDCo", short: "DSC",
    color: "#C2410C", light: "#FFF7ED", border: "#FDBA74",
    banner: "linear-gradient(135deg, #C2410C 0%, #EA580C 50%, #F97316 100%)",
    desc: "Freelance Audio, RF & Comms Tech", tagline: "Audio · RF · Comms Systems",
    platforms: ["Instagram", "LinkedIn"],
    voice: `You are writing social media content for DOMISSOUNDCo, a freelance audio, RF and comms systems technician who has worked with artists including Massive Attack, Björk, Groove Armada, Sophie Ellis-Bextor and Belinda Carlisle. The tone is confident, professional, insider knowledge — the voice of a seasoned touring and corporate audio professional. Never boastful, just matter-of-fact expertise. Use industry language naturally. Posts should feel like they come from someone who really knows their craft and has seen it all — from complex MIDI-triggered corporate shows to festival RF coordination.`
  },
  donsole: {
    id: "donsole", name: "Donsole", short: "DON",
    color: "#0369A1", light: "#F0F9FF", border: "#7DD3FC",
    banner: "linear-gradient(135deg, #0369A1 0%, #0284C7 50%, #0EA5E9 100%)",
    desc: "Venue Audio & Lighting", tagline: "Small Gigs Done Brilliantly",
    platforms: ["Facebook", "Instagram"],
    voice: `You are writing social media content for Donsole, a venue audio and lighting provider focused on doing small gigs brilliantly. The tone is warm, local, passionate about live music — the kind of people who genuinely care that every band sounds great regardless of the venue size. Friendly, approachable, community-focused. Speaks to local bands, promoters and event organisers.`
  },
  wheresmyradio: {
    id: "wheresmyradio", name: "WheresMyRadio", short: "WMR",
    color: "#6D28D9", light: "#F5F3FF", border: "#C4B5FD",
    banner: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%)",
    desc: "Two-Way Radio Hire", tagline: "Motorola Radio Hire · Green Ethos",
    platforms: ["Instagram", "Facebook"],
    voice: `You are writing social media content for WheresMyRadio, a two-way radio hire company specialising in Motorola radios with a strong green ethos — well-packed, reliable, eco-conscious. The tone is efficient, no-nonsense, reliable. Speaks to event producers, stage managers and corporate event planners who need comms sorted without hassle. Emphasise reliability, easy hire process and the green credentials.`
  },
  kitdesk: {
    id: "kitdesk", name: "kitdesk", short: "KD",
    color: "#BE123C", light: "#FFF1F2", border: "#FECDD3",
    banner: "linear-gradient(135deg, #BE123C 0%, #E11D48 50%, #FB7185 100%)",
    desc: "Hire Management Software", tagline: "Hire Management · Built for the Real World",
    platforms: ["LinkedIn", "Facebook"],
    voice: `You are writing social media content for kitdesk, hire management software built by a working director of a small hire company who got fed up with overpriced, bloated alternatives and built his own. The tone is straight-talking, industry-insider, founder-led — never corporate, never salesy. Speaks directly to small AV and event hire companies, freelancers and one-man-bands who've outgrown spreadsheets. Key messages: built by someone who lives this world, simple and cheap, you don't pay for what you're not going to use, scales with you, makes small companies look bigger than they are. Price point around £9.99/month.`
  }
};

const PLATFORMS = ["LinkedIn", "Facebook", "Instagram", "Twitter/X"];
const DEFAULT_SETTINGS = {
  socialLinks: {
    domissoundco: { instagram: "", linkedin: "", facebook: "", website: "" },
    donsole: { instagram: "", linkedin: "", facebook: "", website: "" },
    wheresmyradio: { instagram: "", linkedin: "", facebook: "", website: "" },
    kitdesk: { instagram: "", linkedin: "", facebook: "", website: "" }
  }
};

const SOCIAL_ICONS = {
  instagram: "📸", linkedin: "💼", facebook: "📘", website: "🌐"
};

export default function MarketingOS() {
  const [mounted, setMounted] = useState(false);
  const [activeBrand, setActiveBrand] = useState("kitdesk");
  const [activeTab, setActiveTab] = useState("generate");
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Generator
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [genError, setGenError] = useState("");

  // Post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [postForm, setPostForm] = useState({ platform: "LinkedIn", scheduledDate: "", content: "", status: "planned", notes: "", imageUrl: "", imageCaption: "", stats: { reach: "", engagements: "", clicks: "", enquiries: "", rating: "" } });

  // Calendar
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState("");

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageCaption, setImageCaption] = useState("");
  const fileInputRef = useRef();
  const postImageInputRef = useRef();

  useEffect(() => { setMounted(true); loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data.posts || []);
      const s = { ...DEFAULT_SETTINGS, ...data.settings };
      setSettings(s);
      setSettingsForm(s);
    } catch {}
    setLoading(false);
  }

  async function persistPosts(newPosts) {
    setPosts(newPosts);
    setSaving(true);
    try { await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "posts", data: newPosts }) }); } catch {}
    setSaving(false);
  }

  async function persistSettings(newSettings) {
    setSettings(newSettings);
    setSaving(true);
    try { await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "settings", data: newSettings }) }); } catch {}
    setSaving(false);
  }

  const brand = BRANDS[activeBrand];
  const brandPosts = posts.filter(p => p.brandId === activeBrand);
  const publishedPosts = brandPosts.filter(p => p.status === "published");

  // Stats aggregation
  const totalReach = publishedPosts.reduce((s, p) => s + (parseInt(p.stats?.reach) || 0), 0);
  const totalEngagements = publishedPosts.reduce((s, p) => s + (parseInt(p.stats?.engagements) || 0), 0);
  const totalEnquiries = publishedPosts.reduce((s, p) => s + (parseInt(p.stats?.enquiries) || 0), 0);
  const avgRating = publishedPosts.filter(p => p.stats?.rating).length
    ? (publishedPosts.reduce((s, p) => s + (parseFloat(p.stats?.rating) || 0), 0) / publishedPosts.filter(p => p.stats?.rating).length).toFixed(1)
    : "—";

  async function handleGenerate() {
    if (!topic.trim()) return;
    setGenerating(true); setGenError(""); setGenerated(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: brand.voice,
          prompt: `Write a ${platform} post about: "${topic}"\n\nReturn ONLY a JSON object:\n{\n  "post": "ready to copy-paste post text",\n  "hashtags": "3-5 relevant hashtags",\n  "tip": "one short posting tip"\n}\nNo markdown, no backticks, raw JSON only.`
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setGenerated(json);
    } catch { setGenError("Generation failed — check your connection and try again."); }
    setGenerating(false);
  }

  function saveGeneratedPost() {
    if (!generated) return;
    const post = { id: Date.now().toString(), brandId: activeBrand, platform, content: `${generated.post}\n\n${generated.hashtags}`, status: "planned", scheduledDate: "", notes: generated.tip || "", imageUrl: "", imageCaption: "", stats: { reach: "", engagements: "", clicks: "", enquiries: "", rating: "" }, createdAt: new Date().toISOString() };
    persistPosts([post, ...posts]);
    setGenerated(null); setTopic(""); setActiveTab("posts");
  }

  function openNewPost() {
    setEditPost(null);
    setPostForm({ platform: brand.platforms[0] || "LinkedIn", scheduledDate: "", content: "", status: "planned", notes: "", imageUrl: "", imageCaption: "", stats: { reach: "", engagements: "", clicks: "", enquiries: "", rating: "" } });
    setShowPostForm(true);
  }

  function openEditPost(post) {
    setEditPost(post);
    setPostForm({ platform: post.platform, scheduledDate: post.scheduledDate || "", content: post.content || "", status: post.status || "planned", notes: post.notes || "", imageUrl: post.imageUrl || "", imageCaption: post.imageCaption || "", stats: post.stats || { reach: "", engagements: "", clicks: "", enquiries: "", rating: "" } });
    setShowPostForm(true);
  }

  function savePost() {
    if (editPost) {
      persistPosts(posts.map(p => p.id === editPost.id ? { ...p, ...postForm } : p));
    } else {
      persistPosts([{ id: Date.now().toString(), brandId: activeBrand, createdAt: new Date().toISOString(), ...postForm }, ...posts]);
    }
    setShowPostForm(false);
  }

  function deletePost(id) {
    if (!confirm("Delete this post?")) return;
    persistPosts(posts.filter(p => p.id !== id));
  }

  function cycleStatus(post) {
    const cycle = { planned: "scheduled", scheduled: "published", published: "planned" };
    persistPosts(posts.map(p => p.id === post.id ? { ...p, status: cycle[p.status] || "planned" } : p));
  }

  async function handleImageUpload(e, forPost = false) {
    const file = e.target.files[0]; if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brandId", activeBrand);
      fd.append("caption", imageCaption);
      const res = await fetch("/api/images", { method: "POST", body: fd });
      const img = await res.json();
      if (forPost) {
        setPostForm(f => ({ ...f, imageUrl: img.url, imageCaption: imageCaption }));
      } else {
        setImages(prev => ({ ...prev, [activeBrand]: [...(prev[activeBrand] || []), img] }));
      }
      setImageCaption("");
    } catch {}
    setUploadingImage(false);
    e.target.value = "";
  }

  function calDays() {
    const { year, month } = calMonth;
    return { first: (new Date(year, month, 1).getDay() + 6) % 7, days: new Date(year, month + 1, 0).getDate() };
  }

  function postsOnDay(day) {
    const { year, month } = calMonth;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return posts.filter(p => p.scheduledDate === dateStr);
  }

  function copyCalendarLink() {
    const url = `${window.location.origin}/api/calendar`;
    navigator.clipboard?.writeText(url);
    setCopied("calendar");
    setTimeout(() => setCopied(""), 2000);
  }

  function copyText(text, key) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  const STATUS_CONFIG = {
    planned: { color: "#6B7280", bg: "#F3F4F6", label: "Planned" },
    scheduled: { color: "#D97706", bg: "#FFFBEB", label: "Scheduled" },
    published: { color: "#059669", bg: "#ECFDF5", label: "Published" }
  };

  const socialLinks = settings.socialLinks?.[activeBrand] || {};

  if (!mounted || loading) return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 14, color: "#94A3B8", fontFamily: "Georgia, serif" }}>Loading Marketing OS...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Georgia', 'Times New Roman', serif", color: "#1E293B" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .brand-pill { transition: all 0.2s ease; cursor: pointer; }
        .brand-pill:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .tab-item { transition: all 0.15s ease; cursor: pointer; border: none; background: transparent; }
        .tab-item:hover { opacity: 1 !important; }
        .post-card { transition: all 0.2s ease; }
        .post-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .btn-primary { transition: all 0.15s ease; cursor: pointer; }
        .btn-primary:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .btn-secondary { transition: all 0.15s ease; cursor: pointer; }
        .btn-secondary:hover { background: #F1F5F9 !important; }
        .social-chip { transition: all 0.15s ease; }
        .social-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.3s ease; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulsing { animation: pulse 1.2s infinite; }
        .stat-card { transition: all 0.2s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        input, select, textarea { font-family: 'DM Sans', sans-serif !important; }
        .cal-day { transition: all 0.15s ease; }
        .cal-day:hover { background: #F1F5F9 !important; }
      `}</style>

      {/* Brand Banner */}
      <div style={{ background: brand.banner, padding: "0" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>Marketing OS</span>
            {saving && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif" }} className="pulsing">saving...</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={copyCalendarLink} className="btn-secondary" style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "6px 14px", fontSize: 12, borderRadius: 20, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
              {copied === "calendar" ? "✓ Copied!" : "📅 Subscribe to Calendar"}
            </button>
            <button onClick={() => { setSettingsForm(settings); setShowSettings(true); }} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "6px 12px", fontSize: 16, borderRadius: 20, cursor: "pointer" }}>⚙️</button>
          </div>
        </div>

        {/* Brand switcher */}
        <div style={{ display: "flex", gap: 8, padding: "0 24px 16px", flexWrap: "wrap" }}>
          {Object.values(BRANDS).map(b => (
            <button key={b.id} className="brand-pill" onClick={() => setActiveBrand(b.id)} style={{
              background: activeBrand === b.id ? "#fff" : "rgba(255,255,255,0.2)",
              color: activeBrand === b.id ? b.color : "#fff",
              border: `1px solid ${activeBrand === b.id ? "#fff" : "rgba(255,255,255,0.3)"}`,
              padding: "7px 18px", fontSize: 13, borderRadius: 20,
              fontFamily: "'DM Sans', sans-serif", fontWeight: activeBrand === b.id ? 600 : 400
            }}>{b.name}</button>
          ))}
        </div>

        {/* Brand info + social links */}
        <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontFamily: "'DM Sans', sans-serif" }}>{brand.tagline}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(socialLinks).filter(([, v]) => v).map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer" className="social-chip" style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "4px 12px", fontSize: 12, borderRadius: 16, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                {SOCIAL_ICONS[k]} {k.charAt(0).toUpperCase() + k.slice(1)}
              </a>
            ))}
            <button onClick={() => { setSettingsForm(settings); setShowSettings(true); }} style={{ background: "rgba(255,255,255,0.1)", border: "1px dashed rgba(255,255,255,0.4)", color: "rgba(255,255,255,0.7)", padding: "4px 12px", fontSize: 12, borderRadius: 16, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              + Add links
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "12px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        {[
          ["Published", publishedPosts.length, brand.color],
          ["Total Reach", totalReach.toLocaleString(), "#0369A1"],
          ["Engagements", totalEngagements.toLocaleString(), "#7C3AED"],
          ["Enquiries", totalEnquiries, "#059669"],
          ["Avg Rating", `${avgRating}/5`, "#D97706"]
        ].map(([label, value, color]) => (
          <div key={label} className="stat-card" style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: "#F8FAFC" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "0 24px", display: "flex", overflowX: "auto" }}>
        {[["generate","⚡ Generate"],["posts","📋 Posts"],["calendar","📅 Calendar"],["images","🖼 Images"]].map(([id, label]) => (
          <button key={id} className="tab-item" onClick={() => setActiveTab(id)} style={{
            borderBottom: `3px solid ${activeTab === id ? brand.color : "transparent"}`,
            color: activeTab === id ? brand.color : "#64748B",
            padding: "14px 18px", fontSize: 13, fontWeight: activeTab === id ? 600 : 400,
            fontFamily: "'DM Sans', sans-serif", opacity: activeTab === id ? 1 : 0.7,
            whiteSpace: "nowrap", letterSpacing: 0.2
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px", maxWidth: 860, margin: "0 auto" }}>

        {/* GENERATE */}
        {activeTab === "generate" && (
          <div className="fade-up">
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, margin: "0 0 16px", color: "#1E293B" }}>Generate Content</h2>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#64748B", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 6, letterSpacing: 0.3 }}>TOPIC OR UPDATE</label>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={`What's happening? e.g. "new feature just launched" or "just back from a festival"`}
                  style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", minHeight: 80, color: "#1E293B", outline: "none", transition: "border-color 0.15s" }}
                  onFocus={e => e.target.style.borderColor = brand.color}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#64748B", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 6, letterSpacing: 0.3 }}>PLATFORM</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1E293B", outline: "none", background: "#fff" }}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <button onClick={handleGenerate} disabled={generating || !topic.trim()} className="btn-primary" style={{ background: brand.banner, color: "#fff", border: "none", padding: "11px 28px", fontSize: 14, borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, opacity: generating || !topic.trim() ? 0.5 : 1, cursor: generating || !topic.trim() ? "not-allowed" : "pointer" }}>
                  {generating ? <span className="pulsing">Generating...</span> : "Generate Post ⚡"}
                </button>
              </div>
            </div>

            {genError && <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", padding: 14, borderRadius: 10, color: "#BE123C", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>{genError}</div>}

            {generated && (
              <div className="fade-up" style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: `1.5px solid ${brand.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: brand.color, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: 0.5 }}>✓ GENERATED · {platform.toUpperCase()}</span>
                </div>
                <div style={{ background: brand.light, padding: 16, borderRadius: 10, marginBottom: 12, lineHeight: 1.75, fontSize: 14, whiteSpace: "pre-wrap", fontFamily: "'DM Sans', sans-serif", color: "#1E293B" }}>{generated.post}</div>
                <div style={{ fontSize: 13, color: "#7C3AED", marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>{generated.hashtags}</div>
                {generated.tip && <div style={{ fontSize: 12, color: "#64748B", borderLeft: `3px solid ${brand.border}`, paddingLeft: 12, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>💡 {generated.tip}</div>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => copyText(`${generated.post}\n\n${generated.hashtags}`, "gen")} className="btn-secondary" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", padding: "9px 18px", fontSize: 13, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                    {copied === "gen" ? "✓ Copied!" : "Copy"}
                  </button>
                  <button onClick={saveGeneratedPost} className="btn-primary" style={{ background: brand.banner, color: "#fff", border: "none", padding: "9px 18px", fontSize: 13, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                    Save to Posts →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* POSTS */}
        {activeTab === "posts" && (
          <div className="fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, margin: 0, color: "#1E293B" }}>{brand.name} Posts</h2>
              <button onClick={openNewPost} className="btn-primary" style={{ background: brand.banner, color: "#fff", border: "none", padding: "9px 20px", fontSize: 13, borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>+ New Post</button>
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["all", "planned", "scheduled", "published"].map(s => {
                const count = s === "all" ? brandPosts.length : brandPosts.filter(p => p.status === s).length;
                return (
                  <span key={s} style={{ background: "#fff", border: "1px solid #E2E8F0", padding: "4px 12px", borderRadius: 16, fontSize: 12, color: "#64748B", fontFamily: "'DM Sans', sans-serif" }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                  </span>
                );
              })}
            </div>

            {brandPosts.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif" }}>
                No posts yet — generate one or add manually.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {brandPosts.map(post => {
                const sc = STATUS_CONFIG[post.status];
                return (
                  <div key={post.id} className="post-card" style={{ background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "3px 10px", borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{post.platform}</span>
                        <button onClick={() => cycleStatus(post)} style={{ fontSize: 11, color: sc.color, background: sc.bg, border: "none", padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{sc.label}</button>
                        {post.scheduledDate && <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif" }}>📅 {post.scheduledDate}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => openEditPost(post)} style={{ fontSize: 12, color: "#64748B", background: "transparent", border: "1px solid #E2E8F0", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Edit</button>
                        <button onClick={() => deletePost(post.id)} style={{ fontSize: 12, color: "#BE123C", background: "transparent", border: "1px solid #FECDD3", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Del</button>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 14 }}>
                      {post.imageUrl && <img src={post.imageUrl} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "'DM Sans', sans-serif" }}>
                          {post.content?.substring(0, 220)}{post.content?.length > 220 ? "..." : ""}
                        </div>
                        {post.notes && <div style={{ fontSize: 12, color: "#94A3B8", borderLeft: `3px solid ${brand.border}`, paddingLeft: 10, marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>💡 {post.notes}</div>}
                      </div>
                    </div>

                    {/* Stats row */}
                    {post.stats && Object.values(post.stats).some(v => v) && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9", display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {[["👁 Reach", post.stats.reach], ["❤️ Engagements", post.stats.engagements], ["🔗 Clicks", post.stats.clicks], ["📩 Enquiries", post.stats.enquiries], ["⭐ Rating", post.stats.rating ? `${post.stats.rating}/5` : ""]].filter(([,v]) => v).map(([label, val]) => (
                          <span key={label} style={{ fontSize: 12, color: "#475569", background: "#F8FAFC", padding: "3px 10px", borderRadius: 10, fontFamily: "'DM Sans', sans-serif" }}>{label}: <strong>{val}</strong></span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {activeTab === "calendar" && (
          <div className="fade-up">
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month-1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", padding: "8px 16px", cursor: "pointer", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>←</button>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: "#1E293B" }}>{new Date(calMonth.year, calMonth.month).toLocaleString("default", { month: "long" })} {calMonth.year}</span>
                <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month+1); return { year: d.getFullYear(), month: d.getMonth() }; })} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", padding: "8px 16px", cursor: "pointer", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>→</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#94A3B8", padding: "6px 0", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                {Array.from({ length: calDays().first }).map((_,i) => <div key={`e${i}`} style={{ minHeight: 80, borderRadius: 8 }} />)}
                {Array.from({ length: calDays().days }).map((_,i) => {
                  const day = i+1, dayPosts = postsOnDay(day);
                  const today = new Date();
                  const isToday = today.getDate()===day && today.getMonth()===calMonth.month && today.getFullYear()===calMonth.year;
                  return (
                    <div key={day} className="cal-day" style={{ minHeight: 80, borderRadius: 8, padding: 6, background: isToday ? brand.light : "#F8FAFC", border: isToday ? `1.5px solid ${brand.color}` : "1px solid #F1F5F9" }}>
                      <div style={{ fontSize: 12, color: isToday ? brand.color : "#94A3B8", fontWeight: isToday ? 700 : 400, fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{day}</div>
                      {dayPosts.map(post => {
                        const b = BRANDS[post.brandId];
                        const sc = STATUS_CONFIG[post.status];
                        return (
                          <div key={post.id} onClick={() => { setActiveBrand(post.brandId); openEditPost(post); setActiveTab("posts"); }} style={{ fontSize: 10, background: sc.bg, color: sc.color, padding: "2px 5px", borderRadius: 4, marginBottom: 2, cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, borderLeft: `2px solid ${b?.color}` }}>
                            {b?.short} · {post.platform?.substring(0, 2)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar subscription */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, margin: "0 0 8px", color: "#1E293B" }}>📅 Live Calendar Subscription</h3>
              <p style={{ fontSize: 13, color: "#64748B", fontFamily: "'DM Sans', sans-serif", margin: "0 0 14px", lineHeight: 1.6 }}>Subscribe to this URL in Google Calendar, Apple Calendar or Outlook. It updates automatically as you plan posts.</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <code style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "8px 14px", borderRadius: 8, fontSize: 12, color: "#475569", flex: 1, minWidth: 200, fontFamily: "monospace" }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/api/calendar` : "/api/calendar"}
                </code>
                <button onClick={copyCalendarLink} className="btn-primary" style={{ background: brand.banner, color: "#fff", border: "none", padding: "9px 18px", fontSize: 13, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {copied === "calendar" ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
              <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", margin: "12px 0 0" }}>In Google Calendar: Other calendars → + → From URL → paste the link above.</p>
            </div>
          </div>
        )}

        {/* IMAGES */}
        {activeTab === "images" && (
          <div className="fade-up">
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, margin: "0 0 16px", color: "#1E293B" }}>{brand.name} Image Library</h2>
              <input value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Caption or tag (optional)" style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12, fontFamily: "'DM Sans', sans-serif", color: "#1E293B", outline: "none" }} />
              <label className="btn-primary" style={{ display: "inline-block", background: brand.banner, color: "#fff", padding: "10px 20px", fontSize: 13, borderRadius: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                {uploadingImage ? "Uploading..." : "+ Upload Image"}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={e => handleImageUpload(e)} style={{ display: "none" }} disabled={uploadingImage} />
              </label>
              <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 12, fontFamily: "'DM Sans', sans-serif" }}>Works from mobile camera roll</span>
            </div>

            {(images[activeBrand] || []).length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif" }}>No images yet for {brand.name}.</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {(images[activeBrand] || []).map(img => (
                <div key={img.id} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <img src={img.url} alt={img.caption} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  {img.caption && <div style={{ padding: "8px 10px", fontSize: 11, color: "#64748B", borderTop: "1px solid #F1F5F9", fontFamily: "'DM Sans', sans-serif" }}>{img.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Post form modal */}
      {showPostForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, margin: 0, color: "#1E293B" }}>{editPost ? "Edit Post" : "New Post"}</h3>
              <button onClick={() => setShowPostForm(false)} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8" }}>×</button>
            </div>

            {/* Platform & Date & Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[["Platform", <select value={postForm.platform} onChange={e=>setPostForm(f=>({...f,platform:e.target.value}))} style={{ width:"100%",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1E293B",background:"#fff",outline:"none" }}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select>],
               ["Date", <input type="date" value={postForm.scheduledDate} onChange={e=>setPostForm(f=>({...f,scheduledDate:e.target.value}))} style={{ width:"100%",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1E293B",outline:"none" }} />]
              ].map(([label, field]) => (
                <div key={label}>
                  <label style={{ display:"block",fontSize:11,color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,marginBottom:5,letterSpacing:0.4 }}>{label.toUpperCase()}</label>
                  {field}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display:"block",fontSize:11,color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,marginBottom:5,letterSpacing:0.4 }}>STATUS</label>
              <select value={postForm.status} onChange={e=>setPostForm(f=>({...f,status:e.target.value}))} style={{ width:"100%",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1E293B",background:"#fff",outline:"none" }}>
                <option value="planned">Planned</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display:"block",fontSize:11,color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,marginBottom:5,letterSpacing:0.4 }}>CONTENT</label>
              <textarea value={postForm.content} onChange={e=>setPostForm(f=>({...f,content:e.target.value}))} style={{ width:"100%",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",minHeight:110,color:"#1E293B",outline:"none" }} />
            </div>

            {/* Image attachment */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display:"block",fontSize:11,color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,marginBottom:5,letterSpacing:0.4 }}>ATTACH IMAGE</label>
              {postForm.imageUrl ? (
                <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                  <img src={postForm.imageUrl} alt="" style={{ width:60,height:60,objectFit:"cover",borderRadius:8 }} />
                  <button onClick={()=>setPostForm(f=>({...f,imageUrl:"",imageCaption:""}))} style={{ fontSize:12,color:"#BE123C",background:"transparent",border:"1px solid #FECDD3",padding:"4px 10px",borderRadius:6,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Remove</button>
                </div>
              ) : (
                <label style={{ display:"inline-block",background:"#F8FAFC",border:"1.5px dashed #CBD5E1",color:"#64748B",padding:"8px 16px",fontSize:13,borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                  📎 Attach Photo
                  <input type="file" accept="image/*" ref={postImageInputRef} onChange={e=>handleImageUpload(e,true)} style={{display:"none"}} />
                </label>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display:"block",fontSize:11,color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,marginBottom:5,letterSpacing:0.4 }}>NOTES</label>
              <input value={postForm.notes} onChange={e=>setPostForm(f=>({...f,notes:e.target.value}))} style={{ width:"100%",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1E293B",outline:"none" }} />
            </div>

            {/* Stats */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display:"block",fontSize:11,color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,marginBottom:8,letterSpacing:0.4 }}>PERFORMANCE STATS</label>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {[["reach","👁 Reach"],["engagements","❤️ Engagements"],["clicks","🔗 Link Clicks"],["enquiries","📩 Enquiries"]].map(([key,label]) => (
                  <div key={key}>
                    <label style={{ fontSize:11,color:"#CBD5E1",fontFamily:"'DM Sans',sans-serif",marginBottom:3,display:"block" }}>{label}</label>
                    <input type="number" value={postForm.stats[key]||""} onChange={e=>setPostForm(f=>({...f,stats:{...f.stats,[key]:e.target.value}}))} placeholder="0" style={{ width:"100%",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:"#1E293B",outline:"none" }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop:8 }}>
                <label style={{ fontSize:11,color:"#CBD5E1",fontFamily:"'DM Sans',sans-serif",marginBottom:3,display:"block" }}>⭐ Rating (1–5)</label>
                <div style={{ display:"flex",gap:8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={()=>setPostForm(f=>({...f,stats:{...f.stats,rating:n.toString()}}))} style={{ width:36,height:36,border:`1.5px solid ${postForm.stats.rating==n?brand.color:"#E2E8F0"}`,borderRadius:8,background:postForm.stats.rating==n?brand.light:"#fff",color:postForm.stats.rating==n?brand.color:"#94A3B8",fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600 }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowPostForm(false)} className="btn-secondary" style={{ flex:1,background:"#F8FAFC",border:"1px solid #E2E8F0",color:"#64748B",padding:12,fontSize:13,borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontWeight:500 }}>Cancel</button>
              <button onClick={savePost} className="btn-primary" style={{ flex:2,background:brand.banner,color:"#fff",border:"none",padding:12,fontSize:13,borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontWeight:600 }}>Save Post</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div style={{ position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20 }}>
          <div style={{ background:"#fff",borderRadius:20,padding:28,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:18,margin:0,color:"#1E293B" }}>Social Links</h3>
              <button onClick={()=>setShowSettings(false)} style={{ background:"transparent",border:"none",fontSize:20,cursor:"pointer",color:"#94A3B8" }}>×</button>
            </div>
            {Object.values(BRANDS).map(b => (
              <div key={b.id} style={{ marginBottom:20 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:b.color }} />
                  <span style={{ fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",color:"#1E293B" }}>{b.name}</span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  {["instagram","linkedin","facebook","website"].map(platform => (
                    <div key={platform}>
                      <label style={{ fontSize:11,color:"#94A3B8",fontFamily:"'DM Sans',sans-serif",marginBottom:3,display:"block" }}>{SOCIAL_ICONS[platform]} {platform.charAt(0).toUpperCase()+platform.slice(1)}</label>
                      <input value={settingsForm.socialLinks?.[b.id]?.[platform]||""} onChange={e=>setSettingsForm(f=>({ ...f, socialLinks:{ ...f.socialLinks,[b.id]:{ ...f.socialLinks?.[b.id],[platform]:e.target.value } } }))} placeholder="https://..." style={{ width:"100%",border:"1.5px solid #E2E8F0",borderRadius:8,padding:"8px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",color:"#1E293B",outline:"none" }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowSettings(false)} className="btn-secondary" style={{ flex:1,background:"#F8FAFC",border:"1px solid #E2E8F0",color:"#64748B",padding:12,fontSize:13,borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontWeight:500 }}>Cancel</button>
              <button onClick={()=>{ persistSettings(settingsForm); setShowSettings(false); }} className="btn-primary" style={{ flex:2,background:brand.banner,color:"#fff",border:"none",padding:12,fontSize:13,borderRadius:10,fontFamily:"'DM Sans',sans-serif",fontWeight:600 }}>Save Links</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
