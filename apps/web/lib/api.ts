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

export interface AnalyzeResponse {
  case_id: string;
  message_type: string | null;
  message_version: string | null;
  original_validation_status: string;
  schema_issues: { code: string; severity: string; path: string | null; message: string }[];
  rule_findings: { rule_id: string; severity: string; message: string; target: string }[];
  address_analyses: {
    party: string | null;
    readiness: string | null;
    evidence_level: string | null;
    country_code: string | null;
    town_name: string | null;
  }[];
  address_readiness: string | null;
  repair_status: string | null;
  candidate_diff: { path: string; before: string | null; after: string | null; source: string; status: string }[];
  candidate_validation_status: string | null;
  candidate_xml: string | null;
  ruleset_version: string | null;
  address_provider: string | null;
  input_hash: string | null;
  output_hash: string | null;
  warnings: string[];
}

export async function analyzePayment(
  xml: string,
  opts: { repair?: boolean; persist?: boolean; includeCandidateXml?: boolean } = {},
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/payments/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      xml,
      repair: opts.repair ?? true,
      persist: opts.persist ?? false,
      include_candidate_xml: opts.includeCandidateXml ?? false,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body as AnalyzeResponse;
}
