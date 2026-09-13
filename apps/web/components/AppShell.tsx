'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bell,
  ClipboardCheck,
  Database,
  FileSearch,
  GitBranch,
  History,
  KeyRound,
  LayoutDashboard,
  Menu,
  Scale,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: typeof Activity }[] }[] = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Payment operations',
    items: [
      { href: '/analyze', label: 'Analyze Payment', icon: FileSearch },
      { href: '/cases', label: 'Cases', icon: ClipboardCheck },
      { href: '/batches', label: 'Batches', icon: Database },
    ],
  },
  {
    label: 'Reconciliation',
    items: [
      { href: '/matching', label: 'Matching', icon: SlidersHorizontal },
      { href: '/reconciliation', label: 'Reconciliation', icon: Scale },
    ],
  },
  {
    label: 'ISO & lifecycle',
    items: [
      { href: '/iso-messages', label: 'ISO Messages', icon: Workflow },
      { href: '/lifecycles', label: 'Payment Lifecycles', icon: GitBranch },
      { href: '/account-reports', label: 'Account Reports', icon: FileSearch },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/profiles', label: 'Integration Profiles', icon: GitBranch },
      { href: '/api-clients', label: 'API Clients', icon: KeyRound },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/audit', label: 'Audit', icon: History },
      { href: '/readiness', label: 'Readiness', icon: ShieldCheck },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const ENV = process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'DEV';
const ORG_NAME = process.env.NEXT_PUBLIC_ORGANIZATION_NAME ?? 'CloudNova Demo Bank';

function envClass(env: string): string {
  if (env.toUpperCase().startsWith('PROD')) return 'env-chip prod';
  if (env.toUpperCase().startsWith('DEV')) return 'env-chip dev';
  return 'env-chip';
}

export default function AppShell({
  children,
  organization,
}: {
  children: React.ReactNode;
  organization?: string;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${navOpen ? 'open' : ''}`} aria-label="Primary navigation">
        <div className="row-between">
          <Link href="/dashboard" className="brand" aria-label="CloudNova PaymentOps home">
            <span className="brand-mark" aria-hidden="true">C</span>
            <span className="brand-name">
              CloudNova <span>PaymentOps</span>
            </span>
          </Link>
        </div>

        <div className="org-context">
          <span className="org-avatar" aria-hidden="true">
            {(organization ?? ORG_NAME).slice(0, 2).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <p>{organization ?? ORG_NAME}</p>
            <span>{ENV} · Payment Operations</span>
          </div>
        </div>

        <nav aria-label="Sections">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              <div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="nav-link"
                      aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--cn-sidebar-fg)' }}>Payment Operations</p>
          <p style={{ margin: '0.2rem 0 0' }}>Non-transactional analysis platform</p>
        </div>
      </aside>

      {navOpen ? (
        <button className="sidebar-scrim" aria-label="Close navigation overlay" onClick={() => setNavOpen(false)} />
      ) : null}

      <div className="app-main">
        <header className="topbar">
          <div className="row">
            <button
              className="btn-subtle nav-toggle"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="topbar-meta">
              <span className="eyebrow">Environment</span>
              <span className={envClass(ENV)}>{ENV}</span>
            </div>
          </div>
          <div className="row">
            <span className="topbar-meta muted" aria-hidden="true">
              <Activity size={14} /> Payment Data Intelligence
            </span>
            <span className="row" aria-label="Signed-in user" style={{ gap: '0.5rem' }}>
              <span className="org-avatar" style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-muted)' }}>
                OP
              </span>
              <span className="small muted">Operator</span>
            </span>
            <Bell size={16} className="muted" aria-hidden="true" />
          </div>
        </header>

        <main className="app-content">{children}</main>

        <footer className="app-footer">
          CloudNova PaymentOps · Payment data intelligence &amp; exception operations · It does not execute,
          authorize, settle, debit or credit payments.
        </footer>
      </div>
    </div>
  );
}
