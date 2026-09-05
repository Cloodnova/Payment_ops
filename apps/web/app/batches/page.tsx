'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { listBatches, type BatchJobSummary } from '@/lib/api';

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchJobSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setBatches(await listBatches());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell active="batches">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Batch jobs</h2>
          <Link href="/batches/new" className="btn">New batch</Link>
        </div>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>
      <div className="card">
        <ul className="status-list">
          {batches.map((b) => (
            <li key={b.job_id}>
              <span>
                <Link href={`/batches/${b.job_id}`}>{b.job_id.slice(0, 12)}</Link> · {b.status} · {b.processed_records}/{b.total_records} processed
              </span>
              <span className="badge badge-muted">
                R:{b.ready_count} RP:{b.repairable_count} RV:{b.review_required_count} F:{b.failed_count}
              </span>
            </li>
          ))}
          {batches.length === 0 && <li className="muted">No batch jobs yet.</li>}
        </ul>
      </div>
    </AppShell>
  );
}
