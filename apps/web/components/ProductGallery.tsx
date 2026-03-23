'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProductGalleryProps {
  primaryImage: string | null;
  images: string[];
  emoji: string;
  bgColor: string;
  badge?: string | null;
  name: string;
}

export function ProductGallery({ primaryImage, images, emoji, bgColor, badge, name }: ProductGalleryProps) {
  const allImages = primaryImage
    ? [primaryImage, ...images.filter(u => u.split('?')[0] !== primaryImage.split('?')[0])]
    : images;

  const [selected, setSelected] = useState(allImages[0] || null);
  const [zoomed, setZoomed] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const openZoom = useCallback((url: string) => {
    const idx = allImages.indexOf(url);
    setZoomIndex(idx >= 0 ? idx : 0);
    setZoomed(true);
  }, [allImages]);

  const closeZoom = useCallback(() => setZoomed(false), []);

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomIndex(i => (i - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const goNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomIndex(i => (i + 1) % allImages.length);
  }, [allImages.length]);

  useEffect(() => {
    if (!zoomed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeZoom();
      if (e.key === 'ArrowRight') setZoomIndex(i => (i + 1) % allImages.length);
      if (e.key === 'ArrowLeft') setZoomIndex(i => (i - 1 + allImages.length) % allImages.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomed, allImages.length, closeZoom]);

  return (
    <div>
      {/* Main display */}
      <div
        className="panel detail-media"
        style={{
          background: bgColor || '#fde8e8',
          fontSize: '7rem',
          position: 'relative',
          overflow: 'hidden',
          cursor: selected ? 'zoom-in' : 'default',
        }}
        onClick={() => selected && openZoom(selected)}
        title={selected ? 'Click to enlarge' : undefined}
      >
        {badge && (
          <span
            className={`badge badge-${badge}`}
            style={{ position: 'absolute', top: 18, left: 18, fontSize: '.8rem', zIndex: 1 }}
          >
            {badge.toUpperCase()}
          </span>
        )}
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          emoji || '💅'
        )}
        {selected && (
          <span style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(0,0,0,.38)', color: 'white',
            borderRadius: 8, padding: '4px 9px', fontSize: '.72rem', fontWeight: 700,
            backdropFilter: 'blur(4px)', pointerEvents: 'none',
          }}>
            🔍 Zoom
          </span>
        )}
      </div>

      {/* Thumbnails strip */}
      {allImages.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {allImages.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelected(url)}
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                overflow: 'hidden',
                border: selected === url ? '2.5px solid var(--accent)' : '2px solid var(--border)',
                padding: 0,
                cursor: 'pointer',
                background: bgColor,
                flexShrink: 0,
                transition: 'border-color .15s',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name} photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {zoomed && (
        <div
          onClick={closeZoom}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
            backdropFilter: 'blur(6px)',
          }}
        >
          {/* Close */}
          <button
            onClick={closeZoom}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,.12)', border: 'none', color: 'white',
              width: 44, height: 44, borderRadius: '50%', fontSize: '1.4rem',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
            }}
          >
            ✕
          </button>

          {/* Prev */}
          {allImages.length > 1 && (
            <button
              onClick={goPrev}
              style={{
                position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,.12)', border: 'none', color: 'white',
                width: 48, height: 48, borderRadius: '50%', fontSize: '1.3rem',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
              }}
            >
              ‹
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={allImages[zoomIndex]}
            alt={name}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 16,
              boxShadow: '0 32px 80px rgba(0,0,0,.5)',
              cursor: 'default',
            }}
          />

          {/* Next */}
          {allImages.length > 1 && (
            <button
              onClick={goNext}
              style={{
                position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,.12)', border: 'none', color: 'white',
                width: 48, height: 48, borderRadius: '50%', fontSize: '1.3rem',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
              }}
            >
              ›
            </button>
          )}

          {/* Counter */}
          {allImages.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,.7)', fontSize: '.82rem', fontWeight: 600,
            }}>
              {zoomIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

