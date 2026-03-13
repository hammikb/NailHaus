// apps/web/app/vendors/[id]/page.tsx
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

type VendorProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  emoji?: string;
  bgColor?: string;
  badge?: string | null;
  rating?: number;
  reviewCount?: number;
};

type Vendor = {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  emoji?: string;
  bgColor?: string;
  tags?: string[];
  verified?: boolean;
  rating?: number;
  totalSales?: number;
  totalProducts?: number;
  announcement?: string;
  products?: VendorProduct[];
};

async function getVendor(id: string): Promise<Vendor> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';

  if (!host) throw new Error('Missing host header');

  const res = await fetch(`${proto}://${host}/api/vendors/${id}`, {
    cache: 'no-store',
  });

  if (res.status === 404) notFound();

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Failed to load vendor ${id}`);
  }

  return data as Vendor;
}

export default async function VendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await getVendor(id);

  return (
    <main className="page-shell">
      <div className="container">
        <div className="panel" style={{ padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                display: 'grid',
                placeItems: 'center',
                fontSize: '2rem',
                background: vendor.bgColor || '#fde8e8',
              }}
            >
              {vendor.emoji || '💅'}
            </div>

            <div>
              <h1 style={{ margin: 0 }}>{vendor.name}</h1>
              {vendor.tagline ? (
                <p className="subtle" style={{ marginTop: 8 }}>
                  {vendor.tagline}
                </p>
              ) : null}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {vendor.verified ? <span className="chip">Verified</span> : null}
                {vendor.rating ? <span className="chip">⭐ {vendor.rating}</span> : null}
                {typeof vendor.totalSales === 'number' ? (
                  <span className="chip">{vendor.totalSales} sales</span>
                ) : null}
                {typeof vendor.totalProducts === 'number' ? (
                  <span className="chip">{vendor.totalProducts} products</span>
                ) : null}
              </div>
            </div>
          </div>

          {vendor.announcement ? (
            <div className="panel" style={{ marginTop: 20, padding: 16 }}>
              <strong>Shop announcement</strong>
              <p className="subtle" style={{ marginBottom: 0, marginTop: 8 }}>
                {vendor.announcement}
              </p>
            </div>
          ) : null}

          {vendor.description ? (
            <p className="subtle" style={{ marginTop: 20 }}>
              {vendor.description}
            </p>
          ) : null}

          {!!vendor.tags?.length && (
            <div className="tags" style={{ marginTop: 16 }}>
              {vendor.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Shop products</p>
              <h2 className="section-title">
                Browse <em>{vendor.name}</em>
              </h2>
            </div>
          </div>

          <div className="grid grid-products">
            {vendor.products?.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="product-card"
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="product-media"
                  style={{ background: product.bgColor || '#fde8e8' }}
                >
                  {product.badge ? (
                    <span className={`badge badge-${product.badge}`}>
                      {product.badge}
                    </span>
                  ) : null}
                  <span className="product-emoji">{product.emoji || '💅'}</span>
                </div>

                <div className="product-body">
                  <h3>{product.name}</h3>
                  <div className="price-row">
                    <span className="price">${product.price}</span>
                    {product.originalPrice ? (
                      <span className="price-strike">${product.originalPrice}</span>
                    ) : null}
                  </div>
                  <div className="muted" style={{ fontSize: '.82rem' }}>
                    ⭐ {product.rating || 0} · {product.reviewCount || 0} reviews
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}