'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.push('/shop');
  }

  const isShop = pathname.startsWith('/shop') || pathname.startsWith('/products');
  const isVendors = pathname.startsWith('/vendors');
  const isDashboard = pathname.startsWith('/dashboard');

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/shop" className="brand">Nail<em>Haus</em></Link>

        <nav className="nav-links">
          <Link href="/shop" className={`nav-link${isShop ? ' nav-link-active' : ''}`}>Shop</Link>
          <Link href="/vendors" className={`nav-link${isVendors ? ' nav-link-active' : ''}`}>Vendors</Link>
          {user?.role === 'vendor' && (
            <Link href="/dashboard/vendor" className={`nav-link${isDashboard ? ' nav-link-active' : ''}`}>Dashboard</Link>
          )}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">
                <span className="nav-user-dot" />
                {user.name}
              </span>
              <button className="pill btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="pill btn-ghost btn-sm" href="/login">Login</Link>
              <Link className="pill btn-primary btn-sm" href="/signup">Join free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
