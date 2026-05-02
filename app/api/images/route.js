import { put, download } from "@vercel/blob";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const brandId = formData.get("brandId") || "general";
    const caption = formData.get("caption") || "";

    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 500 });
    }

    const ext = (file.name || "image.jpg").split(".").pop().toLowerCase();
    const safeExt = ["jpg","jpeg","png","gif","webp","heic"].includes(ext) ? ext : "jpg";
    const id = Date.now().toString();
    const filename = `marketing-os/images/${brandId}/${id}.${safeExt}`;

    const blob = await put(filename, file, {
      access: "private",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return Response.json({
      url: blob.url,
      caption,
      id,
      brandId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Image upload error:", err);
    return Response.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");
    if (!imageUrl) return Response.json({ error: "No URL" }, { status: 400 });
    const blob = await download(imageUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const buffer = await blob.arrayBuffer();
    const contentType = blob.headers?.get("content-type") || "image/jpeg";
    return new Response(buffer, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
