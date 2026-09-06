'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  decideCandidate,
  getReconciliation,
  type FieldMatchResult,
  type MatchCandidate,
  type ReconciliationRun,
} from '@/lib/api';

export default function MatchDetailPage() {
  const { matchRunId } = useParams<{ matchRunId: string }>();
  const [run, setRun] = useState<ReconciliationRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      setRun(await getReconciliation(matchRunId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [matchRunId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (candidateId: string, action: string) => {
    setBusy(true);
    setError(null);
    try {
      await decideCandidate(candidateId, action, note || undefined);
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell active="matching">
      <div className="card">
        <h2>Match run {matchRunId.slice(0, 12)}</h2>
        <ul className="status-list">
          <li><span>Status</span><span className="badge badge-muted">{run?.status ?? '…'}</span></li>
          <li><span>Total / Matched / Possible</span><span>{run?.total ?? 0} / {run?.matched ?? 0} / {run?.possible_match ?? 0}</span></li>
          <li><span>Review / Unmatched / Duplicate</span><span>{run?.review_required ?? 0} / {run?.unmatched ?? 0} / {run?.duplicate_candidate ?? 0}</span></li>
          <li><span>Policy version</span><span>{run?.policy_version ?? '—'}</span></li>
        </ul>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>

      <div className="card">
        <h2>Candidates</h2>
        <label>
          <span className="field-label">Note (applies to next action)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {(run?.candidates ?? []).map((c) => (
          <CandidateBlock key={c.candidate_id} c={c} onAction={act} busy={busy} />
        ))}
        {(run?.candidates ?? []).length === 0 && <p className="muted">No candidates yet.</p>}
      </div>
    </AppShell>
  );
}

function CandidateBlock({
  c,
  onAction,
  busy,
}: {
  c: MatchCandidate;
  onAction: (id: string, action: string) => void;
  busy: boolean;
}) {
  const fields: FieldMatchResult[] = (c.field_results ?? []) as FieldMatchResult[];
  const decided = ['CONFIRMED', 'REJECTED', 'DUPLICATE', 'REVIEW_REQUIRED'].includes(c.status);
  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>
        {c.source_record_id.slice(0, 16)} → {c.candidate_record_id.slice(0, 16)}
      </h3>
      <ul className="status-list">
        <li><span>Score</span><span>{c.match_score}</span></li>
        <li><span>Classification</span><span className="badge badge-warn">{c.classification}</span></li>
        <li><span>Status</span><span>{c.status}</span></li>
      </ul>
      <h4>Field-by-field</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr>
            {['Field', 'Similarity', 'Weight', 'Status', 'Code'].map((h) => (
              <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid var(--cn-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.field}>
              <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{f.field}</td>
              <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{f.similarity}</td>
              <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{f.weight}</td>
              <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{f.status}</td>
              <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{f.explanation_code ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button className="btn" onClick={() => onAction(c.candidate_id, 'confirm')} disabled={busy || decided}>Confirm Match</button>
        <button className="btn btn-ghost" onClick={() => onAction(c.candidate_id, 'reject')} disabled={busy || decided}>Reject Match</button>
        <button className="btn btn-ghost" onClick={() => onAction(c.candidate_id, 'duplicate')} disabled={busy || decided}>Mark Duplicate</button>
      </div>
      {decided && <p className="muted small">Candidate is {c.status}. Actions disabled.</p>}
    </div>
  );
}
