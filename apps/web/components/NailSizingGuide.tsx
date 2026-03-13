'use client';

import { useState } from 'react';

const SIZE_CHART = [
  { size: 'XS', width: '13–15 mm', numeric: '0–1', thumb: false },
  { size: 'S',  width: '15–17 mm', numeric: '1–2', thumb: false },
  { size: 'M',  width: '17–19 mm', numeric: '2–3', thumb: false },
  { size: 'L',  width: '19–21 mm', numeric: '3–4', thumb: false },
  { size: 'XL', width: '21–24 mm', numeric: '4–5', thumb: false },
  { size: 'Thumb', width: '18–22 mm', numeric: 'T / 5–6', thumb: true },
];

const FINGER_TIPS = [
  { finger: 'Thumb', typical: 'XL or Thumb kit' },
  { finger: 'Index', typical: 'M – L' },
  { finger: 'Middle', typical: 'M – L' },
  { finger: 'Ring', typical: 'S – M' },
  { finger: 'Pinky', typical: 'XS – S' },
];

export function NailSizingGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'guide' | 'chart' | 'tips'>('guide');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--accent)', fontSize: '.82rem', fontWeight: 700,
          padding: '4px 0', textDecoration: 'underline', textDecorationStyle: 'dotted',
        }}
      >
        📏 Need help with sizing?
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(20,10,20,.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: 20, maxWidth: 480, width: '100%',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.2)',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg,#fce4f5,#fde8e8)',
              padding: '24px 24px 20px', borderRadius: '20px 20px 0 0',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>💅</div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#2d1a2e' }}>Nail Sizing Guide</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '.85rem', color: '#9a4a7a' }}>Find your perfect fit in 3 steps</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} style={{ background: 'rgba(0,0,0,.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1.1rem', display: 'grid', placeItems: 'center', color: '#2d1a2e', flexShrink: 0 }}>×</button>
              </div>
              {/* Tab nav */}
              <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
                {(['guide', 'chart', 'tips'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setStep(t)} style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: '.78rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all .15s',
                    background: step === t ? '#c45990' : 'rgba(255,255,255,.6)',
                    color: step === t ? '#fff' : '#9a4a7a',
                  }}>
                    {t === 'guide' ? '📐 How to measure' : t === 'chart' ? '📊 Size chart' : '💡 Tips'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px 24px 24px' }}>
              {step === 'guide' && (
                <div>
                  <p style={{ color: '#7a3a6a', fontSize: '.88rem', marginTop: 0, marginBottom: 20, lineHeight: 1.6 }}>
                    Measure the <strong>widest part</strong> of each nail (not the tip). Press-on nails should cover the entire nail bed without touching skin.
                  </p>
                  {[
                    { n: '1', icon: '📏', title: 'Grab a ruler or tape measure', body: 'A millimeter ruler works best. In a pinch, print our sizing template at 100% scale.' },
                    { n: '2', icon: '👆', title: 'Measure the widest point', body: 'Lay your finger flat. Measure straight across the widest part of your nail bed — not the cuticle, not the tip.' },
                    { n: '3', icon: '📝', title: 'Write down all 10 nails', body: 'Each finger is usually a different size. Most sets come with multiple widths — match each finger to the closest nail.' },
                    { n: '4', icon: '🔁', title: 'When between sizes, go larger', body: 'A slightly wider nail can be filed down. A nail that\'s too narrow will pop off sooner.' },
                  ].map(step => (
                    <div key={step.n} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#fce4f5,#fde8e8)', display: 'grid', placeItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{step.icon}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: 3, color: '#2d1a2e' }}>{step.title}</div>
                        <div style={{ fontSize: '.83rem', color: '#7a3a6a', lineHeight: 1.55 }}>{step.body}</div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setStep('chart')} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#c45990', color: '#fff', border: 'none', fontWeight: 800, fontSize: '.9rem', cursor: 'pointer', marginTop: 8 }}>
                    View size chart →
                  </button>
                </div>
              )}

              {step === 'chart' && (
                <div>
                  <p style={{ color: '#7a3a6a', fontSize: '.85rem', marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
                    Sizes vary slightly by vendor — when in doubt, check the vendor&apos;s listing notes.
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.87rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f0e0eb' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px 10px 0', color: '#9a4a7a', fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Size</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px 10px', color: '#9a4a7a', fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Nail width</th>
                        <th style={{ textAlign: 'left', padding: '8px 0 10px 10px', color: '#9a4a7a', fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Numeric equiv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SIZE_CHART.map(row => (
                        <tr key={row.size} style={{ borderBottom: '1px solid #f8f0f8' }}>
                          <td style={{ padding: '10px 10px 10px 0' }}>
                            <span style={{ fontWeight: 800, background: row.thumb ? '#fde8e8' : '#fce4f5', color: '#c45990', padding: '3px 10px', borderRadius: 8, fontSize: '.85rem' }}>{row.size}</span>
                          </td>
                          <td style={{ padding: '10px', color: '#2d1a2e', fontWeight: 600 }}>{row.width}</td>
                          <td style={{ padding: '10px 0 10px 10px', color: '#7a3a6a' }}>{row.numeric}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 18, padding: 14, background: '#fef9ff', borderRadius: 12, border: '1px solid #f0e0eb', fontSize: '.82rem', color: '#7a3a6a', lineHeight: 1.6 }}>
                    <strong>💡 Pro tip:</strong> Most sets include 2 nails per size so you can match both hands. If you order a full kit (usually 10+ nails), you&apos;ll get coverage for every finger.
                  </div>
                </div>
              )}

              {step === 'tips' && (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: '.88rem', marginBottom: 12, color: '#2d1a2e' }}>Typical sizes by finger</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {FINGER_TIPS.map(f => (
                        <div key={f.finger} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fef9ff', borderRadius: 10, border: '1px solid #f0e0eb' }}>
                          <span style={{ fontWeight: 700, fontSize: '.87rem', color: '#2d1a2e' }}>{f.finger}</span>
                          <span style={{ fontSize: '.83rem', color: '#9a4a7a', fontWeight: 600 }}>{f.typical}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      { icon: '🛁', tip: 'Measure after washing your hands — fingers swell slightly when warm.' },
                      { icon: '📸', tip: 'Take a photo of your measurements so you can reference them for future orders.' },
                      { icon: '💅', tip: 'Coffin and stiletto shapes run slightly narrower than almond or square — size up if switching.' },
                      { icon: '🔧', tip: 'You can always file the sides of a press-on to narrow it. You can\'t make it wider!' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: '#fef9ff', borderRadius: 12, border: '1px solid #f0e0eb' }}>
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                        <span style={{ fontSize: '.84rem', color: '#5a2a5a', lineHeight: 1.6 }}>{item.tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
