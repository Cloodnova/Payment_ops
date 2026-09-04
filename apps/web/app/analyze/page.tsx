'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import Notice from '@/components/Notice';
import { analyzePayment, type AnalyzeResponse } from '@/lib/api';

export default function AnalyzePage() {
  const [xml, setXml] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    file.text().then(setXml).catch(() => setError('Could not read file'));
  };

  const run = async () => {
    if (!xml.trim()) {
      setError('Provide a pacs.008 XML payload.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await analyzePayment(xml, { repair: true, persist: false });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active="analyze">
      <Notice />
      <div className="card">
        <h2>Analyze Payment</h2>
        <p className="muted small">
          Upload or paste a synthetic pacs.008 message. PaymentOps analyzes payment data only.
        </p>
        <div className="stack">
          <div>
            <label className="field-label" htmlFor="file">
              Select pacs.008 XML
            </label>
            <input
              id="file"
              type="file"
              accept=".xml,text/xml"
              onChange={onFile}
              style={{ padding: '0.4rem' }}
            />
            {fileName && <p className="small muted">{fileName}</p>}
          </div>
          <label>
            <span className="field-label">Or paste XML</span>
            <textarea
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              rows={8}
              placeholder="<Document xmlns=&quot;urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08&quot;>..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </label>
          <button className="btn" onClick={run} disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
          {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
        </div>
      </div>

      {result && (
        <div className="card">
          <h2>Analysis result</h2>
          <ul className="status-list">
            <li>
              <span>Case ID</span>
              <span>{result.case_id}</span>
            </li>
            <li>
              <span>Message</span>
              <span>{result.message_type ?? 'unknown'}</span>
            </li>
            <li>
              <span>XSD validation</span>
              <span className="badge badge-ok">{result.original_validation_status}</span>
            </li>
            <li>
              <span>Address readiness</span>
              <span className="badge badge-muted">{result.address_readiness ?? '—'}</span>
            </li>
            <li>
              <span>Repair</span>
              <span className="badge badge-muted">{result.repair_status ?? '—'}</span>
            </li>
            <li>
              <span>Candidate</span>
              <span className="badge badge-muted">{result.candidate_validation_status ?? '—'}</span>
            </li>
          </ul>

          {result.rule_findings.length > 0 && (
            <>
              <h2 style={{ marginTop: '1rem' }}>Rule findings</h2>
              <ul className="status-list">
                {result.rule_findings.map((f, i) => (
                  <li key={i}>
                    <span>
                      <strong>{f.rule_id}</strong> · {f.message}
                    </span>
                    <span className="badge badge-warn">{f.severity}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.address_analyses.length > 0 && (
            <>
              <h2 style={{ marginTop: '1rem' }}>Address analysis</h2>
              <ul className="status-list">
                {result.address_analyses.map((a, i) => (
                  <li key={i}>
                    <span>
                      {a.party}: {a.readiness} {a.country_code ? `(${a.country_code})` : ''}{' '}
                      {a.town_name ? `· ${a.town_name}` : ''}
                    </span>
                    <span className="badge badge-muted">{a.evidence_level}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.candidate_diff.length > 0 && (
            <>
              <h2 style={{ marginTop: '1rem' }}>Structured changes</h2>
              <ul className="status-list">
                {result.candidate_diff.map((d, i) => (
                  <li key={i}>
                    <span>
                      <code>{d.path}</code> · {d.before ?? '∅'} → {d.after ?? '∅'} ({d.source})
                    </span>
                    <span className="badge badge-muted">{d.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.candidate_xml && (
            <>
              <h2 style={{ marginTop: '1rem' }}>Candidate XML</h2>
              <pre
                style={{
                  background: 'var(--cn-bg)',
                  padding: '0.75rem',
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                }}
              >
                {result.candidate_xml}
              </pre>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
