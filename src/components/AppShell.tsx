import type { ReactNode } from 'react';
import '../styles/ui.css';

/**
 * The header and page frame from the design reference. Templates and Gallery
 * are left off the nav on purpose: they are out of scope for v1 (spec section
 * 9), so linking to them would be a dead end.
 */
export default function AppShell({
  current,
  children,
  right,
}: {
  current?: 'shelf' | 'make';
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <>
      <header className="mm-header">
        <div className="mm-wordmark">
          <span className="mm-wordmark__name">MIXTAPE MODE</span>
          <span className="mm-wordmark__beta">beta</span>
        </div>
        <nav className="mm-nav" aria-label="Main">
          <a href="#/" {...(current === 'shelf' ? { 'aria-current': 'page' as const } : {})}>
            My tapes
          </a>
          <a href="#/make" {...(current === 'make' ? { 'aria-current': 'page' as const } : {})}>
            Make a tape
          </a>
          {right}
        </nav>
      </header>
      <main className="mm-main">{children}</main>
    </>
  );
}
