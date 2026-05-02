import { put, list, download } from "@vercel/blob";

const POSTS_KEY = "marketing-os/posts.json";
const SETTINGS_KEY = "marketing-os/settings.json";

async function loadBlob(prefix) {
  try {
    const { blobs } = await list({ prefix, token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blobs.length) return null;
    const blob = await download(blobs[0].url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const text = await blob.text();
    return JSON.parse(text);
  } catch { return null; }
}

async function saveBlob(key, data) {
  await put(key, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
}

export async function GET() {
  try {
    const [posts, settings] = await Promise.all([
      loadBlob("marketing-os/posts"),
      loadBlob("marketing-os/settings")
    ]);
    return Response.json({ posts: posts || [], settings: settings || {} });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.type === "posts") {
      await saveBlob(POSTS_KEY, body.data);
      return Response.json({ ok: true });
    }
    if (body.type === "settings") {
      await saveBlob(SETTINGS_KEY, body.data);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
