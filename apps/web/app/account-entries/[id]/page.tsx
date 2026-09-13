'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getAccountEntry, type AccountEntry } from '@/lib/api';

export default function AccountEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<AccountEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEntry(await getAccountEntry(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const row = (k: string, v: string | number | null | undefined) => (
    <li><span>{k}</span><span>{v ?? '—'}</span></li>
  );

  return (
    <AppShell active="account-reports">
      <div className="card">
        <h2>Account entry {entry?.entry_reference ?? id.slice(0, 16)}</h2>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
        <ul className="status-list">
          {row('Amount', entry ? `${entry.amount_minor ?? '—'} ${entry.currency ?? ''}` : '—')}
          {row('Credit/Debit', entry?.credit_debit)}
          {row('Booking date', entry?.booking_date)}
          {row('Value date', entry?.value_date)}
          {row('Status', entry?.status)}
          {row('Entry reference', entry?.entry_reference)}
          {row('Account servicer reference', entry?.account_servicer_reference)}
          {row('End-to-end ID', entry?.end_to_end_id)}
          {row('Instruction ID', entry?.instruction_id)}
          {row('Transaction ID', entry?.transaction_id)}
          {row('UETR', entry?.uetr)}
          {row('Bank transaction code', entry ? `${entry.bank_tx_code ?? ''} ${entry.bank_tx_family ?? ''} ${entry.bank_tx_sub_family ?? ''}` : '—')}
          {row('Remittance', entry?.remittance_reference)}
        </ul>
      </div>

      <div className="card">
        <h3>Reconciliation</h3>
        <ul className="status-list">
          <li><span>Result</span><span className="badge badge-warn">{entry?.reconciliation_status ?? 'PENDING'}</span></li>
          {row('Match score', entry?.match_score)}
          <li>
            <span>Lifecycle</span>
            <span>{entry?.lifecycle_id ? <Link href={`/lifecycles/${entry.lifecycle_id}`}>{entry.lifecycle_id.slice(0, 20)}</Link> : '—'}</span>
          </li>
        </ul>
        {(entry?.evidence ?? []).length > 0 && (
          <p className="muted small">Evidence: {(entry?.evidence ?? []).join(', ')}</p>
        )}
        {(entry?.conflicts ?? []).length > 0 && (
          <p className="muted small" style={{ color: 'var(--cn-danger)' }}>Conflicts: {(entry?.conflicts ?? []).join(', ')}</p>
        )}
        <p className="muted small">
          Analytical reconciliation only. PaymentOps never modifies a bank account or ledger.
        </p>
      </div>
    </AppShell>
  );
}
