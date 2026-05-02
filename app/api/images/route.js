import { put, list } from "@vercel/blob";

const IMAGES_KEY = "marketing-os/images.json";

async function loadImages() {
  try {
    const { blobs } = await list({ prefix: "marketing-os/images.json", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blobs.length) return {};
    const res = await fetch(blobs[0].url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) return {};
    return await res.json();
  } catch { return {}; }
}

async function saveImages(images) {
  await put(IMAGES_KEY, JSON.stringify(images), {
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
}

export async function GET(request) {
  try {
    const images = await loadImages();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    if (brandId) return Response.json(images[brandId] || []);
    return Response.json(images);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const brandId = formData.get("brandId") || "general";
    const caption = formData.get("caption") || "";

    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "No token" }, { status: 500 });

    // Convert to base64 data URL — stored in images.json separately from posts data
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    const id = Date.now().toString();

    // Load existing, add new, save back
    const images = await loadImages();
    const brandImages = images[brandId] || [];
    brandImages.unshift({ url: dataUrl, caption, id, brandId, createdAt: new Date().toISOString() });
    images[brandId] = brandImages;
    await saveImages(images);

    return Response.json({ url: dataUrl, caption, id, brandId, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error("Image upload error:", err);
    return Response.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id, brandId } = await request.json();
    const images = await loadImages();
    if (images[brandId]) {
      images[brandId] = images[brandId].filter(img => img.id !== id);
      await saveImages(images);
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
