import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

interface FetchCall {
  url: string;
  init: RequestInit;
}

function stubFetch(status = 200, body: unknown = { status: 'ok' }): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

beforeEach(() => {
  process.env.PAYMENTOPS_INTERNAL_API_URL = 'http://paymentops-api:8000';
  process.env.PAYMENTOPS_CLIENT_ID = 'operator-client';
  process.env.PAYMENTOPS_CLIENT_SECRET = 'operator-secret';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PAYMENTOPS_CLIENT_ID;
  delete process.env.PAYMENTOPS_CLIENT_SECRET;
});

describe('same-origin API proxy', () => {
  it('forwards to the internal API on the same path and query', async () => {
    const calls = stubFetch(200, { analyzed: 1 });
    const req = new NextRequest('https://public.test/api/backend/api/v1/dashboard?limit=5');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'v1', 'dashboard'] }) });

    expect(res.status).toBe(200);
    expect(calls[0].url).toBe('http://paymentops-api:8000/api/v1/dashboard?limit=5');
  });

  it('injects server-side operator credentials and never returns them', async () => {
    const calls = stubFetch();
    const req = new NextRequest('https://public.test/api/backend/health');
    const res = await GET(req, { params: Promise.resolve({ path: ['health'] }) });

    const headers = calls[0].init.headers as Headers;
    expect(headers.get('X-Client-Id')).toBe('operator-client');
    expect(headers.get('X-Client-Secret')).toBe('operator-secret');
    expect(res.headers.get('x-client-secret')).toBeNull();
  });

  it('does not forward hop-by-hop or spoofed host headers', async () => {
    const calls = stubFetch();
    const req = new NextRequest('https://public.test/api/backend/api/v1/info', {
      headers: { connection: 'keep-alive', 'x-custom': 'keep-me' },
    });
    await GET(req, { params: Promise.resolve({ path: ['api', 'v1', 'info'] }) });

    const headers = calls[0].init.headers as Headers;
    expect(headers.has('connection')).toBe(false);
    expect(headers.has('host')).toBe(false);
    expect(headers.get('x-custom')).toBe('keep-me');
  });

  it('preserves method, body and structured error status', async () => {
    const calls = stubFetch(422, { detail: 'unsupported ISO version' });
    const req = new NextRequest('https://public.test/api/backend/api/v1/iso/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ xml: '<Document/>' }),
    });
    const res = await POST(req, { params: Promise.resolve({ path: ['api', 'v1', 'iso', 'analyze'] }) });

    expect(calls[0].init.method).toBe('POST');
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ detail: 'unsupported ISO version' });
  });

  it('returns a safe structured error when the upstream is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('fetch failed');
    }));
    const req = new NextRequest('https://public.test/api/backend/api/v1/dashboard');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'v1', 'dashboard'] }) });

    expect(res.status).toBe(502);
    expect((await res.json()).detail).toMatch(/unavailable/i);
  });
});
