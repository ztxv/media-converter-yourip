export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") || "";
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return Response.json({}, { status: 404 });
    return Response.json(await response.json());
  } catch {
    return Response.json({}, { status: 502 });
  }
}
