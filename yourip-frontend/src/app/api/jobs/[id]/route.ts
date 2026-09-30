export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const response = await fetch(`${process.env.YOURIP_BACKEND_URL || "http://127.0.0.1:8000"}/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ detail: "The converter is unavailable." }, { status: 502 });
  }
}
