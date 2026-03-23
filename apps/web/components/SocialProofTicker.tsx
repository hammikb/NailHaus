'use client';

const ITEMS = [
  '🛍️ Mia just ordered Rosegold Almond Set',
  '⭐⭐⭭⭐⭐ "Perfect fit!" — Emma',
  '🎀 Sofia just ordered Glazed Donut Coffin',
  '💅 Just restocked: French Tip Stiletto',
  '⭐⭐⭐⭐⭐ "Obsessed with these!" — Kayla',
  '🌸 Lily just ordered Cherry Blossom Almond',
  '🔥 Trending: Midnight Glam Set',
  '⭐⭐⭐⭐⭐ "Will order again!" — Jess',
  '💜 Ava just ordered Lavender Dream Coffin',
  '✨ Just restocked: Crystal Chrome Square',
  '🌺 New vendor joined: BloomNails',
  '⭐⭐⭐⭐⭐ "Lasted 2 weeks!" — Priya',
];

// Duplicate for seamless loop
const DOUBLED = [...ITEMS, ...ITEMS];

export function SocialProofTicker() {
  return (
    <div style={{
      overflow: 'hidden',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-2)',
      padding: '10px 0',
    }}>
      <div style={{
        display: 'flex',
        gap: 48,
        whiteSpace: 'nowrap',
        animation: 'ticker-scroll 40s linear infinite',
      }}>
        {DOUBLED.map((item, i) => (
          <span key={i} style={{
            fontSize: '.82rem',
            fontWeight: 600,
            color: 'var(--text-2)',
            flexShrink: 0,
          }}>
            {item}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-scroll { animation: none; }
        }
      `}</style>
    </div>
  );
}
