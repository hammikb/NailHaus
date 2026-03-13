'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useCart } from './CartProvider';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { count, setOpen } = useCart();

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  const isHome = pathname === '/';
  const isShop = pathname.startsWith('/shop') || pathname.startsWith('/products');
  const isVendors = pathname.startsWith('/vendors');
  const isDashboard = pathname.startsWith('/dashboard');

  return (
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

          {/* Cart button */}
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
        </div>
      </div>
    </header>
  );
}
