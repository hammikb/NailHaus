import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { api } from '@/lib/api';

const SOCIAL_ICONS: Record<string, string> = { instagram: '📸', tiktok: '🎵', pinterest: '📌', twitter: '🐦', facebook: '👤', youtube: '▶️', website: '🌐' };

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await api.getVendor(id).catch(() => null);
  if (!vendor) notFound();

  const memberSince = vendor.createdAt
    ? new Date(vendor.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const socialEntries = Object.entries(vendor.socialLinks || {}).filter(([, v]) => v);

  return (
    <main className="page-shell">
      <div className="container">

        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link href="/vendors">Vendors</Link>
          <span>/</span>
          <span>{vendor.name}</span>
        </div>

        {/* Announcement banner */}
        {vendor.announcement && (
          <div className="announcement-bar">
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📣</span>
            <span>{vendor.announcement}</span>
          </div>
        )}

        {/* Vendor hero header */}
        <div className="vendor-hero" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ width: 110, height: 110, borderRadius: 28, display: 'grid', placeItems: 'center', fontSize: '3.2rem', background: vendor.bgColor, flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,.1)', border: '3px solid rgba(255,255,255,.7)' }}>
              {vendor.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <p className="eyebrow" style={{ margin: 0 }}>Vendor storefront</p>
                {vendor.verified && <span className="verified-badge">✓ Verified vendor</span>}
              </div>
              <h1 className="section-title" style={{ marginTop: 0, marginBottom: 6, fontSize: '2.2rem' }}>{vendor.name}</h1>
              {vendor.tagline && <p className="subtle" style={{ margin: '0 0 10px', fontSize: '1rem', fontStyle: 'italic' }}>{vendor.tagline}</p>}
              <p className="subtle" style={{ maxWidth: 600, margin: '0 0 16px', lineHeight: 1.65 }}>
                {vendor.description || 'Independent press-on nail artist on NailHaus.'}
              </p>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: '.875rem', marginBottom: socialEntries.length ? 14 : 0 }}>
                {(vendor.rating ?? 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(vendor.rating!))}</span>
                    <strong>{Number(vendor.rating).toFixed(1)}</strong>
                  </span>
                )}
                {(vendor.totalSales ?? 0) > 0 && <span><strong>{vendor.totalSales}</strong> <span className="muted">sales</span></span>}
                {(vendor.totalProducts ?? 0) > 0 && <span><strong>{vendor.totalProducts}</strong> <span className="muted">listings</span></span>}
                {memberSince && <span className="muted">Member since {memberSince}</span>}
              </div>

              {/* Social links */}
              {socialEntries.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {socialEntries.map(([platform, url]) => (
                    <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer" className="social-link">
                      {SOCIAL_ICONS[platform] || '🔗'} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="trust-grid" style={{ marginBottom: 28 }}>
          {vendor.verified && (
            <div className="trust-card" style={{ background: 'var(--success-bg)', borderColor: '#bbf7d0' }}>
              <span className="trust-icon">🛡️</span>
              <div><div className="trust-title" style={{ color: 'var(--success)' }}>Verified seller</div><div className="trust-desc">Identity &amp; quality confirmed</div></div>
            </div>
          )}
          <div className="trust-card" style={{ background: 'var(--info-bg)', borderColor: '#bfdbfe' }}>
            <span className="trust-icon">🔒</span>
            <div><div className="trust-title" style={{ color: 'var(--info)' }}>Secure checkout</div><div className="trust-desc">Protected by NailHaus</div></div>
          </div>
          <div className="trust-card" style={{ background: '#fdf4ff', borderColor: '#e9d5ff' }}>
            <span className="trust-icon">💌</span>
            <div><div className="trust-title" style={{ color: '#7e22ce' }}>Buyer protection</div><div className="trust-desc">Covered on every order</div></div>
          </div>
          <div className="trust-card">
            <span className="trust-icon">✉️</span>
            <div><div className="trust-title">Tracked shipping</div><div className="trust-desc">Real-time tracking</div></div>
          </div>
        </div>

        {/* Collections */}
        {vendor.collections && vendor.collections.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Collections</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {vendor.collections.map(col => (
                <Link key={col.id} href={`/shop?vendorId=${vendor.id}&collectionId=${col.id}`} className="chip" style={{ padding: '8px 18px', fontSize: '.88rem', fontWeight: 700 }}>
                  {col.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="section-head">
          <div>
            <p className="eyebrow">Products</p>
            <h2 className="section-title">Available <em>sets</em></h2>
          </div>
          <span className="chip">{vendor.products?.length || 0} listings</span>
        </div>

        {vendor.products?.length ? (
          <div className="grid product-grid">
            {vendor.products.map(product => <ProductCard key={product.id} product={{ ...product, vendor }} />)}
          </div>
        ) : (
          <div className="panel empty-state">
            <span className="empty-icon">💅</span>
            <p>No products listed yet.</p>
          </div>
        )}

        {/* Reviews */}
        {vendor.reviews?.length ? (
          <section className="section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Social proof</p>
                <h2 className="section-title">Customer <em>reviews</em></h2>
              </div>
              <span className="chip">{vendor.reviews.length} review{vendor.reviews.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {vendor.reviews.slice(0, 6).map(review => (
                <div key={review.id} className="list-item">
                  <div className="between">
                    <strong style={{ fontSize: '.9rem' }}>{review.user?.name || 'Anonymous'}</strong>
                    <span style={{ color: '#f59e0b', fontSize: '.85rem' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  {review.product && <div className="muted" style={{ fontSize: '.76rem', marginTop: 4 }}>Re: {review.product.name}</div>}
                  {review.title && <div style={{ marginTop: 8, fontWeight: 700, fontSize: '.9rem' }}>{review.title}</div>}
                  <p className="subtle" style={{ marginBottom: 0, marginTop: 5, fontSize: '.88rem' }}>{review.body}</p>
                  <div className="muted" style={{ fontSize: '.73rem', marginTop: 8 }}>
                    {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

      </div>
    </main>
  );
}
