export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const response = await fetch(`${process.env.YOURIP_BACKEND_URL || "http://127.0.0.1:8000"}/api/jobs/${encodeURIComponent(id)}/file`, { cache: "no-store" });
    const headers = new Headers();
    for (const name of ["content-type", "content-disposition", "content-length"])
      if (response.headers.has(name)) headers.set(name, response.headers.get(name)!);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return Response.json({ detail: "The converter is unavailable." }, { status: 502 });
  }
}
