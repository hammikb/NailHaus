import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { VendorCard } from '@/components/VendorCard';
import { RecentlyViewedStrip } from '@/components/RecentlyViewed';
import { getPopularProducts, getTopVendors, getNewArrivals, getEditorialLooks, getHomePageReviews, getHomePageStats } from '@/lib/queries';

// Revalidate the home page at most once per minute.
// Queries Supabase directly — no internal HTTP roundtrip through the API routes.
export const revalidate = 60;

const CATEGORIES = [
  { label: 'Almond', emoji: '🌸', href: '/shop?shape=almond', color: '#fde8e8' },
  { label: 'Coffin', emoji: '💜', href: '/shop?shape=coffin', color: '#ede8fd' },
  { label: 'Stiletto', emoji: '🖤', href: '/shop?shape=stiletto', color: '#e8e8fd' },
  { label: 'Floral', emoji: '🌺', href: '/shop?style=floral', color: '#fde8f4' },
  { label: 'Glam', emoji: '✨', href: '/shop?style=glam', color: '#fdf5e8' },
  { label: 'Minimal', emoji: '🤍', href: '/shop?style=minimal', color: '#f0ede8' },
];

function formatStat(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function HomePage() {
  const [products, vendors, newArrivals, editorialLooks, stats, reviews] = await Promise.all([
    getPopularProducts(8).catch(() => []),
    getTopVendors().catch(() => []),
    getNewArrivals(8).catch(() => []),
    getEditorialLooks().catch(() => []),
    getHomePageStats().catch(() => ({ verifiedVendors: 0, liveSets: 0, customerReviews: 0 })),
    getHomePageReviews(3).catch(() => []),
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
                <strong style={{ color: 'var(--accent)' }}>{formatStat(stats.verifiedVendors)}</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>Verified vendors</span>
              </div>
              <div className="stat">
                <strong style={{ color: 'var(--accent)' }}>{formatStat(stats.liveSets)}</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>Listed sets</span>
              </div>
              <div className="stat">
                <strong style={{ color: 'var(--accent)' }}>{formatStat(stats.customerReviews)}</strong>
                <span className="muted" style={{ fontSize: '.8rem' }}>Customer reviews</span>
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

      {/* ─── Customer Reviews ───────────────────── */}
      {reviews.length > 0 && (
        <section className="section" style={{ paddingTop: 8 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Verified buyers</p>
                <h2 className="section-title">Real customer <em>reviews</em></h2>
              </div>
              <span className="chip">
                {stats.customerReviews} total review{stats.customerReviews !== 1 ? 's' : ''}
              </span>
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
            >
              {reviews.map((review) => (
                <Link
                  key={review.id}
                  href={review.product ? `/products/${review.product.id}` : '/shop'}
                  className="list-item"
                  style={{ display: 'block', color: 'inherit' }}
                >
                  <div className="between" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <strong style={{ fontSize: '.92rem' }}>{review.user?.name || 'Anonymous'}</strong>
                      {review.product && (
                        <div className="muted" style={{ fontSize: '.76rem', marginTop: 4 }}>
                          Re: {review.product.name}
                        </div>
                      )}
                    </div>
                    <span style={{ color: '#f59e0b', fontSize: '.85rem', flexShrink: 0 }}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                  {review.title && (
                    <div style={{ marginTop: 10, fontWeight: 700, fontSize: '.92rem' }}>
                      {review.title}
                    </div>
                  )}
                  <p className="subtle" style={{ margin: '8px 0 0', fontSize: '.89rem', lineHeight: 1.6 }}>
                    {review.body}
                  </p>
                  <div className="muted" style={{ fontSize: '.73rem', marginTop: 10 }}>
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
              <Link key={cat.label} href={cat.href} className="category-card" style={{ background: cat.color }}>
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
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

      {/* ─── New Arrivals ───────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Just dropped</p>
                <h2 className="section-title">New <em>arrivals</em></h2>
              </div>
              <Link className="muted" href="/shop?sort=newest">View all →</Link>
            </div>
            <div className="grid product-grid">
              {newArrivals.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── Editorial / Trending Looks ─────────── */}
      {editorialLooks.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Curated by us</p>
                <h2 className="section-title">Trending <em>looks</em></h2>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {editorialLooks.map(look => {
                if (!look.products.length) return null;
                return (
                  <div key={look.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: '1.6rem' }}>{look.emoji}</span>
                      <div>
                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>{look.title}</h3>
                        {look.subtitle && <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>{look.subtitle}</p>}
                      </div>
                    </div>
                    <div className="grid product-grid">
                      {look.products.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Recently Viewed ────────────────────── */}
      <RecentlyViewedStrip />

      {/* ─── Trust Strip ────────────────────────── */}
      <section className="section" style={{ padding: '20px 0' }}>
        <div className="container">
          <div className="trust-grid">
            <div className="trust-card">
              <span className="trust-icon">🔒</span>
              <div><div className="trust-title">Secure payments</div><div className="trust-desc">Powered by Stripe</div></div>
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
              { emoji: '🔍', title: 'Browse & discover', desc: 'Explore handcrafted press-on sets from independent artists in one place.' },
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
              Set up your storefront in minutes, reach NailHaus shoppers, and keep more of every sale.
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
