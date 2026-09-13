import { type NextRequest, NextResponse } from 'next/server';

// Same-origin API proxy.
//
//   Browser -> https://<public-host>/api/backend/*  (same origin)
//           -> this route handler (server-side, Next.js)
//           -> PAYMENTOPS_INTERNAL_API_URL/*        (cluster-internal)
//
// The browser never learns the internal Kubernetes service URL or the operator
// credentials. Credentials are injected server-side and are never returned to the client.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function internalApiUrl(): string {
  return (process.env.PAYMENTOPS_INTERNAL_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
}

// Hop-by-hop headers (RFC 7230 §6.1) plus headers we must not blindly forward.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'accept-encoding',
]);

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

async function proxy(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const suffix = (path ?? []).map(encodeURIComponent).join('/');
  const target = `${internalApiUrl()}/${suffix}${request.nextUrl.search}`;

  // Build outbound headers from safe inbound headers only.
  const outbound = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) outbound.set(key, value);
  });
  outbound.set('accept', request.headers.get('accept') ?? 'application/json');

  // Inject server-side operator credentials (never exposed to the browser).
  const clientId = process.env.PAYMENTOPS_CLIENT_ID;
  const clientSecret = process.env.PAYMENTOPS_CLIENT_SECRET;
  if (clientId && clientSecret) {
    outbound.set('X-Client-Id', clientId);
    outbound.set('X-Client-Secret', clientSecret);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: outbound,
      body: body && body.byteLength > 0 ? body : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    // Never log the request body or credentials. Return a structured, safe error.
    return NextResponse.json(
      { detail: 'Upstream PaymentOps API is unavailable.' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
export async function POST(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
export async function PUT(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
export async function HEAD(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return proxy(request, ctx);
}
export async function OPTIONS(request: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  if (!ALLOWED_METHODS.includes(request.method)) {
    return new NextResponse(null, { status: 405 });
  }
  return proxy(request, ctx);
}
