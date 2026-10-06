import type { NextRequest } from "next/server";

/**
 * Same-origin proxy to the FastAPI training backend.
 *
 * - The browser only ever talks to this app, so there is no CORS setup.
 * - The backend address is read at request time (`API_BASE_URL`), so one
 *   build works against any backend.
 * - When the backend is down the UI gets a clear 503 instead of a fetch crash.
 */
const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function proxy(request: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  const target = `${API_BASE_URL}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        accept: "application/json",
        ...(hasBody ? { "content-type": request.headers.get("content-type") ?? "application/json" } : {}),
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        detail: `The training API isn't reachable at ${API_BASE_URL}. Start it with "docker compose up -d" in the backend folder.`,
      },
      { status: 503 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT };
