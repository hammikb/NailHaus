'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useCart } from './CartProvider';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { count, setOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  const isHome = pathname === '/';
  const isShop = pathname.startsWith('/shop') || pathname.startsWith('/products');
  const isVendors = pathname.startsWith('/vendors');
  const isDashboard = pathname.startsWith('/dashboard');

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand">Nail<em>Haus</em></Link>

          <nav className="nav-links">
            <Link href="/" className={`nav-link${isHome ? ' nav-link-active' : ''}`}>Home</Link>
            <Link href="/shop" className={`nav-link${isShop ? ' nav-link-active' : ''}`}>Shop</Link>
            <Link href="/vendors" className={`nav-link${isVendors ? ' nav-link-active' : ''}`}>Vendors</Link>
            {user?.role === 'vendor' && (
              <Link href="/dashboard/vendor" className={`nav-link${isDashboard ? ' nav-link-active' : ''}`}>Dashboard</Link>
            )}
            {user?.role === 'admin' && (
              <Link href="/dashboard/admin" className={`nav-link${isDashboard ? ' nav-link-active' : ''}`} style={{ color: 'var(--accent)' }}>Admin</Link>
            )}
          </nav>

          <div className="nav-actions">
            {user && (
              <>
                <Link href="/orders" className="pill btn-ghost btn-sm">My Orders</Link>
                <Link href="/wishlist" className="pill btn-ghost btn-sm" aria-label="Wishlist">🤍</Link>
              </>
            )}

            <button
              className="pill btn-ghost btn-sm cart-btn"
              onClick={() => setOpen(true)}
              aria-label="Open cart"
            >
              🛒
              {count > 0 && <span className="cart-badge">{count > 99 ? '99+' : count}</span>}
            </button>

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

            {/* Hamburger — shown only on mobile via CSS */}
            <button
              className="mobile-menu-btn"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <>
          <div
            className="mobile-nav-overlay open"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <div className="mobile-nav-header">
              <Link href="/" className="brand" style={{ fontSize: '1.3rem' }}>Nail<em>Haus</em></Link>
              <button
                className="cart-drawer-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="mobile-nav-links">
              <Link href="/" className={isHome ? 'active' : ''}>Home</Link>
              <Link href="/shop" className={isShop ? 'active' : ''}>Shop</Link>
              <Link href="/vendors" className={isVendors ? 'active' : ''}>Vendors</Link>
              {user?.role === 'vendor' && (
                <Link href="/dashboard/vendor" className={isDashboard ? 'active' : ''}>Dashboard</Link>
              )}
              {user?.role === 'admin' && (
                <Link href="/dashboard/admin" className={isDashboard ? 'active' : ''} style={{ color: 'var(--accent)' }}>Admin</Link>
              )}
              {user && (
                <>
                  <Link href="/orders">My Orders</Link>
                  <Link href="/wishlist">Wishlist</Link>
                </>
              )}
            </div>

            <div className="mobile-nav-actions">
              {user ? (
                <>
                  <div className="nav-user" style={{ marginBottom: 4 }}>
                    <span className="nav-user-dot" />
                    {user.name}
                  </div>
                  <button className="pill btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link className="pill btn-ghost btn-sm" href="/login" style={{ justifyContent: 'center' }}>Login</Link>
                  <Link className="pill btn-primary btn-sm" href="/signup" style={{ justifyContent: 'center' }}>Join free</Link>
                </>
              )}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
