export default function ProductLoading() {
  return (
    <main className="page-shell">
      <div className="container">
        <div className="breadcrumb">
          <div className="shimmer" style={{ height: 14, width: 180, borderRadius: 6 }} />
        </div>
        <div className="detail-grid">
          {/* Media skeleton */}
          <div className="panel detail-media shimmer" style={{ minHeight: 340 }} />
          {/* Info skeleton */}
          <div className="panel" style={{ padding: 32 }}>
            <div className="shimmer" style={{ height: 13, width: 120, borderRadius: 999, marginBottom: 16 }} />
            <div className="shimmer" style={{ height: 32, width: '75%', borderRadius: 8, marginBottom: 12 }} />
            <div className="shimmer" style={{ height: 14, width: 160, borderRadius: 6, marginBottom: 20 }} />
            <div className="shimmer" style={{ height: 36, width: 140, borderRadius: 8, marginBottom: 20 }} />
            <div className="shimmer" style={{ height: 14, width: '95%', borderRadius: 6, marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 14, width: '80%', borderRadius: 6, marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 14, width: '60%', borderRadius: 6, marginBottom: 24 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {[80, 70, 90, 75].map((w, i) => (
                <div key={i} className="shimmer" style={{ height: 30, width: w, borderRadius: 999 }} />
              ))}
            </div>
            <div className="shimmer" style={{ height: 50, borderRadius: 999, marginBottom: 12 }} />
          </div>
        </div>
        <div className="trust-grid" style={{ marginTop: 24 }}>
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
      </div>
    </main>
  );
}
