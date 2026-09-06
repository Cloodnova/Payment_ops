'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import {
  evaluateMatch,
  searchCandidates,
  type CandidateMatch,
  type FieldMatchResult,
  type MatchDecision,
  type MatchRecord,
} from '@/lib/api';

const empty = (): MatchRecord => ({
  record_id: '',
  record_type: 'PAYMENT',
  organization_id: '',
  amount: '',
  currency: 'EUR',
  remittance_reference: '',
  creditor_name: '',
  value_date: '',
  debtor_account: '',
});

export default function MatchingPage() {
  const [a, setA] = useState<MatchRecord>(empty());
  const [b, setB] = useState<MatchRecord>(empty());
  const [decision, setDecision] = useState<MatchDecision | null>(null);
  const [candidates, setCandidates] = useState<CandidateMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (set: Dispatch<SetStateAction<MatchRecord>>, field: keyof MatchRecord, value: string) => {
    set((r) => ({ ...r, [field]: value }));
  };

  const onEvaluate = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await evaluateMatch({ record_a: a, record_b: b });
      setDecision(d);
      setCandidates([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'evaluate failed');
    } finally {
      setBusy(false);
    }
  };

  const onSearch = async () => {
    setBusy(true);
    setError(null);
    try {
      setCandidates(await searchCandidates(a));
      setDecision(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'search failed');
    } finally {
      setBusy(false);
    }
  };

  const recordFields: { key: keyof MatchRecord; label: string }[] = [
    { key: 'record_id', label: 'Record ID' },
    { key: 'record_type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'remittance_reference', label: 'Reference' },
    { key: 'creditor_name', label: 'Creditor' },
    { key: 'value_date', label: 'Value Date' },
    { key: 'debtor_account', label: 'Debtor Account' },
  ];

  const recordForm = (label: string, r: MatchRecord, set: Dispatch<SetStateAction<MatchRecord>>) => (
    <div className="card">
      <h2>{label}</h2>
      <div className="stack">
        {recordFields.map((f) => (
          <label key={f.key}>
            <span className="field-label">{f.label}</span>
            <input
              type="text"
              value={(r[f.key] as string) ?? ''}
              onChange={(e) => patch(set, f.key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell active="matching">
      <div className="card">
        <h2>Matching</h2>
        <p className="muted small">
          Deterministic matching intelligence. A CONFIRMED match is a reconciliation decision
          only — it never executes or settles a payment.
        </p>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>

      <div className="grid-2">
        {recordForm('Source Record', a, setA)}
        {recordForm('Candidate Record', b, setB)}
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={onEvaluate} disabled={busy}>Evaluate pair</button>
          <button className="btn btn-ghost" onClick={onSearch} disabled={busy}>Search candidates</button>
          <Link href="/reconciliation" className="btn btn-ghost">Reconciliation</Link>
        </div>
      </div>

      {decision && (
        <div className="card">
          <h2>Decision</h2>
          <div className="status-list">
            <li><span>Classification</span><span className="badge badge-warn">{decision.classification}</span></li>
            <li><span>Match score</span><span>{decision.match_score}</span></li>
            <li><span>Policy / engine</span><span>{decision.policy_version} / {decision.engine_version}</span></li>
          </div>
          <h3>Critical conflicts</h3>
          {decision.critical_conflicts.length === 0 && <p className="muted small">None.</p>}
          <ul className="status-list">
            {decision.critical_conflicts.map((c) => (
              <li key={c.field}><span>{c.field}</span><span className="badge badge-muted">{c.code}</span></li>
            ))}
          </ul>
          <h3>Field results</h3>
          <FieldTable rows={decision.field_results} />
        </div>
      )}

      {candidates.length > 0 && (
        <div className="card">
          <h2>Ranked candidates</h2>
          <ul className="status-list">
            {candidates.map((c) => (
              <li key={c.candidate_id}>
                <span>
                  {c.candidate_id.slice(0, 16)} · score {c.match_score} · <strong>{c.classification}</strong>
                </span>
                <span className="badge badge-muted">{c.critical_conflicts.length} conflicts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}

function FieldTable({ rows }: { rows: FieldMatchResult[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
      <thead>
        <tr>
          {['Field', 'Similarity', 'Weight', 'Status', 'Code'].map((h) => (
            <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid var(--cn-border)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.field}>
            <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.field}</td>
            <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.similarity}</td>
            <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.weight}</td>
            <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.status}</td>
            <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.explanation_code ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
