'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  decideCorrelation,
  getLifecycle,
  type Correlation,
  type Lifecycle,
  type LifecycleEvent,
} from '@/lib/api';

export default function LifecycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      setLifecycle(await getLifecycle(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (correlationId: string, action: string) => {
    setBusy(true);
    setError(null);
    try {
      await decideCorrelation(id, correlationId, action, note || undefined);
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'action failed');
    } finally {
      setBusy(false);
    }
  };

  const events = lifecycle?.events ?? [];

  return (
    <AppShell active="iso-messages">
      <div className="card">
        <h2>Payment lifecycle {id.slice(0, 24)}</h2>
        <ul className="status-list">
          <li><span>Current status</span><span className="badge badge-warn">{lifecycle?.current_status ?? '—'}</span></li>
          <li><span>End-to-end / instruction / tx</span><span>{lifecycle?.end_to_end_id ?? '—'} / {lifecycle?.instruction_id ?? '—'} / {lifecycle?.transaction_id ?? '—'}</span></li>
          <li><span>Amount</span><span>{lifecycle?.amount_minor != null ? `${lifecycle.amount_minor} ${lifecycle.currency ?? ''}` : '—'}</span></li>
          <li><span>Original message</span><span>{lifecycle?.original_message_id ?? '—'}</span></li>
        </ul>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
        <p className="muted small">
          Analytical lifecycle state only. PaymentOps never executes or settles a payment.
        </p>
      </div>

      <div className="card">
        <h3>Timeline</h3>
        {events.length === 0 && <p className="muted">No events yet.</p>}
        <div style={{ borderLeft: '2px solid var(--cn-border)', paddingLeft: '1rem' }}>
          {events.map((e, i) => (
            <EventRow key={e.id} e={e} last={i === events.length - 1} />
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Correlation review</h3>
        <label>
          <span className="field-label">Note (applies to next action)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {(lifecycle?.correlations ?? []).map((c) => (
          <CorrelationBlock key={c.id} c={c} onAction={act} busy={busy} />
        ))}
        {(lifecycle?.correlations ?? []).length === 0 && <p className="muted">No correlations recorded.</p>}
      </div>
    </AppShell>
  );
}

function EventRow({ e, last }: { e: LifecycleEvent; last: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : '1rem' }}>
      <div className="status-list">
        <li>
          <span>
            <strong>{e.event_type}</strong> · {e.message_definition} ({e.message_version})
          </span>
          <span className="badge badge-muted">{e.status}{e.raw_status_code ? ` (${e.raw_status_code})` : ''}</span>
        </li>
        <li><span>Timestamp</span><span>{e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}</span></li>
        {e.correlation_evidence && e.correlation_evidence.length > 0 && (
          <li><span>Evidence</span><span className="muted small">{e.correlation_evidence.join(', ')}</span></li>
        )}
      </div>
    </div>
  );
}

function CorrelationBlock({ c, onAction, busy }: { c: Correlation; onAction: (id: string, action: string) => void; busy: boolean }) {
  const decided = c.correlation_status === 'CORRELATED' || c.correlation_status === 'UNRESOLVED';
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <ul className="status-list">
        <li><span>Correlation</span><span className="badge badge-warn">{c.correlation_status}</span></li>
        <li><span>Source / candidate</span><span>{c.source_message_id ?? '—'} → {c.candidate_message_id ?? '—'}</span></li>
        {c.evidence.length > 0 && <li><span>Evidence</span><span className="muted small">{c.evidence.join(', ')}</span></li>}
        {c.conflicts.length > 0 && <li><span>Conflicts</span><span className="muted small" style={{ color: 'var(--cn-danger)' }}>{c.conflicts.join(', ')}</span></li>}
      </ul>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn" onClick={() => onAction(c.id, 'confirm')} disabled={busy || decided}>Confirm Correlation</button>
        <button className="btn btn-ghost" onClick={() => onAction(c.id, 'reject')} disabled={busy || decided}>Reject Correlation</button>
        <button className="btn btn-ghost" onClick={() => onAction(c.id, 'leave')} disabled={busy || decided}>Leave Unresolved</button>
      </div>
    </div>
  );
}
