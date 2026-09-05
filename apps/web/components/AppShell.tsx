import Link from 'next/link';
import Notice from './Notice';

export default function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: 'dashboard' | 'analyze' | 'profiles' | 'batches' | 'cases' | 'status' | 'login';
}) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-name">CloudNova PaymentOps</span>
          <span className="brand-sub">Non-transactional payment-data intelligence</span>
        </div>
        <nav className="app-nav" aria-label="Primary">
          <Link href="/dashboard" aria-current={active === 'dashboard' ? 'page' : undefined}>
            Dashboard
          </Link>
          <Link href="/analyze" aria-current={active === 'analyze' ? 'page' : undefined}>
            Analyze
          </Link>
          <Link href="/profiles" aria-current={active === 'profiles' ? 'page' : undefined}>
            Profiles
          </Link>
          <Link href="/batches" aria-current={active === 'batches' ? 'page' : undefined}>
            Batches
          </Link>
          <Link href="/cases" aria-current={active === 'cases' ? 'page' : undefined}>
            Cases
          </Link>
          <Link href="/status" aria-current={active === 'status' ? 'page' : undefined}>
            System Status
          </Link>
          <Link href="/login" aria-current={active === 'login' ? 'page' : undefined}>
            Sign in
          </Link>
        </nav>
      </header>

      <main className="app-main">
        <Notice />
        {children}
      </main>

      <footer className="app-footer">
        CloudNova PaymentOps · Non-transactional payment-data intelligence platform ·
        AI is non-authoritative and may be disabled.
      </footer>
    </div>
  );
}
