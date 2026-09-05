'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { listCases, type CaseSummary } from '@/lib/api';

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCases().then(setCases).catch((e) => setError(e instanceof Error ? e.message : 'failed to load'));
  }, []);

  const filtered = statusFilter ? cases.filter((c) => c.status === statusFilter) : cases;

  return (
    <AppShell active="cases">
      <div className="card">
        <h2>Cases</h2>
        <label>
          <span className="field-label">Filter by status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option>NEW</option>
            <option>ANALYZED</option>
            <option>REPAIR_PROPOSED</option>
            <option>REVIEW_REQUIRED</option>
            <option>APPROVED</option>
            <option>REJECTED</option>
            <option>CLOSED</option>
          </select>
        </label>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>
      <div className="card">
        <ul className="status-list">
          {filtered.map((c) => (
            <li key={c.case_id}>
              <span>
                <Link href={`/cases/${c.case_id}`}>{c.case_id.slice(0, 16)}</Link> · {c.message_type ?? '—'} · {c.address_readiness ?? '—'} · {c.repair_status ?? '—'}
              </span>
              <span className="badge badge-muted">{c.status}</span>
            </li>
          ))}
          {filtered.length === 0 && <li className="muted">No cases match.</li>}
        </ul>
      </div>
    </AppShell>
  );
}
