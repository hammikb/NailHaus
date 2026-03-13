import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand column */}
          <div className="footer-brand">
            <Link href="/shop" className="brand" style={{ fontSize: '1.4rem' }}>Nail<em>Haus</em></Link>
            <p className="footer-tagline">The marketplace for independent press-on nail artists. Handcrafted sets, verified sellers, protected buyers.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <span className="footer-badge">🛡️ Buyer protected</span>
              <span className="footer-badge">✓ Verified sellers</span>
              <span className="footer-badge">✉️ Tracked shipping</span>
            </div>
          </div>

          {/* Shop column */}
          <div className="footer-col">
            <div className="footer-col-title">Shop</div>
            <nav className="footer-links">
              <Link href="/shop">All sets</Link>
              <Link href="/shop?shape=almond">Almond nails</Link>
              <Link href="/shop?shape=coffin">Coffin nails</Link>
              <Link href="/shop?style=floral">Floral sets</Link>
              <Link href="/shop?availability=made_to_order">Made to order</Link>
            </nav>
          </div>

          {/* Vendors column */}
          <div className="footer-col">
            <div className="footer-col-title">Vendors</div>
            <nav className="footer-links">
              <Link href="/vendors">Browse artists</Link>
              <Link href="/signup">Sell on NailHaus</Link>
              <Link href="/dashboard/vendor">Vendor dashboard</Link>
            </nav>
          </div>

          {/* Account column */}
          <div className="footer-col">
            <div className="footer-col-title">Account</div>
            <nav className="footer-links">
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create account</Link>
            </nav>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} NailHaus. All rights reserved.</span>
          <span className="footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
