'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { caseAction, getCase, type CaseDetail } from '@/lib/api';

export default function CaseReviewPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      setDetail(await getCase(caseId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await caseAction(caseId, action, note || undefined);
      setDetail({ ...(detail as CaseDetail), status: r.status });
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'action failed');
    } finally {
      setBusy(false);
    }
  };

  const finished = detail ? ['APPROVED', 'REJECTED', 'CLOSED'].includes(detail.status) : false;
  const row = (k: string, v: string | number | null | undefined) => (
    <li><span>{k}</span><span>{v ?? '—'}</span></li>
  );

  return (
    <AppShell active="cases">
      <div className="card">
        <div style={{ border: '1px solid #ecd9ae', background: '#fdf6e7', padding: '0.6rem 0.8rem', borderRadius: 'var(--cn-radius)', marginBottom: '1rem' }}>
          {detail?.disclaimer ?? 'Approval in PaymentOps approves the data-repair candidate only. It does not authorize, release, settle, or execute the payment.'}
        </div>
        <h2>Case {caseId.slice(0, 16)}</h2>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
        <ul className="status-list">
          {row('State', detail?.status)}
          {row('Profile', detail?.profile_id)}
          {row('Profile version', detail?.integration_profile_version)}
          {row('Mapping version', detail?.mapping_version)}
          {row('Ruleset version', detail?.ruleset_version)}
          {row('Message type', detail?.message_type)}
          {row('Provider', detail?.address_provider)}
          {row('Coverage', detail?.address_provider_coverage)}
          {row('Readiness', detail?.address_readiness)}
          {row('Repair status', detail?.repair_status)}
        </ul>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Rule findings</h2>
          <ul className="status-list">
            {(detail?.findings ?? []).map((f, i) => (
              <li key={i}>
                <span><strong>{f.rule_id}</strong> · {f.message}</span>
                <span className="badge badge-warn">{f.severity}</span>
              </li>
            ))}
            {(detail?.findings ?? []).length === 0 && <li className="muted">No findings.</li>}
          </ul>
        </div>
        <div className="card">
          <h2>Audit timeline</h2>
          <ul className="status-list">
            {(detail?.audit ?? []).map((a, i) => (
              <li key={i}>
                <span>{a.event}</span>
                <span className="muted small">{a.actor ?? 'system'} · {a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}</span>
              </li>
            ))}
            {(detail?.audit ?? []).length === 0 && <li className="muted">No audit events.</li>}
          </ul>
        </div>
      </div>

      <div className="card">
        <h2>Operator actions</h2>
        <div className="stack">
          <label>
            <span className="field-label">Note</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={() => act('approve')} disabled={busy || finished}>Approve Repair Candidate</button>
            <button className="btn btn-ghost" onClick={() => act('reject')} disabled={busy || finished}>Reject</button>
            <button className="btn btn-ghost" onClick={() => act('close')} disabled={busy || finished}>Close</button>
          </div>
          {busy && <p className="muted small">Processing…</p>}
          {finished && <p className="muted small">Case is {detail?.status}. Action buttons disabled to prevent accidental double actions.</p>}
        </div>
      </div>
    </AppShell>
  );
}
