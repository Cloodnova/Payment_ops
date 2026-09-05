'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { getDashboard, listBatches, listCases, type DashboardMetrics, type BatchJobSummary, type CaseSummary } from '@/lib/api';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [batches, setBatches] = useState<BatchJobSummary[]>([]);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [m, b, c] = await Promise.all([getDashboard(), listBatches(), listCases()]);
      setMetrics(m);
      setBatches(b);
      setCases(c);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const card = (label: string, value: number | string | undefined) => (
    <div className="card" style={{ padding: '1rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{value ?? '—'}</h2>
      <p className="muted small" style={{ margin: 0 }}>{label}</p>
    </div>
  );

  const maxCount = Math.max(
    metrics?.ready ?? 0,
    metrics?.repairable ?? 0,
    metrics?.review_required ?? 0,
    metrics?.unresolved ?? 0,
    1,
  );
  const dist = [
    { label: 'READY', value: metrics?.ready ?? 0, color: 'var(--cn-ok)' },
    { label: 'REPAIRABLE', value: metrics?.repairable ?? 0, color: 'var(--cn-accent)' },
    { label: 'REVIEW_REQUIRED', value: metrics?.review_required ?? 0, color: 'var(--cn-warn)' },
    { label: 'UNRESOLVED', value: metrics?.unresolved ?? 0, color: 'var(--cn-danger)' },
  ];

  return (
    <AppShell active="dashboard">
      {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      <div className="grid-2">
        {card('Payments Analyzed', metrics?.analyzed)}
        {card('Ready', metrics?.ready)}
        {card('Repairable', metrics?.repairable)}
        {card('Review Required', metrics?.review_required)}
        {card('Unresolved', metrics?.unresolved)}
        {card('Open Cases', metrics?.open_cases)}
        {card('Running Batches', metrics?.running_batches)}
      </div>

      <div className="card">
        <h2>Readiness distribution</h2>
        {metrics ? (
          <div style={{ display: 'flex', gap: '0.5rem', height: '1.5rem', borderRadius: 'var(--cn-radius)', overflow: 'hidden' }}>
            {dist.map((d) => (
              <div key={d.label} title={`${d.label}: ${d.value}`} style={{ width: `${(d.value / maxCount) * 100}%`, background: d.color }} />
            ))}
          </div>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Recent batches</h2>
          <ul className="status-list">
            {batches.slice(0, 6).map((b) => (
              <li key={b.job_id}>
                <span>
                  <Link href={`/batches/${b.job_id}`}>{b.job_id.slice(0, 12)}</Link> · {b.status} · {b.processed_records}/{b.total_records}
                </span>
                <span className="badge badge-muted">{b.failed_count} failed</span>
              </li>
            ))}
            {batches.length === 0 && <li className="muted">No batches yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h2>Review queue</h2>
          <ul className="status-list">
            {cases.filter((c) => c.status === 'REVIEW_REQUIRED').slice(0, 6).map((c) => (
              <li key={c.case_id}>
                <span><Link href={`/cases/${c.case_id}`}>{c.case_id.slice(0, 14)}</Link> · {c.address_readiness ?? '—'}</span>
                <span className="badge badge-warn">{c.status}</span>
              </li>
            ))}
            {cases.filter((c) => c.status === 'REVIEW_REQUIRED').length === 0 && <li className="muted">Review queue empty.</li>}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
