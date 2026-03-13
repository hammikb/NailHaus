export default function VendorLoading() {
  return (
    <main className="page-shell">
      <div className="container">
        <div className="breadcrumb">
          <div className="shimmer" style={{ height: 14, width: 160, borderRadius: 6 }} />
        </div>
        {/* Hero skeleton */}
        <div className="vendor-hero" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <div className="shimmer" style={{ width: 110, height: 110, borderRadius: 28, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="shimmer" style={{ height: 12, width: 120, borderRadius: 5, marginBottom: 12 }} />
              <div className="shimmer" style={{ height: 28, width: '50%', borderRadius: 8, marginBottom: 10 }} />
              <div className="shimmer" style={{ height: 14, width: '70%', borderRadius: 5, marginBottom: 8 }} />
              <div className="shimmer" style={{ height: 14, width: '55%', borderRadius: 5, marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 14 }}>
                {[60, 80, 70].map((w, i) => (
                  <div key={i} className="shimmer" style={{ height: 14, width: w, borderRadius: 5 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Trust grid skeleton */}
        <div className="trust-grid" style={{ marginBottom: 28 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="trust-card">
              <div className="shimmer" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div className="shimmer" style={{ height: 13, width: '60%', borderRadius: 5, marginBottom: 6 }} />
                <div className="shimmer" style={{ height: 11, width: '80%', borderRadius: 5 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Products grid skeleton */}
        <div className="grid product-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card product-card">
              <div className="shimmer product-thumb" />
              <div className="card-body">
                <div className="shimmer" style={{ height: 12, width: '45%', borderRadius: 5, marginBottom: 10 }} />
                <div className="shimmer" style={{ height: 16, width: '80%', borderRadius: 5, marginBottom: 8 }} />
                <div className="shimmer" style={{ height: 12, width: '60%', borderRadius: 5, marginBottom: 14 }} />
                <div className="shimmer" style={{ height: 22, width: '40%', borderRadius: 5 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
