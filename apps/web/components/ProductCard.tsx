import Link from 'next/link';
import { Product } from '@/lib/types';

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export function ProductCard({ product }: { product: Product }) {
  const isOutOfStock = product.stock === 0 && product.availability !== 'made_to_order';
  const isLowStock = !isOutOfStock && product.availability !== 'made_to_order' && product.stock > 0 && product.stock <= 4;
  const salePct = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

  return (
    <Link href={`/products/${product.id}`} className="card product-card">
      <div className="product-thumb" style={{ background: product.bgColor }}>
        {product.badge ? (
          <span className={`badge badge-${product.badge}`}>{product.badge.toUpperCase()}</span>
        ) : isOutOfStock ? (
          <span className="badge" style={{ background: 'rgba(0,0,0,.48)', color: 'white', borderColor: 'transparent' }}>Sold out</span>
        ) : null}
        <span className="emoji-wrap" style={{ fontSize: '3.6rem', lineHeight: 1 }}>{product.emoji}</span>
      </div>

      <div className="card-body">
        {product.vendor && (
          <div className="vendor-chip">
            <span className="vendor-chip-avatar" style={{ background: product.vendor.bgColor }}>{product.vendor.emoji}</span>
            {product.vendor.name}
          </div>
        )}

        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, lineHeight: 1.3 }}>{product.name}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {product.rating > 0 ? (
            <>
              <Stars rating={product.rating} />
              <span className="muted" style={{ fontSize: '.76rem' }}>({product.reviewCount})</span>
            </>
          ) : <span className="muted" style={{ fontSize: '.76rem' }}>No reviews yet</span>}
          <span className="muted" style={{ fontSize: '.76rem' }}>· {product.shape} · {product.style}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="price" style={{ fontSize: '1.1rem' }}>${product.price}</span>
            {product.originalPrice ? <span className="price-strike">${product.originalPrice}</span> : null}
            {salePct ? <span className="sale-pct">{salePct}%</span> : null}
          </div>
          {isOutOfStock ? (
            <span className="avail-pill avail-out">Out of stock</span>
          ) : isLowStock ? (
            <span className="avail-pill" style={{ background: '#fef9c3', color: '#a16207' }}>Only {product.stock} left</span>
          ) : product.availability === 'made_to_order' ? (
            <span className="avail-pill avail-made-to-order">{product.productionDays ? `~${product.productionDays}d` : 'MTO'}</span>
          ) : (
            <span className="avail-pill avail-in-stock">In stock</span>
          )}
        </div>
      </div>
    </Link>
  );
}
