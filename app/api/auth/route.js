export async function POST(request) {
  try {
    const { password } = await request.json();
    const correct = process.env.APP_PASSWORD;
    if (!correct) return Response.json({ error: "No password configured" }, { status: 500 });
    if (password === correct) {
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
