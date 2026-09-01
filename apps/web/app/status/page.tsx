'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { getHealth, getInfo, getReadiness, type PlatformInfo } from '@/lib/api';

export default function StatusPage() {
  const [info, setInfo] = useState<PlatformInfo | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [i, h, r] = await Promise.all([getInfo(), getHealth(), getReadiness()]);
      if (!mounted) return;
      setInfo(i);
      setHealth(h?.status ?? 'unreachable');
      setReadiness(r?.status ?? 'unreachable');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const statusBadge = (s: string | null) => {
    if (s === 'ok' || s === 'ready') return <span className="badge badge-ok">{s}</span>;
    return <span className="badge badge-danger">{s ?? 'unknown'}</span>;
  };

  return (
    <AppShell active="status">
      <div className="card">
        <h2>Platform information</h2>
        <ul className="status-list">
          <li>
            <span>Product</span>
            <span>{info?.product ?? 'CloudNova PaymentOps'}</span>
          </li>
          <li>
            <span>Version</span>
            <span>{info?.version ?? 'unknown'}</span>
          </li>
          <li>
            <span>Environment</span>
            <span>{info?.environment ?? 'unknown'}</span>
          </li>
          <li>
            <span>AI state</span>
            <span>
              {info ? (info.ai_enabled ? `${info.ai_provider} (non-authoritative)` : 'disabled') : 'unknown'}
            </span>
          </li>
          <li>
            <span>Zero-retention processing</span>
            <span>{info?.zero_retention_enabled ? 'enabled' : 'disabled'}</span>
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Component health</h2>
        <ul className="status-list">
          <li>
            <span>API process (/health)</span>
            <span>{statusBadge(health)}</span>
          </li>
          <li>
            <span>Dependencies (/ready)</span>
            <span>{statusBadge(readiness)}</span>
          </li>
          <li>
            <span>Database configured</span>
            <span>{info?.database_configured ? 'yes' : 'no'}</span>
          </li>
          <li>
            <span>Redis configured</span>
            <span>{info?.redis_configured ? 'yes' : 'no'}</span>
          </li>
        </ul>
      </div>
    </AppShell>
  );
}
