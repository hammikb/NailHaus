'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export interface RecentItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  bgColor: string;
  vendorName?: string;
  imageUrl?: string | null;
}

const KEY = 'nh_recent';
const MAX = 8;

export function recordView(item: RecentItem) {
  try {
    const existing: RecentItem[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    const filtered = existing.filter(i => i.id !== item.id);
    const next = [item, ...filtered].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function ViewRecorder({ item }: { item: RecentItem }) {
  useEffect(() => {
    recordView(item);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return null;
}

export function RecentlyViewedStrip({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const stored: RecentItem[] = JSON.parse(localStorage.getItem(KEY) || '[]');
      setItems(excludeId ? stored.filter(i => i.id !== excludeId) : stored);
    } catch {}
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="section" style={{ paddingTop: 16 }}>
      <div className="container">
        <div className="section-head" style={{ marginBottom: 14 }}>
          <div>
            <p className="eyebrow">Your history</p>
            <h2 className="section-title">Recently <em>viewed</em></h2>
          </div>
          <button
            className="pill btn-ghost btn-sm"
            onClick={() => { try { localStorage.removeItem(KEY); } catch {} setItems([]); }}
          >
            Clear
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
          {items.map(item => (
            <Link
              key={item.id}
              href={`/products/${item.id}`}
              style={{
                flexShrink: 0,
                width: 140,
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                overflow: 'hidden',
                transition: 'transform .18s, box-shadow .18s',
                display: 'block',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '';
              }}
            >
              <div
                style={{
                  height: 110,
                  background: item.bgColor || '#fde8e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.6rem',
                  overflow: 'hidden',
                }}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  item.emoji || '💅'
                )}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '.8rem', lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.name}
                </div>
                <div style={{ fontWeight: 800, fontSize: '.85rem', color: 'var(--accent)' }}>
                  ${item.price}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
