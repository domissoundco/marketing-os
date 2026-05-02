import { put, list } from "@vercel/blob";

const DATA_KEY = "marketing-os/data.json";

async function loadData() {
  try {
    const { blobs } = await list({ prefix: "marketing-os/data", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blobs.length) {
      // Try legacy posts.json
      const { blobs: legacy } = await list({ prefix: "marketing-os/posts", token: process.env.BLOB_READ_WRITE_TOKEN });
      if (!legacy.length) return { posts:[], tasks:[], profiles:{}, socialLinks:{} };
      const res = await fetch(legacy[0].url, { headers:{ Authorization:`Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
      const posts = await res.json();
      return { posts, tasks:[], profiles:{}, socialLinks:{} };
    }
    const res = await fetch(blobs[0].url, { headers:{ Authorization:`Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) return { posts:[], tasks:[], profiles:{}, socialLinks:{} };
    return await res.json();
  } catch { return { posts:[], tasks:[], profiles:{}, socialLinks:{} }; }
}

async function saveData(data) {
  await put(DATA_KEY, JSON.stringify(data), {
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
}

export async function GET() {
  try {
    const data = await loadData();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.type === "all") {
      await saveData(body.data);
      return Response.json({ ok: true });
    }
    // Legacy support
    if (body.type === "posts") {
      const current = await loadData();
      await saveData({ ...current, posts: body.data });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
