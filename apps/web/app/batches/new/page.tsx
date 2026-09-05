'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { createBatch, listProfiles, type Profile } from '@/lib/api';

export default function NewBatchPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState('');
  const [csv, setCsv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  const submit = async () => {
    if (!profileId || !csv.trim()) {
      setError('Select a profile and provide CSV content.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await createBatch(profileId, csv);
      router.push(`/batches/${res.job_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell active="batches">
      <div className="card">
        <h2>New batch</h2>
        <div className="stack">
          <label>
            <span className="field-label">Integration Profile</span>
            <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              <option value="">— select —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.input_format})</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">CSV content (header row required)</span>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={8}
              placeholder={'beneficiary_name,beneficiary_city,amount,ccy\nAcme,Milano,100.00,EUR'}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </label>
          <button className="btn" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit batch'}
          </button>
          {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
        </div>
      </div>
    </AppShell>
  );
}
