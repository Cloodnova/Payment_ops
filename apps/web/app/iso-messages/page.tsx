'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { analyzeIso, listIsoMessages, type IsoAnalysisResult, type IsoMessage } from '@/lib/api';

export default function IsoMessagesPage() {
  const [messages, setMessages] = useState<IsoMessage[]>([]);
  const [family, setFamily] = useState('');
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState('');
  const [xml, setXml] = useState('');
  const [result, setResult] = useState<IsoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMessages(await listIsoMessages({ family, version, status }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  }, [family, version, status]);

  useEffect(() => {
    load();
  }, [load]);

  const onAnalyze = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await analyzeIso(xml);
      setResult(r);
      setXml('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'analyze failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell active="iso-messages">
      <div className="card">
        <h2>ISO Messages</h2>
        <p className="muted small">
          Registry-based ISO 20022 analysis. Parsing a message never executes or settles a payment.
        </p>
        {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
      </div>

      <div className="card">
        <h3>Analyze a message</h3>
        <textarea
          value={xml}
          onChange={(e) => setXml(e.target.value)}
          rows={6}
          placeholder="Paste an ISO 20022 XML payload (pain.001, pacs.008, pacs.002, pacs.009)..."
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem' }}
        />
        <button className="btn" onClick={onAnalyze} disabled={busy || !xml.trim()}>
          {busy ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3>Result</h3>
          <ul className="status-list">
            <li><span>Message</span><span>{result.message_definition} ({result.message_version})</span></li>
            <li><span>Schema</span><span>{result.schema_validation ? 'VALID' : 'INVALID'} · {result.schema_version}</span></li>
            <li><span>Normalized status</span><span>{result.normalized_status ?? '—'} {result.raw_status ? `(raw ${result.raw_status})` : ''}</span></li>
            <li><span>Correlation</span><span className="badge badge-muted">{result.correlation_status ?? '—'}</span></li>
            <li><span>Lifecycle</span><span>{result.lifecycle_id ? <Link href={`/lifecycles/${result.lifecycle_id}`}>{result.lifecycle_id.slice(0, 20)}</Link> : '—'}</span></li>
            <li><span>Address readiness</span><span>{result.address_readiness ?? '—'} · {result.address_provider_coverage ?? '—'}</span></li>
          </ul>
          {(result.correlation_evidence ?? []).length > 0 && (
            <p className="muted small">Evidence: {result.correlation_evidence?.join(', ')}</p>
          )}
        </div>
      )}

      <div className="card">
        <h3>Recent messages</h3>
        <div className="stack" style={{ marginBottom: '0.75rem' }}>
          <label><span className="field-label">Family</span>
            <input type="text" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="pain / pacs" /></label>
          <label><span className="field-label">Version</span>
            <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="pain.001.001.13" /></label>
          <label><span className="field-label">Status</span>
            <input type="text" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ANALYZED" /></label>
          <button className="btn btn-ghost" onClick={load}>Apply filters</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              {['ID', 'Definition', 'Version', 'Schema', 'Status', 'Created'].map((h) => (
                <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid var(--cn-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{m.message_id ?? m.id.slice(0, 12)}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{m.message_definition}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{m.message_version}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{m.schema_validation ? 'VALID' : 'INVALID'}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{m.normalized_status ?? m.status}</td>
                <td style={{ padding: '0.25rem', borderBottom: '1px solid var(--cn-border)' }}>{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr><td colSpan={6} className="muted">No ISO messages yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
