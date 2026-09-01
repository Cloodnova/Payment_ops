export interface PlatformInfo {
  product: string;
  version: string;
  environment: string;
  ai_enabled: boolean;
  ai_provider: string;
  zero_retention_enabled: boolean;
  database_configured: boolean;
  redis_configured: boolean;
}

export interface HealthResult {
  status: string;
}

export interface ReadinessCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ReadinessResult {
  status: string;
  checks: ReadinessCheck[];
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function safeJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getInfo() {
  return safeJson<PlatformInfo>('/api/v1/info');
}

export function getHealth() {
  return safeJson<HealthResult>('/health');
}

export function getReadiness() {
  return safeJson<ReadinessResult>('/ready');
}
