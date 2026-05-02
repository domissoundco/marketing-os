export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const brandId = formData.get("brandId") || "general";
    const caption = formData.get("caption") || "";

    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

    // Convert to base64 — no external storage needed
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const id = Date.now().toString();

    return Response.json({
      url: dataUrl,
      caption,
      id,
      brandId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Image error:", err);
    return Response.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
