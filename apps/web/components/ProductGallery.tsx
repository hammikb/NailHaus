'use client';

import { useState } from 'react';

interface ProductGalleryProps {
  primaryImage: string | null;
  images: string[];
  emoji: string;
  bgColor: string;
  badge?: string | null;
  name: string;
}

export function ProductGallery({ primaryImage, images, emoji, bgColor, badge, name }: ProductGalleryProps) {
  // Build display list: primary first, then rest (deduplicated)
  const allImages = primaryImage
    ? [primaryImage, ...images.filter(u => u.split('?')[0] !== primaryImage.split('?')[0])]
    : images;

  const [selected, setSelected] = useState(allImages[0] || null);

  return (
    <div>
      {/* Main display */}
      <div
        className="panel detail-media"
        style={{ background: bgColor || '#fde8e8', fontSize: '7rem', position: 'relative', overflow: 'hidden' }}
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
      </div>

      {/* Thumbnails strip — only shown when there are multiple images */}
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
    </div>
  );
}
