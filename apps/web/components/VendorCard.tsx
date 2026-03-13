import Link from 'next/link';
import { VendorSummary } from '@/lib/types';

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span className="stars" style={{ fontSize: '.78rem' }}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export function VendorCard({ vendor }: { vendor: VendorSummary }) {
  return (
    <Link href={`/vendors/${vendor.id}`} className="card vendor-card" style={{ padding: 0, display: 'block', overflow: 'hidden' }}>
      {/* Colored banner */}
      <div style={{
        height: 70, background: vendor.bgColor || '#fde8e8', position: 'relative',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        padding: '0 16px 8px',
      }}>
        <div style={{
          position: 'absolute', bottom: -26, left: 18,
          width: 52, height: 52, borderRadius: 16,
          background: 'white', border: `3px solid white`,
          boxShadow: '0 4px 12px rgba(0,0,0,.12)',
          display: 'grid', placeItems: 'center', fontSize: '1.6rem',
        }}>
          {vendor.emoji}
        </div>
        {vendor.verified && (
          <span className="verified-badge" style={{ fontSize: '.66rem', padding: '3px 9px' }}>✓ Verified</span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '34px 18px 18px' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4, lineHeight: 1.2 }}>{vendor.name}</div>
        <div className="muted" style={{ fontSize: '.84rem', lineHeight: 1.45, marginBottom: 14, minHeight: 38 }}>
          {vendor.tagline || 'Independent press-on nail artist'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {(vendor.rating ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Stars rating={vendor.rating!} />
              <span className="muted" style={{ fontSize: '.75rem' }}>{Number(vendor.rating).toFixed(1)}</span>
            </div>
          )}
          {(vendor.totalSales ?? 0) > 0 && (
            <span className="chip" style={{ fontSize: '.72rem' }}>{vendor.totalSales} sales</span>
          )}
          <span className="chip" style={{ fontSize: '.72rem' }}>{vendor.totalProducts || 0} sets</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span className="pill btn-ghost" style={{ padding: '7px 16px', fontSize: '.8rem' }}>Visit shop →</span>
        </div>
      </div>
    </Link>
  );
}
