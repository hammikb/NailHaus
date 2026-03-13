import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { VendorCard } from '@/components/VendorCard';
import { api } from '@/lib/api';

const CATEGORIES = [
  { label: 'Almond', emoji: '🌸', href: '/shop?shape=almond', color: '#fde8e8' },
  { label: 'Coffin', emoji: '💜', href: '/shop?shape=coffin', color: '#ede8fd' },
  { label: 'Stiletto', emoji: '🖤', href: '/shop?shape=stiletto', color: '#e8e8fd' },
  { label: 'Floral', emoji: '🌺', href: '/shop?style=floral', color: '#fde8f4' },
  { label: 'Glam', emoji: '✨', href: '/shop?style=glam', color: '#fdf5e8' },
  { label: 'Minimal', emoji: '🤍', href: '/shop?style=minimal', color: '#f0ede8' },
];

export default async function HomePage() {
  const [products, vendors] = await Promise.all([
    api.getProducts({ limit: 8, sort: 'popular' }).catch(() => []),
    api.getVendors().catch(() => []),
  ]);

  return (
    <main>
      {/* ─── Hero ───────────────────────────────── */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-card hero-copy">
            <div className="eyebrow">The press-on nail marketplace</div>
            <h1 className="display">
              Beautiful nails,{' '}
              <em>better vendors</em>,<br />
              one clean home.
            </h1>
            <p className="subtle">
              Discover handcrafted press-on sets from verified indie artists.
              Every set curated, every seller verified.
            </p>
            <div className="hero-actions" style={{ marginTop: 22 }}>
              <Link className="pill btn-primary" href="/shop">Shop all nails</Link>
              <Link className="pill btn-ghost" href="/vendors">Browse vendors</Link>
            </div>
            <div className="stats">
              <div className="stat">
                <strong style={{ color: 'var(--accent)' }}>240+</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>Verified vendors</span>
              </div>
              <div className="stat">
                <strong style={{ color: 'var(--accent)' }}>12k+</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>Listed sets</span>
              </div>
              <div className="stat">
                <strong style={{ color: 'var(--accent)' }}>98k+</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>Happy customers</span>
              </div>
            </div>
          </div>

          <div className="hero-card hero-tiles">
            <div className="tile" style={{ background: 'linear-gradient(160deg,#f9d4d4,#e8a5a5)' }}>🌸</div>
            <div className="tile" style={{ background: 'linear-gradient(160deg,#d4e0f9,#a5bce8)' }}>💅</div>
            <div className="tile" style={{ background: 'linear-gradient(160deg,#d4f9e8,#a5d4bc)' }}>✨</div>
            <div className="tile" style={{ background: 'linear-gradient(160deg,#f9f0d4,#e8d4a5)' }}>🌺</div>
          </div>
        </div>
      </section>

      {/* ─── Categories ─────────────────────────── */}
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Browse by category</p>
              <h2 className="section-title">Find your <em>style</em></h2>
            </div>
            <Link className="muted" href="/shop">All styles →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12 }}>
            {CATEGORIES.map(cat => (
              <Link key={cat.label} href={cat.href} className="card" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '24px 16px', gap: 10, textAlign: 'center',
                background: cat.color, border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', transition: 'var(--transition)',
                textDecoration: 'none',
              }}>
                <span style={{ fontSize: '2rem' }}>{cat.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Products ───────────────────── */}
      {products.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Trending now</p>
                <h2 className="section-title">Top <em>sets</em></h2>
              </div>
              <Link className="muted" href="/shop">View all →</Link>
            </div>
            <div className="grid product-grid">
              {products.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── Trust Strip ────────────────────────── */}
      <section className="section" style={{ padding: '20px 0' }}>
        <div className="container">
          <div className="trust-grid">
            <div className="trust-card">
              <span className="trust-icon">🛡️</span>
              <div><div className="trust-title">Buyer protection</div><div className="trust-desc">Covered on every order</div></div>
            </div>
            <div className="trust-card">
              <span className="trust-icon">✉️</span>
              <div><div className="trust-title">Tracked shipping</div><div className="trust-desc">Real-time order tracking</div></div>
            </div>
            <div className="trust-card">
              <span className="trust-icon">⭐</span>
              <div><div className="trust-title">Verified reviews</div><div className="trust-desc">From real buyers only</div></div>
            </div>
            <div className="trust-card">
              <span className="trust-icon">🎨</span>
              <div><div className="trust-title">Indie artists</div><div className="trust-desc">Curated handcrafted sets</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it Works ────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Simple process</p>
              <h2 className="section-title">How <em>it works</em></h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
            {[
              { emoji: '🔍', title: 'Browse & discover', desc: 'Explore thousands of handcrafted press-on sets from indie artists worldwide.' },
              { emoji: '🛒', title: 'Add to cart', desc: 'Choose your favourites. Mix sets from multiple vendors in one order.' },
              { emoji: '📦', title: 'Artist ships to you', desc: 'Your vendor prepares and ships directly. Track every step of the way.' },
              { emoji: '💅', title: 'Slay your look', desc: 'Apply in minutes. Salon-quality nails without the salon price or wait.' },
            ].map((step, i) => (
              <div key={i} className="panel step-card">
                <div className="step-num">{i + 1}</div>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{step.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 8 }}>{step.title}</div>
                <p className="muted" style={{ fontSize: '.84rem', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Vendors ────────────────────── */}
      {vendors.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Independent artists</p>
                <h2 className="section-title">Top <em>vendors</em></h2>
              </div>
              <Link className="muted" href="/vendors">All vendors →</Link>
            </div>
            <div className="grid vendor-grid">
              {vendors.slice(0, 6).map(vendor => <VendorCard key={vendor.id} vendor={vendor} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA Banner ─────────────────────────── */}
      <section style={{ padding: '48px 0 56px' }}>
        <div className="container">
          <div className="panel" style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
            border: 'none', padding: '48px 40px', textAlign: 'center', color: 'white',
          }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>💅</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 10px', color: 'white' }}>
              Sell your nail art on NailHaus
            </h2>
            <p style={{ color: 'rgba(255,255,255,.82)', lineHeight: 1.65, maxWidth: 460, margin: '0 auto 24px' }}>
              Join 240+ independent artists. Set up your storefront in minutes, reach thousands of buyers, and keep more of every sale.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" className="pill" style={{ background: 'white', color: 'var(--accent)', borderColor: 'white', fontWeight: 700 }}>
                Start selling free
              </Link>
              <Link href="/vendors" className="pill" style={{ background: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,.5)' }}>
                Browse vendors
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
