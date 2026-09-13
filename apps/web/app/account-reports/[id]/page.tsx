'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getAccountReport, type AccountReport } from '@/lib/api';

export default function AccountReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<AccountReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setReport(await getAccountReport(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const entries = (report?.entries ?? []).filter((e) =>
    filter ? e.reconciliation_status === filter : true,
  );

  return (
    <AppShell active="account-reports">
      <div className="card">
        <h2>Account report {report?.statement_id ?? report?.notification_id ?? id.slice(0, 16)}</h2>
        <ul className="status-list">
          <li><span>Type</span><span className="badge badge-muted">{report?.report_type ?? '—'}</span></li>
          <li><span>Version</span><span>{report?.message_version ?? '—'}</span></li>
          <li><span>Account</span><span>{report?.account_iban ?? '—'} {report?.account_currency ?? ''}</span></li>
          <li><span>Period</span><span>{report?.period_start ?? '—'} → {report?.period_end ?? '—'}</span></li>
          <li><span>Entries</span><span>{report?.entry_count ?? 0}</span></li>
        </ul>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>

      {(report?.balances ?? []).length > 0 && (
        <div className="card">
          <h3>Balances</h3>
          <ul className="status-list">
            {(report?.balances ?? []).map((b, i) => (
              <li key={i}>
                <span>{b.balance_type} · {b.credit_debit}</span>
                <span>{b.amount_minor} {b.currency}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Reconciliation summary</h3>
        <ul className="status-list">
          {Object.entries(report?.reconciliation_summary ?? {}).map(([k, v]) => (
            <li key={k}><span>{k}</span><span>{v}</span></li>
          ))}
          {Object.keys(report?.reconciliation_summary ?? {}).length === 0 && <li className="muted">No entries.</li>}
        </ul>
      </div>

      <div className="card">
        <h3>Entries</h3>
        <label>
          <span className="field-label">Filter by reconciliation status</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="RECONCILED">Reconciled</option>
            <option value="UNMATCHED_ACCOUNT_ENTRY">Unmatched</option>
            <option value="AMOUNT_MISMATCH">Amount mismatch</option>
            <option value="CURRENCY_MISMATCH">Currency mismatch</option>
            <option value="ACCOUNT_MISMATCH">Account mismatch</option>
            <option value="DUPLICATE_ACCOUNT_ENTRY">Duplicate</option>
          </select>
        </label>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {['Entry', 'Amount', 'CD', 'Booking', 'End-to-end', 'Status', 'Reconciliation'].map((h) => (
                <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid var(--cn-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>
                  <Link href={`/account-entries/${e.id}`}>{e.entry_reference ?? e.id.slice(0, 12)}</Link>
                </td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{e.amount_minor ?? '—'} {e.currency ?? ''}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{e.credit_debit ?? '—'}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{e.booking_date ?? '—'}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{e.end_to_end_id ?? '—'}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{e.status ?? '—'}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>
                  <span className="badge badge-muted">{e.reconciliation_status ?? 'PENDING'}</span>
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={7} className="muted">No entries match.</td></tr>}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
