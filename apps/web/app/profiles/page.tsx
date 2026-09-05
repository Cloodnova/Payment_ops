'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { createProfile, listProfiles, publishProfile, type Profile } from '@/lib/api';

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [inputFormat, setInputFormat] = useState('JSON');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setProfiles(await listProfiles());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name) return;
    try {
      await createProfile({ name, input_format: inputFormat });
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'create failed');
    }
  };

  const publish = async (id?: string) => {
    if (!id) return;
    try {
      await publishProfile(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'publish failed');
    }
  };

  return (
    <AppShell active="profiles">
      <div className="card">
        <h2>Integration Profiles</h2>
        <p className="muted small">
          Define how customer input maps to the canonical payment model. Published profiles are immutable.
        </p>
        <div className="stack">
          <div className="grid-2">
            <label>
              <span className="field-label">Name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bank A JSON" />
            </label>
            <label>
              <span className="field-label">Input format</span>
              <select value={inputFormat} onChange={(e) => setInputFormat(e.target.value)}>
                <option>JSON</option>
                <option>CSV</option>
                <option>CUSTOM_XML</option>
                <option>ISO20022_XML</option>
              </select>
            </label>
          </div>
          <button className="btn" onClick={create}>Create draft</button>
          {error && <p className="muted" style={{ color: 'var(--cn-danger)' }}>{error}</p>}
        </div>
      </div>

      <div className="card">
        <h2>Profiles</h2>
        <ul className="status-list">
          {profiles.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{p.name}</strong> · {p.input_format} · v{p.version_number ?? 1} ·{' '}
                <span className="badge badge-muted">{p.status ?? 'DRAFT'}</span>
              </span>
              <button className="btn btn-ghost" onClick={() => publish(p.id)}>Publish</button>
            </li>
          ))}
          {profiles.length === 0 && <li className="muted">No profiles yet.</li>}
        </ul>
      </div>
    </AppShell>
  );
}
