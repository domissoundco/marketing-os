import { put, get, list } from "@vercel/blob";

const POSTS_KEY = "marketing-os/posts.json";
const SETTINGS_KEY = "marketing-os/settings.json";

async function loadPosts() {
  try {
    const { blobs } = await list({ prefix: "marketing-os/posts" });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch { return []; }
}

async function savePosts(posts) {
  await put(POSTS_KEY, JSON.stringify(posts), { access: "public", addRandomSuffix: false });
}

async function loadSettings() {
  try {
    const { blobs } = await list({ prefix: "marketing-os/settings" });
    if (!blobs.length) return {};
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch { return {}; }
}

async function saveSettings(settings) {
  await put(SETTINGS_KEY, JSON.stringify(settings), { access: "public", addRandomSuffix: false });
}

export async function GET() {
  try {
    const [posts, settings] = await Promise.all([loadPosts(), loadSettings()]);
    return Response.json({ posts, settings });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.type === "posts") {
      await savePosts(body.data);
      return Response.json({ ok: true });
    }
    if (body.type === "settings") {
      await saveSettings(body.data);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
