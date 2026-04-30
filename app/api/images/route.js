import { put, list, del } from "@vercel/blob";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const brandId = formData.get("brandId");
    const caption = formData.get("caption") || "";
    if (!file) return Response.json({ error: "No file" }, { status: 400 });
    const ext = file.name.split(".").pop();
    const filename = `marketing-os/images/${brandId}/${Date.now()}.${ext}`;
    const blob = await put(filename, file, { access: "public", addRandomSuffix: false });
    return Response.json({ url: blob.url, caption, id: Date.now().toString(), createdAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const { blobs } = await list({ prefix: `marketing-os/images/${brandId}/` });
    return Response.json(blobs.map(b => ({ url: b.url, id: b.pathname.split("/").pop().split(".")[0], createdAt: b.uploadedAt })));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { url } = await request.json();
    await del(url);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
