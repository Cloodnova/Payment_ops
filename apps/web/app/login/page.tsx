'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your work email and password to continue.');
      return;
    }
    // Operator access is authorized by the platform API client (server-configured).
    // This screen is the console entry point; it does not perform credential validation.
    router.push('/dashboard');
  };

  return (
    <div className="login-shell">
      <section className="login-aside" aria-label="About CloudNova PaymentOps">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span className="brand-name">
            CloudNova <span>PaymentOps</span>
          </span>
        </div>
        <div style={{ maxWidth: '26rem' }}>
          <p className="page-eyebrow" style={{ color: '#e0a082' }}>Payment data intelligence</p>
          <h1 className="display" style={{ fontSize: '2.6rem', lineHeight: 1.05, letterSpacing: '-0.04em', margin: '1rem 0 0' }}>
            Make every payment state explainable.
          </h1>
          <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--cn-sidebar-muted)' }}>
            A control surface for analysts who validate, repair, match and reconcile payment data —
            with a deterministic, auditable evidence trail.
          </p>
        </div>
        <p className="row" style={{ color: 'var(--cn-sidebar-faint)', fontSize: '0.72rem' }}>
          <ShieldCheck size={14} aria-hidden="true" /> Payment data intelligence &amp; exception operations
        </p>
      </section>

      <section className="login-main">
        <div className="login-form-wrap">
          <div className="brand" style={{ marginBottom: '2rem' }}>
            <span className="brand-mark" aria-hidden="true">C</span>
            <span className="brand-name" style={{ color: 'var(--cn-text)' }}>
              CloudNova <span style={{ opacity: 0.6 }}>PaymentOps</span>
            </span>
          </div>

          <p className="page-eyebrow">Authorized user access</p>
          <h2 className="page-title" style={{ fontSize: '1.6rem' }}>Sign in to PaymentOps</h2>
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            Payment Data Intelligence &amp; Exception Operations
          </p>

          <form onSubmit={onSubmit} className="stack" style={{ marginTop: '1.75rem' }} aria-label="Sign in">
            <label>
              <span className="field-label">Email or username</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email or username"
              />
            </label>
            <label>
              <span className="field-label">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
              />
            </label>
            {error ? <p className="small" style={{ color: 'var(--cn-danger)', margin: 0 }} role="alert">{error}</p> : null}
            <Button type="submit">
              <Lock size={14} /> Sign in
            </Button>
          </form>

          <div style={{ marginTop: '1rem' }}>
            <Button variant="ghost" disabled title="Enterprise SSO is not yet available" style={{ width: '100%' }}>
              Enterprise SSO — coming later
            </Button>
          </div>

          <p className="muted" style={{ marginTop: '1.75rem', fontSize: '0.72rem', lineHeight: 1.6 }}>
            Authorized users only. Activity may be logged for security and audit purposes.
          </p>
          <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.72rem', lineHeight: 1.6 }}>
            PaymentOps analyzes and reconciles payment data. It does not execute, authorize, settle,
            debit or credit payments.
          </p>
        </div>
      </section>
    </div>
  );
}
