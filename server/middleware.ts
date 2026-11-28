import { NextResponse, type NextRequest } from "next/server";

const allowedOrigins = () =>
  (process.env.CLIENT_URL ?? "").split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const response = request.method === "OPTIONS" ? new NextResponse(null, { status: 204 }) : NextResponse.next();
  if (allowedOrigins().includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.headers.set("Access-Control-Expose-Headers", "Content-Disposition");
    response.headers.set("Access-Control-Max-Age", "86400");
  }
  response.headers.set("Vary", "Origin");
  return response;
}

export const config = { matcher: "/api/:path*" };
