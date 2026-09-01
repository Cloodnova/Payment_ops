import AppShell from '@/components/AppShell';

export default function DashboardPage() {
  return (
    <AppShell active="dashboard">
      <div className="grid-2">
        <div className="card">
          <h2>Workspace</h2>
          <p className="muted">
            PaymentOps organizes inbound payment data into a canonical model for
            deterministic validation and review.
          </p>
          <p className="small muted">
            Feature modules (mapping, ISO validation, rules, address intelligence,
            repair review) are introduced in later phases.
          </p>
        </div>
        <div className="card">
          <h2>Capabilities</h2>
          <ul className="status-list">
            <li>
              <span>Canonical payment model</span>
              <span className="badge badge-muted">Ready (Week 1)</span>
            </li>
            <li>
              <span>ISO 20022 validation</span>
              <span className="badge badge-muted">Planned</span>
            </li>
            <li>
              <span>Repair &amp; human review</span>
              <span className="badge badge-muted">Planned</span>
            </li>
            <li>
              <span>AI explanations</span>
              <span className="badge badge-muted">Non-authoritative</span>
            </li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
