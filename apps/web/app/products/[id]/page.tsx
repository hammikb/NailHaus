import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AddToCartSection } from '@/components/AddToCartSection';
import { ReviewForm } from '@/components/ReviewForm';
import { WishlistButton } from '@/components/WishlistButton';
import { mapProduct, mapReview, supabaseAdmin } from '@/lib/route-helpers';
import type { Product, Review, VendorSummary } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseAdmin.from('products').select('name, description, emoji, bg_color').eq('id', id).single();
  if (!data) return { title: 'Product | NailHaus' };
  const desc = data.description?.slice(0, 155) || `Shop ${data.name} press-on nail set on NailHaus.`;
  return {
    title: `${data.emoji} ${data.name} | NailHaus`,
    description: desc,
    openGraph: { title: `${data.emoji} ${data.name}`, description: desc, siteName: 'NailHaus' },
  };
}

type ProductDetail = Product & {
  reviews: Review[];
  vendor: VendorSummary | null;
};

function getEffectiveStock(product: Product) {
  const sizes = product.sizes
    ? product.sizes
        .split(/[,;]/)
        .map((size) => size.trim())
        .filter(Boolean)
    : [];

  if (!sizes.length || !product.sizeInventory) {
    return product.stock;
  }

  return sizes.reduce(
    (sum, size) => sum + Math.max(0, Number(product.sizeInventory?.[size] ?? 0)),
    0
  );
}

async function getProduct(id: string): Promise<ProductDetail> {
  const { data: productRow, error } = await supabaseAdmin
    .from('products')
    .select('*, vendors!vendor_id(id, name, emoji, bg_color)')
    .eq('id', id)
    .eq('hidden', false)
    .single();

  if (error || !productRow) {
    notFound();
  }

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('*, profiles!user_id(name)')
    .eq('product_id', id)
    .order('created_at', { ascending: false });

  const vendor = productRow.vendors as Record<string, unknown> | null;
  const product = mapProduct(productRow, vendor) as unknown as Product;

  return {
    ...product,
    vendor: product.vendor ?? null,
    reviews: (reviews || []).map((reviewRow: Record<string, unknown>) => {
      const profile = reviewRow.profiles as { name: string } | null;
      return mapReview(reviewRow, profile);
    }) as unknown as Review[],
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  const salePct = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;
  const effectiveStock = getEffectiveStock(product);
  const isOutOfStock =
    effectiveStock === 0 && product.availability !== 'made_to_order';
  const ratingFull = Math.round(product.rating || 0);

  return (
    <main className="page-shell">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/shop">Shop</Link>
          <span>/</span>
          {product.vendor && (
            <>
              <Link href={`/vendors/${product.vendor.id}`}>
                {product.vendor.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span>{product.name}</span>
        </div>

        <div className="detail-grid">
          <div
            className="panel detail-media"
            style={{
              background: product.bgColor || '#fde8e8',
              fontSize: '7rem',
            }}
          >
            {product.badge && (
              <span
                className={`badge badge-${product.badge}`}
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 18,
                  fontSize: '.8rem',
                }}
              >
                {product.badge.toUpperCase()}
              </span>
            )}
            {product.emoji || '💅'}
          </div>

          <div className="panel" style={{ padding: 32 }}>
            {product.vendor && (
              <Link
                href={`/vendors/${product.vendor.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  marginBottom: 12,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  fontSize: '.82rem',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  transition: 'all .15s',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    background: product.vendor.bgColor || '#fde8e8',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '.72rem',
                  }}
                >
                  {product.vendor.emoji || '💅'}
                </span>
                {product.vendor.name}
              </Link>
            )}

            <h1
              className="section-title"
              style={{ marginTop: 0, marginBottom: 10, fontSize: '2rem' }}
            >
              {product.name}
            </h1>

            {(product.reviewCount ?? 0) > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                <span style={{ color: '#f59e0b', fontSize: '1rem' }}>
                  {'★'.repeat(ratingFull)}
                  {'☆'.repeat(5 - ratingFull)}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {Number(product.rating || 0).toFixed(1)}
                </span>
                <span className="muted" style={{ fontSize: '.85rem' }}>
                  ({product.reviewCount} review
                  {product.reviewCount !== 1 ? 's' : ''})
                </span>
              </div>
            ) : (
              <div
                className="muted"
                style={{ fontSize: '.85rem', marginBottom: 18 }}
              >
                No reviews yet
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  letterSpacing: '-.02em',
                }}
              >
                ${product.price}
              </span>
              {product.originalPrice && (
                <span className="price-strike" style={{ fontSize: '1.1rem' }}>
                  ${product.originalPrice}
                </span>
              )}
              {salePct && (
                <span
                  className="sale-pct"
                  style={{ fontSize: '.88rem', padding: '4px 10px' }}
                >
                  {salePct}% off
                </span>
              )}
              {isOutOfStock ? (
                <span className="avail-pill avail-out">Out of stock</span>
              ) : product.availability === 'made_to_order' ? (
                <span className="avail-pill avail-made-to-order">
                  Made to order
                  {product.productionDays
                    ? ` · ~${product.productionDays} days`
                    : ''}
                </span>
              ) : (
                <span className="avail-pill avail-in-stock">In stock</span>
              )}
            </div>

            <p className="subtle" style={{ marginBottom: 20, lineHeight: 1.7 }}>
              {product.description}
            </p>

            <div className="tags" style={{ marginBottom: 18 }}>
              <span className="tag">💅 {product.shape || 'almond'}</span>
              <span className="tag">🎨 {product.style || 'minimal'}</span>
              {product.nailCount ? (
                <span className="tag">{product.nailCount} nails</span>
              ) : null}
              {product.finish ? (
                <span className="tag">✨ {product.finish}</span>
              ) : null}
              {product.wearTime ? (
                <span className="tag">⏱ {product.wearTime}</span>
              ) : null}
              {product.sizes ? (
                <span className="tag">📏 {product.sizes}</span>
              ) : null}
              {product.glueIncluded === true ? (
                <span
                  className="tag"
                  style={{
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    borderColor: '#86efac',
                  }}
                >
                  Glue included
                </span>
              ) : product.glueIncluded === false ? (
                <span className="tag">No glue</span>
              ) : null}
              {product.reusable === true ? (
                <span
                  className="tag"
                  style={{
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    borderColor: '#86efac',
                  }}
                >
                  Reusable
                </span>
              ) : product.reusable === false ? (
                <span className="tag">Single use</span>
              ) : null}
            </div>

            {product.occasions && product.occasions.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <span
                  className="muted"
                  style={{
                    fontSize: '.76rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Great for
                </span>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {product.occasions.map((occasion) => (
                    <span key={occasion} className="chip">
                      {occasion}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <AddToCartSection
              product={{
                id: product.id,
                name: product.name,
                price: product.price,
                emoji: product.emoji,
                bgColor: product.bgColor,
                vendorId: product.vendorId,
                vendorName: product.vendor?.name,
                sizes: product.sizes,
                sizeInventory: product.sizeInventory,
                stock: effectiveStock,
                availability: product.availability,
              }}
            />
            <WishlistButton productId={product.id} style={{ marginTop: 10 }} />
          </div>
        </div>

        <div className="trust-grid" style={{ marginTop: 24 }}>
          <div className="trust-card">
            <span className="trust-icon">🛡️</span>
            <div>
              <div className="trust-title">Buyer protection</div>
              <div className="trust-desc">Covered on every order</div>
            </div>
          </div>
          <div className="trust-card">
            <span className="trust-icon">✉️</span>
            <div>
              <div className="trust-title">Tracked shipping</div>
              <div className="trust-desc">Real-time order tracking</div>
            </div>
          </div>
          <div className="trust-card">
            <span className="trust-icon">⭐</span>
            <div>
              <div className="trust-title">Verified reviews</div>
              <div className="trust-desc">From real buyers only</div>
            </div>
          </div>
          <div className="trust-card">
            <span className="trust-icon">🎨</span>
            <div>
              <div className="trust-title">Handcrafted quality</div>
              <div className="trust-desc">Curated indie artists</div>
            </div>
          </div>
        </div>

        <ReviewForm productId={product.id} />

        {!!product.reviews?.length && (
          <section className="section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Customer feedback</p>
                <h2 className="section-title">
                  Product <em>reviews</em>
                </h2>
              </div>
              <span className="chip">
                {product.reviews.length} review
                {product.reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              }}
            >
              {product.reviews.map((review) => (
                <div className="list-item" key={review.id}>
                  <div className="between">
                    <strong style={{ fontSize: '.9rem' }}>
                      {review.user?.name || 'Anonymous'}
                    </strong>
                    <span style={{ color: '#f59e0b', fontSize: '.85rem' }}>
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                  {review.title && (
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 700,
                        fontSize: '.9rem',
                      }}
                    >
                      {review.title}
                    </div>
                  )}
                  <p
                    className="subtle"
                    style={{
                      marginBottom: 0,
                      marginTop: 5,
                      fontSize: '.88rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {review.body}
                  </p>
                  <div
                    className="muted"
                    style={{ fontSize: '.73rem', marginTop: 8 }}
                  >
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
