'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { listAccountReports, runAccountReconciliation, type AccountReport } from '@/lib/api';

export default function AccountReportsPage() {
  const [reports, setReports] = useState<AccountReport[]>([]);
  const [reportType, setReportType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setReports(await listAccountReports({ report_type: reportType }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [reportType]);

  useEffect(() => {
    load();
  }, [load]);

  const runRecon = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await runAccountReconciliation(48);
      setMissing(res.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'reconciliation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell active="account-reports">
      <div className="card">
        <h2>Account Reports</h2>
        <p className="muted small">
          camt.053 statements and camt.054 notifications — analyzed as account-reporting evidence only.
          PaymentOps never debits, credits, or settles.
        </p>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>

      <div className="card">
        <div className="stack">
          <label>
            <span className="field-label">Report type</span>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="">All</option>
              <option value="STATEMENT">STATEMENT (camt.053)</option>
              <option value="NOTIFICATION">NOTIFICATION (camt.054)</option>
            </select>
          </label>
          <button className="btn btn-ghost" onClick={runRecon} disabled={busy}>
            {busy ? 'Running…' : 'Run missing-event reconciliation'}
          </button>
          {missing !== null && <p className="muted small">Missing account events flagged: {missing}</p>}
        </div>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {['Report', 'Type', 'Version', 'Account', 'Period', 'Entries', 'Created'].map((h) => (
                <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid var(--cn-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>
                  <Link href={`/account-reports/${r.id}`}>
                    {r.statement_id ?? r.notification_id ?? r.id.slice(0, 12)}
                  </Link>
                </td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.report_type}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.message_version}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.account_iban ?? '—'}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>
                  {r.period_start ?? '—'}{r.period_end ? ` → ${r.period_end}` : ''}
                </td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{r.entry_count}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>
                  {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan={7} className="muted">No account reports yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
