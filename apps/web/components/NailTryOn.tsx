'use client';

import { useRef, useState, useCallback } from 'react';

interface NailTryOnProps {
  productName: string;
  nailImageUrl: string | null;
  nailEmoji: string;
  nailBgColor: string;
}

interface NailPosition { x: number; y: number; w: number; h: number; angle: number }

// Default nail positions on a hand (as % of image dimensions)
const DEFAULT_NAILS: NailPosition[] = [
  { x: 0.18, y: 0.18, w: 0.09, h: 0.13, angle: -15 },  // pinky
  { x: 0.30, y: 0.10, w: 0.10, h: 0.14, angle: -7 },   // ring
  { x: 0.44, y: 0.07, w: 0.11, h: 0.15, angle: 0 },    // middle
  { x: 0.58, y: 0.10, w: 0.10, h: 0.14, angle: 7 },    // index
  { x: 0.76, y: 0.30, w: 0.09, h: 0.13, angle: 30 },   // thumb
];

export function NailTryOn({ productName, nailImageUrl, nailEmoji, nailBgColor }: NailTryOnProps) {
  const [open, setOpen] = useState(false);
  const [handPhoto, setHandPhoto] = useState<string | null>(null);
  const [nailImg, setNailImg] = useState<HTMLImageElement | null>(null);
  const [rendered, setRendered] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [opacity, setOpacity] = useState(0.85);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load the nail product image once
  const loadNailImage = useCallback(() => {
    if (nailImg || !nailImageUrl) return Promise.resolve(nailImg);
    return new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { setNailImg(img); resolve(img); };
      img.onerror = () => resolve(null);
      img.src = nailImageUrl;
    });
  }, [nailImg, nailImageUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setHandPhoto(ev.target?.result as string);
      setRendered(null);
    };
    reader.readAsDataURL(file);
  }

  async function applyNails(currentOpacity = opacity) {
    if (!handPhoto || !canvasRef.current) return;
    setRendering(true);

    const nail = await loadNailImage();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setRendering(false); return; }

    const handImg = new Image();
    handImg.onload = () => {
      canvas.width = handImg.width;
      canvas.height = handImg.height;
      ctx.drawImage(handImg, 0, 0);

      if (nail) {
        DEFAULT_NAILS.forEach(({ x, y, w, h, angle }) => {
          const nx = x * handImg.width;
          const ny = y * handImg.height;
          const nw = w * handImg.width;
          const nh = h * handImg.height;

          ctx.save();
          ctx.translate(nx + nw / 2, ny + nh / 2);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.globalAlpha = currentOpacity;
          ctx.drawImage(nail, -nw / 2, -nh / 2, nw, nh);
          ctx.globalAlpha = 1;
          ctx.restore();
        });
      } else {
        // Fallback: color tinted overlays
        DEFAULT_NAILS.forEach(({ x, y, w, h, angle }) => {
          const nx = x * handImg.width;
          const ny = y * handImg.height;
          const nw = w * handImg.width;
          const nh = h * handImg.height;
          ctx.save();
          ctx.translate(nx + nw / 2, ny + nh / 2);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.globalAlpha = currentOpacity;
          ctx.fillStyle = nailBgColor || '#fde8e8';
          ctx.beginPath();
          ctx.ellipse(0, 0, nw / 2, nh / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        });
      }

      setRendered(canvas.toDataURL('image/jpeg', 0.92));
      setRendering(false);
    };
    handImg.src = handPhoto;
  }

  if (!open) {
    return (
      <button
        className="pill btn-ghost"
        style={{ marginTop: 10, gap: 6 }}
        onClick={() => setOpen(true)}
      >
        👁️ Try it on
      </button>
    );
  }

  return (
    <div style={{ marginTop: 16, padding: 20, background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '.95rem' }}>👁️ Try On: {productName}</div>
          <p className="muted" style={{ fontSize: '.78rem', margin: '2px 0 0' }}>Upload a photo of your hand and we'll overlay the nail design.</p>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--muted)' }}>✕</button>
      </div>

      {!handPhoto ? (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 14, padding: '32px 24px',
            textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📸</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Upload a hand photo</div>
          <p className="muted" style={{ fontSize: '.8rem', margin: 0 }}>JPG or PNG · Best with palm facing up, fingers spread</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="pill btn-ghost btn-sm" onClick={() => { setHandPhoto(null); setRendered(null); }}>✕ Clear photo</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem', fontWeight: 600, color: 'var(--muted)' }}>
              Opacity:
              <input type="range" min={0.3} max={1} step={0.05} value={opacity}
                onChange={e => { const v = parseFloat(e.target.value); setOpacity(v); if (rendered) applyNails(v); }}
                style={{ width: 90 }}
              />
              {Math.round(opacity * 100)}%
            </label>
            <button className="pill btn-primary btn-sm" onClick={() => applyNails()} disabled={rendering}>
              {rendering ? '⏳ Rendering…' : '✨ Apply nails'}
            </button>
            {rendered && (
              <a href={rendered} download="nail-try-on.jpg" className="pill btn-ghost btn-sm">⬇️ Save</a>
            )}
          </div>

          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rendered || handPhoto} alt="Try-on preview" style={{ width: '100%', display: 'block', borderRadius: 14 }} />
            {!rendered && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)', borderRadius: 14 }}>
                <button className="pill btn-primary" onClick={() => applyNails()} disabled={rendering} style={{ fontSize: '1rem' }}>
                  {rendering ? '⏳ Rendering…' : `✨ Apply ${nailEmoji} nails`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <p className="muted" style={{ fontSize: '.72rem', marginTop: 10, marginBottom: 0 }}>
        ℹ️ Your photo is processed locally in your browser and never uploaded.
      </p>
    </div>
  );
}
