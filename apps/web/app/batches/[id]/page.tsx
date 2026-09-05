'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getBatch, type BatchJobSummary } from '@/lib/api';

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchJobSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await getBatch(id);
      setBatch(b);
      setError(null);
      // Poll while RUNNING / QUEUED.
      if (b.status === 'RUNNING' || b.status === 'QUEUED') {
        setTimeout(load, 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const pct = batch && batch.total_records > 0 ? Math.round((batch.processed_records / batch.total_records) * 100) : 0;

  return (
    <AppShell active="batches">
      <div className="card">
        <h2>Batch {id.slice(0, 12)}</h2>
        <ul className="status-list">
          <li><span>Status</span><span className="badge badge-muted">{batch?.status ?? '…'}</span></li>
          <li><span>Progress</span><span>{batch?.processed_records ?? 0} / {batch?.total_records ?? 0} ({pct}%)</span></li>
          <li><span>Ready</span><span>{batch?.ready_count ?? 0}</span></li>
          <li><span>Repairable</span><span>{batch?.repairable_count ?? 0}</span></li>
          <li><span>Review required</span><span>{batch?.review_required_count ?? 0}</span></li>
          <li><span>Unresolved</span><span>{batch?.unresolved_count ?? 0}</span></li>
          <li><span>Failed</span><span>{batch?.failed_count ?? 0}</span></li>
        </ul>
        <div style={{ height: '1rem', background: 'var(--cn-bg)', borderRadius: 'var(--cn-radius)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cn-primary)' }} />
        </div>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
        {batch?.status === 'COMPLETED' || batch?.status === 'PARTIAL' ? (
          <button
            className="btn btn-ghost"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              const report = JSON.stringify(batch.report ?? {}, null, 2);
              const blob = new Blob([report], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `batch-${id.slice(0, 12)}-report.json`;
              a.click();
            }}
          >
            Download report
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
