import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { VendorCard } from '@/components/VendorCard';
import { api } from '@/lib/api';

export default async function HomePage() {
  const [products, vendors] = await Promise.all([
    api.getProducts({ limit: 8 }),
    api.getVendors(),
  ]);

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-card hero-copy">
            <div className="eyebrow">The press-on nail marketplace</div>
            <h1 className="display">Beautiful nails, <em>better vendors</em>, one clean home.</h1>
            <p className="subtle">
              Discover handcrafted press-on sets, browse verified artists, and build NailHaus on a stack that can actually scale.
            </p>
            <div className="hero-actions" style={{ marginTop: 20 }}>
              <Link className="pill btn-primary" href="/shop">Shop all nails</Link>
              <Link className="pill btn-ghost" href="/vendors">Browse vendors</Link>
            </div>
            <div className="stats">
              <div className="stat"><strong>240+</strong><span className="muted">Active vendors</span></div>
              <div className="stat"><strong>12k+</strong><span className="muted">Listed sets</span></div>
              <div className="stat"><strong>98k+</strong><span className="muted">Happy customers</span></div>
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

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="section-title">Top <em>sets</em></h2>
            </div>
            <Link className="muted" href="/shop">View all →</Link>
          </div>
          <div className="grid product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

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
            {vendors.slice(0, 6).map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
