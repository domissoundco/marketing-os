import { put } from "@vercel/blob";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const brandId = formData.get("brandId") || "general";
    const caption = formData.get("caption") || "";

    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 500 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const id = Date.now().toString();

    // Always use jpg for uploads — works for HEIC, HEIF, and anything else iOS sends
    const filename = `marketing-os/images/${brandId}/${id}.jpg`;

    const blob = await put(filename, buffer, {
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: "image/jpeg"
    });

    return Response.json({ url: blob.url, caption, id, brandId, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error("Image upload error:", err);
    return Response.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
