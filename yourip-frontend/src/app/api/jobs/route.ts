export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const response = await fetch(`${process.env.YOURIP_BACKEND_URL || "http://127.0.0.1:8000"}/api/jobs`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: await request.text(), cache: "no-store",
    });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ detail: "The converter is unavailable. Start YouRip with npm start." }, { status: 502 });
  }
}
