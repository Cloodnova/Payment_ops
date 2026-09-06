'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import {
  createReconciliation,
  getReconciliationReport,
  listReconciliations,
  type MatchRecord,
  type ReconciliationRun,
} from '@/lib/api';

const SAMPLE_SOURCE = `[
  {"record_id":"inv-1","record_type":"INVOICE","organization_id":"org-1","amount":"12500","currency":"EUR","remittance_reference":"INV-92881","creditor_name":"ACME INDUSTRIA SPA"}
]`;
const SAMPLE_CANDIDATE = `[
  {"record_id":"pay-1","record_type":"PAYMENT","organization_id":"org-1","amount":"12500","currency":"EUR","remittance_reference":"INV92881","creditor_name":"ACME INDUSTRIA S.P.A."}
]`;

export default function ReconciliationPage() {
  const [runs, setRuns] = useState<ReconciliationRun[]>([]);
  const [sourceJson, setSourceJson] = useState(SAMPLE_SOURCE);
  const [candJson, setCandJson] = useState(SAMPLE_CANDIDATE);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setRuns(await listReconciliations());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const source_records = JSON.parse(sourceJson) as MatchRecord[];
      const candidate_records = JSON.parse(candJson) as MatchRecord[];
      const res = await createReconciliation({ source_records, candidate_records });
      await load();
      if (res.run_id) {
        window.location.href = `/matching/${res.run_id}`;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to start');
    } finally {
      setBusy(false);
    }
  };

  const download = async (runId: string) => {
    try {
      const csv = await getReconciliationReport(runId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconciliation-${runId.slice(0, 12)}.csv`;
      a.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'download failed');
    }
  };

  return (
    <AppShell active="reconciliation">
      <div className="card">
        <h2>Reconciliation</h2>
        <p className="muted small">
          Batch reconciliation of a source dataset against a candidate dataset. Results are
          non-transactional decisions only.
        </p>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Source dataset (JSON)</h3>
          <textarea value={sourceJson} onChange={(e) => setSourceJson(e.target.value)} rows={8} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem' }} />
        </div>
        <div className="card">
          <h3>Candidate dataset (JSON)</h3>
          <textarea value={candJson} onChange={(e) => setCandJson(e.target.value)} rows={8} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem' }} />
        </div>
      </div>
      <div className="card">
        <button className="btn" onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Start reconciliation'}</button>
      </div>

      <div className="card">
        <h3>Runs</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {['Run', 'Status', 'Total', 'Matched', 'Possible', 'Review', 'Unmatched', 'Dup', 'Failed', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid var(--cn-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.run_id}>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>
                  <Link href={`/matching/${r.run_id}`}>{r.run_id.slice(0, 12)}</Link>
                </td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.status}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.total}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.matched}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.possible_match}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.review_required}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.unmatched}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.duplicate_candidate}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.failed}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>
                  <button className="btn btn-ghost" onClick={() => download(r.run_id)}>CSV</button>
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr><td colSpan={10} className="muted">No reconciliation runs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
