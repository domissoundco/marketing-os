import { put } from "@vercel/blob";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const brandId = (formData.get("brandId") || "general").replace(/[^a-z0-9]/gi, "");
    const caption = formData.get("caption") || "";

    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return Response.json({ error: "No token configured" }, { status: 500 });

    // Log token prefix to verify format (safe — just first 20 chars)
    console.log("Token prefix:", token.substring(0, 20));
    console.log("File type:", file.type, "File size:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const id = Date.now().toString();

    // Very simple safe filename
    const filename = `images-${brandId}-${id}.jpg`;

    console.log("Uploading as:", filename);

    const blob = await put(filename, buffer, {
      token,
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });

    console.log("Success:", blob.url);
    return Response.json({ url: blob.url, caption, id, brandId, createdAt: new Date().toISOString() });

  } catch (err) {
    console.error("Full error:", err);
    return Response.json({ error: err.message || String(err) }, { status: 500 });
  }
}
