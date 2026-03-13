import Link from 'next/link';
import { VendorSummary } from '@/lib/types';

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span className="stars" style={{ fontSize: '.78rem' }}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export function VendorCard({ vendor }: { vendor: VendorSummary }) {
  return (
    <Link href={`/vendors/${vendor.id}`} className="card vendor-card" style={{ padding: '20px 22px', display: 'block' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        <div className="vendor-avatar" style={{ background: vendor.bgColor }}>
          {vendor.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{vendor.name}</span>
            {vendor.verified && <span className="verified-badge">✓ Verified</span>}
          </div>
          <div className="muted" style={{ fontSize: '.85rem', lineHeight: 1.4 }}>
            {vendor.tagline || 'Independent press-on nail artist'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        {(vendor.rating ?? 0) > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Stars rating={vendor.rating!} />
            <span className="muted" style={{ fontSize: '.76rem' }}>{Number(vendor.rating).toFixed(1)}</span>
          </div>
        ) : null}
        {(vendor.totalSales ?? 0) > 0 && (
          <span className="muted" style={{ fontSize: '.78rem' }}>{vendor.totalSales} sales</span>
        )}
        <span className="muted" style={{ fontSize: '.78rem' }}>{vendor.totalProducts || 0} sets</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span className="pill btn-ghost" style={{ padding: '7px 18px', fontSize: '.82rem' }}>Visit shop →</span>
      </div>
    </Link>
  );
}
