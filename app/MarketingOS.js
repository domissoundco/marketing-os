'use client'
import { useState, useEffect, useRef } from "react";

const BRANDS = {
  domissoundco: {
    id:"domissoundco", name:"DOMISSOUNDCo", short:"DSC",
    color:"#92400E", soft:"#FFFBEB", banner:"#78350F", accent:"#D97706", border:"#FDE68A",
    tagline:"Audio · RF · Comms Systems", platforms:["Instagram","LinkedIn"],
    voice:`You are writing social media content for DOMISSOUNDCo, a freelance audio, RF and comms systems technician who has worked with Massive Attack, Björk, Groove Armada, Sophie Ellis-Bextor and Belinda Carlisle. Confident, professional, insider knowledge. Never boastful — matter-of-fact expertise. Industry language used naturally. Outstanding marketing: specific details that build credibility, speak directly to production managers and tour managers, make them think "I need this person".`
  },
  donsole: {
    id:"donsole", name:"Donsole", short:"DON",
    color:"#1E40AF", soft:"#EFF6FF", banner:"#1E3A8A", accent:"#3B82F6", border:"#BFDBFE",
    tagline:"Small Gigs Done Brilliantly", platforms:["Facebook","Instagram"],
    voice:`You are writing social media content for Donsole, a venue audio and lighting provider. Small gigs done brilliantly. Warm, local, passionate about live music. Speaks to local bands, promoters, event organisers. Outstanding marketing: makes bands feel their show matters, speaks to the fear of sounding bad live.`
  },
  wheresmyradio: {
    id:"wheresmyradio", name:"WheresMyRadio", short:"WMR",
    color:"#4C1D95", soft:"#F5F3FF", banner:"#3B0764", accent:"#7C3AED", border:"#DDD6FE",
    tagline:"Motorola Radio Hire · Green Ethos", platforms:["Instagram","Facebook"],
    voice:`You are writing social media content for WheresMyRadio, a two-way radio hire company. Motorola radios, green ethos, well-packed and reliable. Efficient, no-nonsense. Speaks to event producers and stage managers. Outstanding marketing: removes friction — make it feel effortless to hire, emphasise reliability and the peace of mind of great comms.`
  },
  kitdesk: {
    id:"kitdesk", name:"kitdesk", short:"KD",
    color:"#881337", soft:"#FFF1F2", banner:"#4C0519", accent:"#E11D48", border:"#FECDD3",
    tagline:"Hire Management · Built for the Real World", platforms:["LinkedIn","Facebook"],
    voice:`You are writing social media content for kitdesk, hire management software built by a working director of a small hire company who got fed up with overpriced bloated alternatives and built his own. Straight-talking, industry-insider, founder-led. Speaks to small AV and event hire companies and freelancers who've outgrown spreadsheets. Outstanding marketing: speak to the pain of the chaos before, the relief of the solution. Make them feel seen. Around £9.99/month.`
  }
};

const PLATFORMS = ["LinkedIn","Facebook","Instagram","Twitter/X"];
const DEFAULT_SETTINGS = { socialLinks:{ domissoundco:{instagram:"",linkedin:"",facebook:"",website:""}, donsole:{instagram:"",linkedin:"",facebook:"",website:""}, wheresmyradio:{instagram:"",linkedin:"",facebook:"",website:""}, kitdesk:{instagram:"",linkedin:"",facebook:"",website:""} } };
const SOCIAL_ICONS = { instagram:"📸", linkedin:"💼", facebook:"📘", website:"🌐" };
const STATUS_CONFIG = { planned:{color:"#64748B",bg:"#F1F5F9",label:"Planned"}, scheduled:{color:"#B45309",bg:"#FFFBEB",label:"Scheduled"}, published:{color:"#166534",bg:"#F0FDF4",label:"Published"} };

function ScoreBadge({ score, breakdown, tip, small }) {
  const [open, setOpen] = useState(false);
  if (!score) return null;
  const color = score >= 8 ? "#166534" : score >= 6 ? "#B45309" : "#BE123C";
  const bg = score >= 8 ? "#F0FDF4" : score >= 6 ? "#FFFBEB" : "#FFF1F2";
  const label = score >= 8 ? "Outstanding" : score >= 6 ? "Good" : "Needs Work";
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(!open)} style={{background:bg,color,border:`1px solid ${color}33`,borderRadius:8,padding:small?"3px 8px":"4px 10px",fontSize:small?11:12,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",gap:4}}>
        ⭐ {score}/10 <span style={{fontWeight:400,fontSize:10}}>{label}</span>
      </button>
      {open && (
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"rgba(0,0,0,0.4)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:20,maxWidth:340,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:"'Lora',serif",fontSize:16,fontWeight:600,color:"#1E293B"}}>Marketing Score</div>
              <div style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:700,color}}>{score}/10</div>
            </div>
            <div style={{fontSize:13,color:"#475569",lineHeight:1.7,marginBottom:12,fontFamily:"'Inter',sans-serif"}}>{breakdown}</div>
            {tip && <div style={{background:"#F8FAFC",borderLeft:"3px solid #CBD5E1",padding:"8px 12px",borderRadius:"0 8px 8px 0",fontSize:12,color:"#64748B",fontFamily:"'Inter',sans-serif"}}>💡 {tip}</div>}
            <button onClick={()=>setOpen(false)} style={{marginTop:14,width:"100%",background:"#F1F5F9",border:"none",borderRadius:8,padding:"10px",fontSize:13,color:"#64748B",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketingOS() {
  const [mounted, setMounted] = useState(false);
  const [activeBrand, setActiveBrand] = useState("kitdesk");
  const [activeTab, setActiveTab] = useState("generate");
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auth
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);

  // Generator
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [genError, setGenError] = useState("");

  // Image-to-post
  const [selectedImage, setSelectedImage] = useState(null); // {url, brief, caption}
  const [imageBrief, setImageBrief] = useState("");

  // Post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [postForm, setPostForm] = useState({ platform:"LinkedIn", scheduledDate:"", content:"", status:"planned", notes:"", imageUrl:"", marketingScore:null, stats:{reach:"",engagements:"",clicks:"",enquiries:"",rating:""} });
  const [scoringPost, setScoringPost] = useState(null);

  // Calendar
  const [calMonth, setCalMonth] = useState(()=>{const n=new Date();return{year:n.getFullYear(),month:n.getMonth()};});

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);

  // Images
  const [images, setImages] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imageBreifs, setImageBriefs] = useState({}); // keyed by image id
  const [showImageBriefFor, setShowImageBriefFor] = useState(null);
  const libraryImageRef = useRef();
  const postImageRef = useRef();

  const [copied, setCopied] = useState("");

  useEffect(()=>{
    setMounted(true);
    if (typeof window!=="undefined"&&sessionStorage.getItem("marketing-os-auth")==="1") {
      setAuthed(true); loadData();
    } else { setLoading(false); }
  },[]);

  async function handleLogin(e) {
    e?.preventDefault();
    if (!passwordInput.trim()) return;
    setCheckingPassword(true); setPasswordError("");
    try {
      const res = await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:passwordInput})});
      const data = await res.json();
      if (data.ok) { sessionStorage.setItem("marketing-os-auth","1"); setAuthed(true); loadData(); }
      else { setPasswordError("Incorrect password."); setPasswordInput(""); }
    } catch { setPasswordError("Connection error."); }
    setCheckingPassword(false);
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data.posts||[]);
      const s = {...DEFAULT_SETTINGS,...data.settings};
      setSettings(s); setSettingsForm(s);
    } catch {}
    setLoading(false);
  }

  async function persistPosts(newPosts) {
    setPosts(newPosts); setSaving(true);
    try { await fetch("/api/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"posts",data:newPosts})}); } catch {}
    setSaving(false);
  }

  async function persistSettings(s) {
    setSettings(s); setSaving(true);
    try { await fetch("/api/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"settings",data:s})}); } catch {}
    setSaving(false);
  }

  const brand = BRANDS[activeBrand];
  const brandPosts = posts.filter(p=>p.brandId===activeBrand);
  const published = brandPosts.filter(p=>p.status==="published");
  const totalReach = published.reduce((s,p)=>s+(parseInt(p.stats?.reach)||0),0);
  const totalEnq = published.reduce((s,p)=>s+(parseInt(p.stats?.enquiries)||0),0);
  const totalEng = published.reduce((s,p)=>s+(parseInt(p.stats?.engagements)||0),0);
  const scoredPosts = published.filter(p=>p.marketingScore?.score);
  const avgScore = scoredPosts.length ? (scoredPosts.reduce((s,p)=>s+(p.marketingScore.score||0),0)/scoredPosts.length).toFixed(1) : null;

  const prompt = (plat) => `Write a ${plat} post.\n\nReturn ONLY valid JSON:\n{"post":"ready to copy-paste text","hashtags":"3-5 hashtags","tip":"one posting tip"}\nNo markdown, no backticks. Outstanding marketing quality — hook, single message, authentic voice, clear CTA.`;

  async function handleGenerate() {
    if (!topic.trim()&&!selectedImage) return;
    setGenerating(true); setGenError(""); setGenerated(null);
    try {
      const body = { system:brand.voice, prompt: selectedImage
        ? `${prompt(platform)}\n\nContext: "${topic||imageBrief}"`
        : `${prompt(platform)}\n\nTopic: "${topic}"`
      };
      if (selectedImage) { body.imageUrl = selectedImage.url; body.imageBrief = imageBrief||topic; }
      const res = await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      // Auto-score it
      const scoreRes = await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({score:true,post:json.post+"\n\n"+json.hashtags,platform})});
      const scoreJson = await scoreRes.json();
      setGenerated({...json, marketingScore: scoreJson});
    } catch(e) { setGenError("Generation failed — check connection and try again."); }
    setGenerating(false);
  }

  function saveGeneratedPost() {
    if (!generated) return;
    const post = {id:Date.now().toString(),brandId:activeBrand,platform,content:`${generated.post}\n\n${generated.hashtags}`,status:"planned",scheduledDate:"",notes:generated.tip||"",imageUrl:selectedImage?.url||"",marketingScore:generated.marketingScore||null,stats:{reach:"",engagements:"",clicks:"",enquiries:"",rating:""},createdAt:new Date().toISOString()};
    persistPosts([post,...posts]);
    setGenerated(null); setTopic(""); setSelectedImage(null); setImageBrief(""); setActiveTab("posts");
  }

  async function scorePost(post) {
    setScoringPost(post.id);
    try {
      const res = await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({score:true,post:post.content,platform:post.platform})});
      const json = await res.json();
      if (!json.error) { persistPosts(posts.map(p=>p.id===post.id?{...p,marketingScore:json}:p)); }
    } catch {}
    setScoringPost(null);
  }

  function openNewPost() {
    setEditPost(null);
    setPostForm({platform:brand.platforms[0]||"LinkedIn",scheduledDate:"",content:"",status:"planned",notes:"",imageUrl:"",marketingScore:null,stats:{reach:"",engagements:"",clicks:"",enquiries:"",rating:""}});
    setShowPostForm(true);
  }

  function openEditPost(post) {
    setEditPost(post);
    setPostForm({platform:post.platform,scheduledDate:post.scheduledDate||"",content:post.content||"",status:post.status||"planned",notes:post.notes||"",imageUrl:post.imageUrl||"",marketingScore:post.marketingScore||null,stats:post.stats||{reach:"",engagements:"",clicks:"",enquiries:"",rating:""}});
    setShowPostForm(true);
  }

  function savePost() {
    if (editPost) { persistPosts(posts.map(p=>p.id===editPost.id?{...p,...postForm}:p)); }
    else { persistPosts([{id:Date.now().toString(),brandId:activeBrand,createdAt:new Date().toISOString(),...postForm},...posts]); }
    setShowPostForm(false);
  }

  function deletePost(id) { if (!confirm("Delete this post?")) return; persistPosts(posts.filter(p=>p.id!==id)); }
  function cycleStatus(post) { const c={planned:"scheduled",scheduled:"published",published:"planned"}; persistPosts(posts.map(p=>p.id===post.id?{...p,status:c[p.status]||"planned"}:p)); }

  async function handleImageUpload(e, forPost=false) {
    const file = e.target.files[0]; if (!file) return;
    setUploadingImage(true); setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file",file); fd.append("brandId",activeBrand); fd.append("caption","");
      const res = await fetch("/api/images",{method:"POST",body:fd});
      const img = await res.json();
      if (img.error) {
        const reader = new FileReader();
        reader.onload = ()=>{
          const url = reader.result;
          if (forPost) setPostForm(f=>({...f,imageUrl:url}));
          else setImages(prev=>({...prev,[activeBrand]:[...(prev[activeBrand]||[]),{url,id:Date.now().toString(),createdAt:new Date().toISOString()}]}));
        };
        reader.readAsDataURL(file);
        setUploadError(`Saved locally (${img.error})`);
      } else {
        if (forPost) setPostForm(f=>({...f,imageUrl:img.url}));
        else setImages(prev=>({...prev,[activeBrand]:[...(prev[activeBrand]||[]),img]}));
      }
    } catch(err) { setUploadError(`Upload error: ${err.message}`); }
    setUploadingImage(false); e.target.value="";
  }

  function selectImageForPost(img) {
    setSelectedImage(img);
    setImageBrief(imageBreifs[img.id]||"");
    setActiveTab("generate");
  }

  function calDays() { const {year,month}=calMonth; return {first:(new Date(year,month,1).getDay()+6)%7,days:new Date(year,month+1,0).getDate()}; }
  function postsOnDay(day) { const {year,month}=calMonth; const d=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; return posts.filter(p=>p.scheduledDate===d); }
  function copyText(text,key) { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(()=>setCopied(""),2000); }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
    body{margin:0;background:#F7F8F5;}
    input,select,textarea,button{font-family:'Inter',sans-serif;}
    .card{background:#fff;border-radius:16px;box-shadow:0 1px 6px rgba(0,0,0,0.06);}
    .btn{transition:all 0.15s ease;cursor:pointer;border:none;outline:none;}
    .btn:active{transform:scale(0.97);}
    .tab{transition:all 0.15s;cursor:pointer;border:none;background:transparent;white-space:nowrap;}
    .brand-pill{transition:all 0.15s;cursor:pointer;}
    .brand-pill:active{transform:scale(0.96);}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .fade-up{animation:fadeUp 0.25s ease;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spinner{animation:spin 0.8s linear infinite;display:inline-block;}
    textarea:focus,input:focus,select:focus{outline:none;}
    .img-thumb{transition:all 0.15s;cursor:pointer;}
    .img-thumb:hover{transform:scale(1.03);}
    .img-thumb:active{transform:scale(0.97);}
  `;

  if (!mounted) return <div style={{minHeight:"100vh",background:"#F7F8F5"}} />;

  if (!authed) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1a2e1a 0%,#0f1f2e 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{CSS}</style>
      <div style={{background:"#fff",borderRadius:24,padding:"40px 32px",width:"100%",maxWidth:360,textAlign:"center",boxShadow:"0 32px 80px rgba(0,0,0,0.5)"}}>
        <div style={{fontSize:36,marginBottom:12}}>🎛</div>
        <div style={{fontFamily:"'Lora',serif",fontSize:24,fontWeight:600,color:"#1E293B",marginBottom:6}}>Marketing OS</div>
        <div style={{fontSize:13,color:"#94A3B8",marginBottom:28}}>Private workspace</div>
        <form onSubmit={handleLogin}>
          <input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} placeholder="Password" autoFocus
            style={{width:"100%",border:"1.5px solid #E2E8F0",borderRadius:12,padding:"14px 16px",fontSize:16,color:"#1E293B",marginBottom:10,textAlign:"center",letterSpacing:3,background:"#F8FAFC"}} />
          {passwordError&&<div style={{fontSize:13,color:"#BE123C",marginBottom:10}}>{passwordError}</div>}
          <button type="submit" className="btn" disabled={checkingPassword||!passwordInput.trim()} style={{width:"100%",background:"#1a2e1a",color:"#fff",padding:"14px",fontSize:14,borderRadius:12,fontWeight:600,opacity:checkingPassword||!passwordInput.trim()?0.5:1}}>
            {checkingPassword?"Checking...":"Enter →"}
          </button>
        </form>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#F7F8F5",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center",color:"#94A3B8",fontSize:14}}><div className="spinner" style={{fontSize:24,marginBottom:12}}>⟳</div><div>Loading...</div></div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F7F8F5",fontFamily:"'Inter',sans-serif",color:"#1E293B",paddingBottom:40}}>
      <style>{CSS}</style>

      {/* BANNER */}
      <div style={{background:brand.banner}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 16px 12px"}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:20,fontWeight:600,color:"#fff"}}>
            Marketing OS
            {saving&&<span style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginLeft:8,fontWeight:400}}>saving…</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>copyText(`${window.location.origin}/api/calendar`,"cal")} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",padding:"7px 12px",borderRadius:20,fontSize:12}}>
              {copied==="cal"?"✓":"📅"} Cal
            </button>
            <button className="btn" onClick={()=>{setSettingsForm(settings);setShowSettings(true);}} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",width:34,height:34,borderRadius:"50%",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
          </div>
        </div>

        <div style={{display:"flex",gap:8,padding:"0 16px 14px",overflowX:"auto",scrollbarWidth:"none"}}>
          {Object.values(BRANDS).map(b=>(
            <button key={b.id} className="brand-pill btn" onClick={()=>setActiveBrand(b.id)} style={{background:activeBrand===b.id?"#fff":"rgba(255,255,255,0.15)",color:activeBrand===b.id?b.accent:"rgba(255,255,255,0.9)",border:`1px solid ${activeBrand===b.id?"#fff":"rgba(255,255,255,0.2)"}`,padding:"8px 16px",borderRadius:20,fontSize:13,fontWeight:activeBrand===b.id?600:400,flexShrink:0}}>
              {b.name}
            </button>
          ))}
        </div>

        <div style={{background:"rgba(0,0,0,0.2)",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.75)"}}>{brand.tagline}</span>
          <div style={{display:"flex",gap:6}}>
            {Object.entries(settings.socialLinks?.[activeBrand]||{}).filter(([,v])=>v).map(([k,v])=>(
              <a key={k} href={v} target="_blank" rel="noreferrer" style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",padding:"3px 10px",borderRadius:12,fontSize:11,textDecoration:"none"}}>{SOCIAL_ICONS[k]}</a>
            ))}
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div style={{background:"#fff",borderBottom:"1px solid #F1F5F9",padding:"10px 16px",display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none"}}>
        {[
          ["📤",published.length,"Published"],
          ["👁",totalReach.toLocaleString(),"Reach"],
          ["❤️",totalEng.toLocaleString(),"Engaged"],
          ["📩",totalEnq,"Enquiries"],
          ["⭐",avgScore?`${avgScore}/10`:"—","Mktg Score"],
        ].map(([icon,val,label],i)=>(
          <div key={label} style={{flex:"0 0 20%",minWidth:64,textAlign:"center",padding:"2px 4px",borderRight:i<4?"1px solid #F1F5F9":"none"}}>
            <div style={{fontSize:15,fontWeight:600,color:brand.accent}}>{val}</div>
            <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>{label}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{background:"#fff",borderBottom:"1px solid #F1F5F9",display:"flex",overflowX:"auto",scrollbarWidth:"none",padding:"0 8px"}}>
        {[["generate","⚡","Generate"],["posts","📋","Posts"],["calendar","📅","Calendar"],["images","🖼","Images"]].map(([id,icon,label])=>(
          <button key={id} className="tab" onClick={()=>setActiveTab(id)} style={{flex:1,borderBottom:`2px solid ${activeTab===id?brand.accent:"transparent"}`,color:activeTab===id?brand.accent:"#94A3B8",padding:"12px 4px",fontSize:12,fontWeight:activeTab===id?600:400,display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:64}}>
            <span style={{fontSize:16}}>{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{padding:"16px",maxWidth:680,margin:"0 auto"}}>

        {/* ── GENERATE ── */}
        {activeTab==="generate"&&(
          <div className="fade-up">

            {/* Selected image brief */}
            {selectedImage&&(
              <div className="card" style={{padding:16,marginBottom:14,border:`1.5px solid ${brand.border}`}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{position:"relative",flexShrink:0}}>
                    <img src={selectedImage.url} alt="" style={{width:72,height:72,objectFit:"cover",borderRadius:10}} />
                    <button className="btn" onClick={()=>{setSelectedImage(null);setImageBrief("");}} style={{position:"absolute",top:-6,right:-6,background:"#1E293B",color:"#fff",width:18,height:18,borderRadius:"50%",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:brand.accent,fontWeight:600,marginBottom:6}}>📸 Generating from image</div>
                    <textarea value={imageBrief} onChange={e=>setImageBrief(e.target.value)} placeholder="Tell the AI the story — what's in this shot, what's interesting, what point do you want to make? e.g. 'This is the lightroom at the O2, I was A2. 12 projectors, 6 Disguise servers. Massive Attack tour.'"
                      style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:8,padding:"10px 12px",fontSize:13,minHeight:80,color:"#1E293B",background:"#FAFBFC",lineHeight:1.6}}
                      onFocus={e=>e.target.style.borderColor=brand.accent} onBlur={e=>e.target.style.borderColor="#E8EDF2"} />
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{padding:20,marginBottom:14}}>
              <div style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,marginBottom:16,color:"#1E293B"}}>
                {selectedImage?"Brief the AI":"Generate a post"}
              </div>

              {!selectedImage&&(
                <>
                  <label style={{fontSize:12,color:"#94A3B8",fontWeight:500,letterSpacing:0.4,display:"block",marginBottom:6}}>WHAT'S HAPPENING?</label>
                  <textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. new feature just launched, just wrapped a complex show..."
                    style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:12,padding:"12px 14px",fontSize:14,minHeight:80,color:"#1E293B",background:"#FAFBFC",lineHeight:1.6,marginBottom:12}}
                    onFocus={e=>e.target.style.borderColor=brand.accent} onBlur={e=>e.target.style.borderColor="#E8EDF2"} />
                </>
              )}

              <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}>
                  <label style={{fontSize:12,color:"#94A3B8",fontWeight:500,letterSpacing:0.4,display:"block",marginBottom:6}}>PLATFORM</label>
                  <select value={platform} onChange={e=>setPlatform(e.target.value)} style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:10,padding:"10px 12px",fontSize:14,color:"#1E293B",background:"#FAFBFC"}}>
                    {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <button className="btn" onClick={handleGenerate} disabled={generating||(!topic.trim()&&!selectedImage)} style={{background:brand.banner,color:"#fff",padding:"11px 22px",borderRadius:10,fontSize:14,fontWeight:600,opacity:generating||(!topic.trim()&&!selectedImage)?0.5:1,cursor:generating||(!topic.trim()&&!selectedImage)?"not-allowed":"pointer",flexShrink:0}}>
                  {generating?<><span className="spinner">⟳</span> Writing...</>:"Generate ⚡"}
                </button>
              </div>
            </div>

            {genError&&<div style={{background:"#FFF1F2",border:"1px solid #FECDD3",padding:12,borderRadius:10,color:"#BE123C",fontSize:13,marginBottom:14}}>{genError}</div>}

            {generated&&(
              <div className="card fade-up" style={{padding:20,border:`1.5px solid ${brand.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
                  <span style={{fontSize:11,color:brand.accent,fontWeight:600,letterSpacing:0.5}}>✓ {platform.toUpperCase()} · {brand.name}</span>
                  {generated.marketingScore&&<ScoreBadge {...generated.marketingScore} />}
                </div>
                <div style={{background:brand.soft,borderRadius:10,padding:14,fontSize:14,lineHeight:1.75,whiteSpace:"pre-wrap",color:"#1E293B",marginBottom:10}}>{generated.post}</div>
                <div style={{fontSize:13,color:"#7C3AED",marginBottom:10}}>{generated.hashtags}</div>
                {generated.tip&&<div style={{fontSize:12,color:"#64748B",borderLeft:`3px solid ${brand.border}`,paddingLeft:10,marginBottom:14}}>💡 {generated.tip}</div>}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="btn" onClick={()=>copyText(`${generated.post}\n\n${generated.hashtags}`,"gen")} style={{background:"#F1F5F9",color:"#475569",padding:"9px 16px",borderRadius:8,fontSize:13,fontWeight:500}}>
                    {copied==="gen"?"✓ Copied":"Copy"}
                  </button>
                  <button className="btn" onClick={saveGeneratedPost} style={{background:brand.banner,color:"#fff",padding:"9px 16px",borderRadius:8,fontSize:13,fontWeight:600}}>Save to Posts →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── POSTS ── */}
        {activeTab==="posts"&&(
          <div className="fade-up">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,color:"#1E293B"}}>{brand.name}</div>
              <button className="btn" onClick={openNewPost} style={{background:brand.banner,color:"#fff",padding:"9px 16px",borderRadius:10,fontSize:13,fontWeight:600}}>+ New Post</button>
            </div>

            <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",scrollbarWidth:"none"}}>
              {["planned","scheduled","published"].map(s=>{
                const sc=STATUS_CONFIG[s];
                return <span key={s} style={{background:sc.bg,color:sc.color,padding:"4px 12px",borderRadius:12,fontSize:12,fontWeight:500,flexShrink:0}}>{sc.label} {brandPosts.filter(p=>p.status===s).length}</span>;
              })}
            </div>

            {brandPosts.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:"#CBD5E1",fontSize:14}}>No posts yet.</div>}

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {brandPosts.map(post=>{
                const sc=STATUS_CONFIG[post.status];
                return (
                  <div key={post.id} className="card" style={{padding:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#64748B",background:"#F1F5F9",padding:"3px 8px",borderRadius:8}}>{post.platform}</span>
                        <button className="btn" onClick={()=>cycleStatus(post)} style={{fontSize:11,color:sc.color,background:sc.bg,padding:"3px 8px",borderRadius:8,fontWeight:600}}>{sc.label}</button>
                        {post.scheduledDate&&<span style={{fontSize:11,color:"#94A3B8"}}>📅 {post.scheduledDate}</span>}
                        {post.marketingScore
                          ? <ScoreBadge {...post.marketingScore} small />
                          : <button className="btn" onClick={()=>scorePost(post)} disabled={scoringPost===post.id} style={{fontSize:11,color:brand.accent,background:brand.soft,border:`1px solid ${brand.border}`,padding:"3px 8px",borderRadius:8,opacity:scoringPost===post.id?0.5:1}}>
                              {scoringPost===post.id?<span className="spinner">⟳</span>:"Score it ⭐"}
                            </button>
                        }
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn" onClick={()=>openEditPost(post)} style={{fontSize:12,color:"#64748B",background:"#F8FAFC",border:"1px solid #E2E8F0",padding:"4px 10px",borderRadius:6}}>Edit</button>
                        <button className="btn" onClick={()=>deletePost(post.id)} style={{fontSize:12,color:"#BE123C",background:"#FFF1F2",border:"1px solid #FECDD3",padding:"4px 10px",borderRadius:6}}>Del</button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:12}}>
                      {post.imageUrl&&<img src={post.imageUrl} alt="" style={{width:60,height:60,objectFit:"cover",borderRadius:8,flexShrink:0}} />}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,color:"#334155",lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>{post.content}</div>
                      </div>
                    </div>
                    {post.notes&&<div style={{fontSize:12,color:"#94A3B8",borderLeft:`2px solid ${brand.border}`,paddingLeft:8,marginTop:8}}>💡 {post.notes}</div>}
                    {post.stats&&Object.values(post.stats).some(v=>v)&&(
                      <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #F1F5F9",display:"flex",gap:8,flexWrap:"wrap"}}>
                        {[["👁",post.stats.reach],["❤️",post.stats.engagements],["🔗",post.stats.clicks],["📩",post.stats.enquiries],["⭐",post.stats.rating?`${post.stats.rating}/5`:""]].filter(([,v])=>v).map(([icon,val])=>(
                          <span key={icon} style={{fontSize:12,color:"#475569",background:"#F8FAFC",padding:"2px 8px",borderRadius:6}}>{icon} {val}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CALENDAR ── */}
        {activeTab==="calendar"&&(
          <div className="fade-up">
            <div className="card" style={{padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <button className="btn" onClick={()=>setCalMonth(m=>{const d=new Date(m.year,m.month-1);return{year:d.getFullYear(),month:d.getMonth()};})} style={{background:"#F1F5F9",color:"#475569",width:36,height:36,borderRadius:8,fontSize:16}}>←</button>
                <span style={{fontFamily:"'Lora',serif",fontSize:16,fontWeight:600,color:"#1E293B"}}>{new Date(calMonth.year,calMonth.month).toLocaleString("default",{month:"long"})} {calMonth.year}</span>
                <button className="btn" onClick={()=>setCalMonth(m=>{const d=new Date(m.year,m.month+1);return{year:d.getFullYear(),month:d.getMonth()};})} style={{background:"#F1F5F9",color:"#475569",width:36,height:36,borderRadius:8,fontSize:16}}>→</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}}>
                {["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,color:"#CBD5E1",padding:"4px 0",fontWeight:600}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {Array.from({length:calDays().first}).map((_,i)=><div key={`e${i}`} style={{minHeight:52,borderRadius:6}} />)}
                {Array.from({length:calDays().days}).map((_,i)=>{
                  const day=i+1, dayPosts=postsOnDay(day);
                  const today=new Date();
                  const isToday=today.getDate()===day&&today.getMonth()===calMonth.month&&today.getFullYear()===calMonth.year;
                  return (
                    <div key={day} style={{minHeight:52,borderRadius:6,padding:4,background:isToday?brand.soft:"#FAFBFC",border:`1px solid ${isToday?brand.accent:"#F1F5F9"}`}}>
                      <div style={{fontSize:11,color:isToday?brand.accent:"#CBD5E1",fontWeight:isToday?700:400,marginBottom:2}}>{day}</div>
                      {dayPosts.slice(0,2).map(p=>{
                        const b=BRANDS[p.brandId]; const sc=STATUS_CONFIG[p.status];
                        return <div key={p.id} onClick={()=>{setActiveBrand(p.brandId);openEditPost(p);setActiveTab("posts");}} style={{fontSize:9,background:sc.bg,color:sc.color,padding:"1px 3px",borderRadius:3,marginBottom:1,cursor:"pointer",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",borderLeft:`2px solid ${b?.accent}`}}>{b?.short}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card" style={{padding:16}}>
              <div style={{fontFamily:"'Lora',serif",fontSize:16,fontWeight:600,marginBottom:6,color:"#1E293B"}}>📅 Calendar Subscription</div>
              <div style={{fontSize:13,color:"#64748B",marginBottom:12,lineHeight:1.6}}>Subscribe once — updates automatically as you plan posts.</div>
              <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#475569",fontFamily:"monospace",marginBottom:10,wordBreak:"break-all"}}>
                {typeof window!=="undefined"?`${window.location.origin}/api/calendar`:"/api/calendar"}
              </div>
              <button className="btn" onClick={()=>copyText(`${window.location.origin}/api/calendar`,"cal")} style={{background:brand.banner,color:"#fff",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,width:"100%"}}>
                {copied==="cal"?"✓ Copied!":"Copy Subscription Link"}
              </button>
              <div style={{fontSize:12,color:"#94A3B8",marginTop:10}}>Google Calendar → Other calendars → + → From URL</div>
            </div>
          </div>
        )}

        {/* ── IMAGES ── */}
        {activeTab==="images"&&(
          <div className="fade-up">
            <div className="card" style={{padding:20,marginBottom:14}}>
              <div style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,marginBottom:14,color:"#1E293B"}}>{brand.name} Images</div>
              {uploadError&&<div style={{background:"#FFFBEB",border:"1px solid #FDE68A",padding:10,borderRadius:8,fontSize:12,color:"#92400E",marginBottom:10}}>{uploadError}</div>}
              <label className="btn" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:brand.soft,border:`1.5px dashed ${brand.accent}`,color:brand.accent,padding:"18px",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",width:"100%"}}>
                {uploadingImage?<><span className="spinner">⟳</span> Uploading...</>:<>📎 Upload Photo</>}
                <input type="file" accept="image/*" ref={libraryImageRef} onChange={e=>handleImageUpload(e,false)} style={{display:"none"}} disabled={uploadingImage} />
              </label>
              <div style={{fontSize:12,color:"#94A3B8",textAlign:"center",marginTop:8}}>Tap to choose from camera roll · Tap image to generate a post from it</div>
            </div>

            {(images[activeBrand]||[]).length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#CBD5E1",fontSize:14}}>No images yet for {brand.name}.</div>}

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {(images[activeBrand]||[]).map(img=>(
                <div key={img.id} style={{position:"relative"}}>
                  <div className="img-thumb" onClick={()=>setShowImageBriefFor(showImageBriefFor===img.id?null:img.id)} style={{borderRadius:10,overflow:"hidden",aspectRatio:"1",background:"#F1F5F9"}}>
                    <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:6,transition:"background 0.2s"}}>
                      <span style={{fontSize:10,color:"#fff",background:"rgba(0,0,0,0.5)",padding:"2px 8px",borderRadius:10,fontWeight:600}}>✏️ Brief</span>
                    </div>
                  </div>

                  {showImageBriefFor===img.id&&(
                    <div style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)setShowImageBriefFor(null);}}>
                      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:600}}>
                        <div style={{width:36,height:4,background:"#E2E8F0",borderRadius:2,margin:"0 auto 16px"}} />
                        <img src={img.url} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:12,marginBottom:14}} />
                        <div style={{fontFamily:"'Lora',serif",fontSize:16,fontWeight:600,marginBottom:8,color:"#1E293B"}}>Your story brief</div>
                        <div style={{fontSize:12,color:"#94A3B8",marginBottom:8,lineHeight:1.5}}>Tell the AI exactly what's in this photo and what point you want to make. The more specific, the better the post.</div>
                        <textarea
                          value={imageBreifs[img.id]||""}
                          onChange={e=>setImageBriefs(prev=>({...prev,[img.id]:e.target.value}))}
                          placeholder="e.g. 'This is the lightroom at the O2. I was A2 on this show. Interesting bits: server room behind me, 12 Disguise servers, 6 projectors. Massive Attack tour. Point I want to make: the scale of modern live production.'"
                          style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:10,padding:"12px 14px",fontSize:13,minHeight:100,color:"#1E293B",background:"#FAFBFC",lineHeight:1.6,marginBottom:12}}
                        />
                        <div style={{display:"flex",gap:8}}>
                          <button className="btn" onClick={()=>setShowImageBriefFor(null)} style={{flex:1,background:"#F1F5F9",color:"#64748B",padding:"11px",borderRadius:10,fontSize:13}}>Cancel</button>
                          <button className="btn" onClick={()=>{selectImageForPost({...img,brief:imageBreifs[img.id]||""});setShowImageBriefFor(null);}} style={{flex:2,background:brand.banner,color:"#fff",padding:"11px",borderRadius:10,fontSize:13,fontWeight:600}}>
                            Generate Post from This →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* POST MODAL */}
      {showPostForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}} onClick={e=>{if(e.target===e.currentTarget)setShowPostForm(false);}}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:600,maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:"#E2E8F0",borderRadius:2,margin:"0 auto 20px"}} />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,color:"#1E293B"}}>{editPost?"Edit Post":"New Post"}</div>
              <button className="btn" onClick={()=>setShowPostForm(false)} style={{background:"#F1F5F9",width:32,height:32,borderRadius:"50%",fontSize:16,color:"#64748B",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[["PLATFORM",<select value={postForm.platform} onChange={e=>setPostForm(f=>({...f,platform:e.target.value}))} style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:8,padding:"9px 10px",fontSize:13,color:"#1E293B",background:"#FAFBFC"}}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select>],
                ["DATE",<input type="date" value={postForm.scheduledDate} onChange={e=>setPostForm(f=>({...f,scheduledDate:e.target.value}))} style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:8,padding:"9px 10px",fontSize:13,color:"#1E293B",background:"#FAFBFC"}} />]
              ].map(([label,field])=>(
                <div key={label}>
                  <label style={{fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:0.4,display:"block",marginBottom:5}}>{label}</label>
                  {field}
                </div>
              ))}
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:0.4,display:"block",marginBottom:5}}>STATUS</label>
              <div style={{display:"flex",gap:6}}>
                {["planned","scheduled","published"].map(s=>{
                  const sc=STATUS_CONFIG[s];
                  return <button key={s} className="btn" onClick={()=>setPostForm(f=>({...f,status:s}))} style={{flex:1,background:postForm.status===s?sc.bg:"#F8FAFC",color:postForm.status===s?sc.color:"#94A3B8",border:`1.5px solid ${postForm.status===s?sc.color:"#E2E8F0"}`,padding:"8px 4px",borderRadius:8,fontSize:12,fontWeight:600}}>{sc.label}</button>;
                })}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:0.4,display:"block",marginBottom:5}}>CONTENT</label>
              <textarea value={postForm.content} onChange={e=>setPostForm(f=>({...f,content:e.target.value}))} style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:8,padding:"10px 12px",fontSize:13,minHeight:100,color:"#1E293B",background:"#FAFBFC",lineHeight:1.6}} />
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:0.4,display:"block",marginBottom:5}}>PHOTO</label>
              {postForm.imageUrl?(
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <img src={postForm.imageUrl} alt="" style={{width:56,height:56,objectFit:"cover",borderRadius:8}} />
                  <button className="btn" onClick={()=>setPostForm(f=>({...f,imageUrl:""}))} style={{fontSize:12,color:"#BE123C",background:"#FFF1F2",border:"1px solid #FECDD3",padding:"5px 12px",borderRadius:6}}>Remove</button>
                </div>
              ):(
                <label className="btn" style={{display:"flex",alignItems:"center",gap:6,background:"#F8FAFC",border:"1.5px dashed #CBD5E1",color:"#64748B",padding:"10px 14px",borderRadius:8,fontSize:13,cursor:"pointer"}}>
                  📎 Attach Photo
                  <input type="file" accept="image/*" ref={postImageRef} onChange={e=>handleImageUpload(e,true)} style={{display:"none"}} />
                </label>
              )}
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:0.4,display:"block",marginBottom:5}}>NOTES</label>
              <input value={postForm.notes} onChange={e=>setPostForm(f=>({...f,notes:e.target.value}))} style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#1E293B",background:"#FAFBFC"}} />
            </div>

            {/* Marketing score on edit */}
            {postForm.marketingScore&&(
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:0.4,display:"block",marginBottom:5}}>MARKETING SCORE</label>
                <ScoreBadge {...postForm.marketingScore} />
              </div>
            )}

            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:"#94A3B8",fontWeight:600,letterSpacing:0.4,display:"block",marginBottom:8}}>PERFORMANCE</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["reach","👁 Reach"],["engagements","❤️ Engage"],["clicks","🔗 Clicks"],["enquiries","📩 Enquiries"]].map(([key,label])=>(
                  <div key={key}>
                    <label style={{fontSize:11,color:"#CBD5E1",display:"block",marginBottom:3}}>{label}</label>
                    <input type="number" value={postForm.stats[key]||""} onChange={e=>setPostForm(f=>({...f,stats:{...f.stats,[key]:e.target.value}}))} placeholder="0" style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:8,padding:"8px 10px",fontSize:13,color:"#1E293B",background:"#FAFBFC"}} />
                  </div>
                ))}
              </div>
              <div style={{marginTop:8}}>
                <label style={{fontSize:11,color:"#CBD5E1",display:"block",marginBottom:6}}>⭐ Personal Rating</label>
                <div style={{display:"flex",gap:6}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} className="btn" onClick={()=>setPostForm(f=>({...f,stats:{...f.stats,rating:n.toString()}}))} style={{flex:1,height:38,border:`1.5px solid ${postForm.stats.rating==n?brand.accent:"#E2E8F0"}`,borderRadius:8,background:postForm.stats.rating==n?brand.soft:"#fff",color:postForm.stats.rating==n?brand.accent:"#94A3B8",fontSize:15,fontWeight:600}}>{n}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button className="btn" onClick={()=>setShowPostForm(false)} style={{flex:1,background:"#F1F5F9",color:"#64748B",padding:13,borderRadius:12,fontSize:14,fontWeight:500}}>Cancel</button>
              <button className="btn" onClick={savePost} style={{flex:2,background:brand.banner,color:"#fff",padding:13,borderRadius:12,fontSize:14,fontWeight:600}}>Save Post</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}} onClick={e=>{if(e.target===e.currentTarget)setShowSettings(false);}}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:"#E2E8F0",borderRadius:2,margin:"0 auto 20px"}} />
            <div style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,marginBottom:20,color:"#1E293B"}}>Social Links</div>
            {Object.values(BRANDS).map(b=>(
              <div key={b.id} style={{marginBottom:20,paddingBottom:20,borderBottom:"1px solid #F1F5F9"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:b.accent}} />
                  <span style={{fontSize:14,fontWeight:600,color:"#1E293B"}}>{b.name}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {["instagram","linkedin","facebook","website"].map(p=>(
                    <div key={p}>
                      <label style={{fontSize:11,color:"#94A3B8",display:"block",marginBottom:3}}>{SOCIAL_ICONS[p]} {p}</label>
                      <input value={settingsForm.socialLinks?.[b.id]?.[p]||""} onChange={e=>setSettingsForm(f=>({...f,socialLinks:{...f.socialLinks,[b.id]:{...f.socialLinks?.[b.id],[p]:e.target.value}}}))} placeholder="https://..." style={{width:"100%",border:"1.5px solid #E8EDF2",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#1E293B",background:"#FAFBFC"}} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:10}}>
              <button className="btn" onClick={()=>setShowSettings(false)} style={{flex:1,background:"#F1F5F9",color:"#64748B",padding:13,borderRadius:12,fontSize:14}}>Cancel</button>
              <button className="btn" onClick={()=>{persistSettings(settingsForm);setShowSettings(false);}} style={{flex:2,background:brand.banner,color:"#fff",padding:13,borderRadius:12,fontSize:14,fontWeight:600}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
