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

// Week 3: a bootstrap admin client for the operator UI (dev). In production the operator
// UI would authenticate via the platform IdP.
const ADMIN_CLIENT_ID = process.env.NEXT_PUBLIC_ADMIN_CLIENT_ID ?? '';
const ADMIN_CLIENT_SECRET = process.env.NEXT_PUBLIC_ADMIN_CLIENT_SECRET ?? '';

function authHeaders(): Record<string, string> {
  return {
    'X-Client-Id': ADMIN_CLIENT_ID,
    'X-Client-Secret': ADMIN_CLIENT_SECRET,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export interface Profile {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  input_format: string;
  version_number?: number;
}

export function listProfiles() {
  return apiJson<Profile[]>('/api/v1/integration-profiles');
}

export function createProfile(p: Profile) {
  return apiJson<Profile>('/api/v1/integration-profiles', { method: 'POST', body: JSON.stringify(p) });
}

export function publishProfile(id: string) {
  return apiJson<{ published: boolean }>(`/api/v1/integration-profiles/${id}/publish`, { method: 'POST' });
}

export interface CaseSummary {
  case_id: string;
  status: string;
  message_type?: string;
  address_readiness?: string;
  repair_status?: string;
}

export function listCases() {
  return apiJson<CaseSummary[]>('/api/v1/cases?limit=50');
}

export interface CaseDetail extends CaseSummary {
  organization_id?: string;
  validation_status?: string;
  address_provider?: string;
  address_provider_version?: string;
  address_provider_coverage?: string;
  input_hash?: string;
  output_hash?: string;
  disclaimer?: string;
  profile_id?: string;
  integration_profile_version?: string;
  mapping_version?: string;
  ruleset_version?: string;
  engine_version?: string;
  findings?: { rule_id: string; severity: string; target?: string | null; message?: string | null }[];
  audit?: { timestamp?: string | null; actor?: string | null; event: string }[];
}

export function getCase(caseId: string) {
  return apiJson<CaseDetail>(`/api/v1/cases/${caseId}`);
}

export function caseAction(caseId: string, action: string, note?: string, operator?: string) {
  return apiJson<{ case_id: string; status: string }>(`/api/v1/cases/${caseId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ action, note, operator }),
  });
}

export interface BatchJobSummary {
  job_id: string;
  profile_id: string;
  profile_version: number;
  status: string;
  total_records: number;
  processed_records: number;
  ready_count: number;
  repairable_count: number;
  review_required_count: number;
  unresolved_count: number;
  failed_count: number;
  report?: Record<string, unknown> | null;
  created_at?: string;
  completed_at?: string;
}

export function listBatches() {
  return apiJson<BatchJobSummary[]>('/api/v1/batches');
}

export function getBatch(jobId: string) {
  return apiJson<BatchJobSummary>(`/api/v1/batches/${jobId}`);
}

export function createBatch(profileId: string, csv: string, profileVersion = 1) {
  return apiJson<{ job_id: string; status: string; accepted: boolean }>('/api/v1/batches', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId, csv, profile_version: profileVersion }),
  });
}

export interface DashboardMetrics {
  analyzed: number;
  ready: number;
  repairable: number;
  review_required: number;
  unresolved: number;
  open_cases: number;
  running_batches: number;
  top_findings: Record<string, number>;
}

export function getDashboard() {
  return apiJson<DashboardMetrics>('/api/v1/dashboard');
}

export function analyzeProfile(profileId: string, payload: string, opts: { repair?: boolean; idempotencyKey?: string } = {}) {
  return apiJson<Record<string, unknown>>(`/api/v1/integrations/${profileId}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ payload, repair: opts.repair ?? true, idempotency_key: opts.idempotencyKey }),
  });
}

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
