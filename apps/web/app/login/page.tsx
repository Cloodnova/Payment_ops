'use client';

import AppShell from '@/components/AppShell';

export default function LoginPage() {
  return (
    <AppShell active="login">
      <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h2>Sign in to PaymentOps</h2>
        <p className="muted small">
          Authentication is not yet enabled. Access is managed through the platform&apos;s
          identity provider (Keycloak / OIDC) in a later phase.
        </p>
        <form
          className="stack"
          onSubmit={(e) => e.preventDefault()}
        >
          <label>
            <span className="field-label">Email or username</span>
            <input type="text" disabled placeholder="name@example.com" />
          </label>
          <label>
            <span className="field-label">Password</span>
            <input type="password" disabled placeholder="••••••••" />
          </label>
          <button className="btn" type="submit" disabled>
            Sign in (coming soon)
          </button>
        </form>
        <p className="small muted" style={{ marginTop: '1rem' }}>
          This screen is an authentication-ready placeholder. No credentials are processed.
        </p>
      </div>
    </AppShell>
  );
}
