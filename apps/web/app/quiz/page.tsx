'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
  {
    id: 'occasion',
    question: "What's the vibe?",
    subtitle: 'Pick the occasion that fits best.',
    options: [
      { label: 'Everyday', emoji: '☀️', value: 'everyday' },
      { label: 'Party', emoji: '🎉', value: 'party' },
      { label: 'Wedding', emoji: '💍', value: 'wedding' },
      { label: 'Work', emoji: '💼', value: 'work' },
      { label: 'Festival', emoji: '🎪', value: 'festival' },
      { label: 'Holiday', emoji: '🎄', value: 'holiday' },
    ],
  },
  {
    id: 'shape',
    question: 'Your favourite nail shape?',
    subtitle: 'Pick what feels most you.',
    options: [
      { label: 'Almond', emoji: '🌸', value: 'almond' },
      { label: 'Coffin', emoji: '💜', value: 'coffin' },
      { label: 'Stiletto', emoji: '🖤', value: 'stiletto' },
      { label: 'Square', emoji: '⬜', value: 'square' },
      { label: 'Round', emoji: '⭕', value: 'round' },
    ],
  },
  {
    id: 'style',
    question: 'What\'s your aesthetic?',
    subtitle: 'Choose the style that speaks to you.',
    options: [
      { label: 'Floral', emoji: '🌺', value: 'floral' },
      { label: 'Glam', emoji: '✨', value: 'glam' },
      { label: 'Minimal', emoji: '🤍', value: 'minimal' },
      { label: 'Cute', emoji: '🎀', value: 'cute' },
    ],
  },
  {
    id: 'budget',
    question: "What's your budget?",
    subtitle: 'We\'ll find the best sets in your range.',
    options: [
      { label: 'Under $20', emoji: '💰', value: '0-20' },
      { label: '$20–$40', emoji: '💳', value: '20-40' },
      { label: '$40–$60', emoji: '💎', value: '40-60' },
      { label: 'Splurge!', emoji: '🛍️', value: '60-' },
    ],
  },
];

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState('');

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step) / STEPS.length) * 100;

  function pickOption(value: string) {
    setSelected(value);
  }

  function next() {
    if (!selected) return;
    const newAnswers = { ...answers, [current.id]: selected };
    setAnswers(newAnswers);
    setSelected('');

    if (isLast) {
      // Build shop URL from answers
      const params = new URLSearchParams();
      if (newAnswers.shape) params.set('shape', newAnswers.shape);
      if (newAnswers.style) params.set('style', newAnswers.style);
      if (newAnswers.occasion) params.set('occasion', newAnswers.occasion);
      if (newAnswers.budget) {
        const [min, max] = newAnswers.budget.split('-');
        if (min) params.set('minPrice', min);
        if (max) params.set('maxPrice', max);
      }
      router.push(`/shop?${params.toString()}`);
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <main className="page-shell">
      <div className="container" style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, marginBottom: 40, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress + (100 / STEPS.length)}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--accent-dark))',
            borderRadius: 999,
            transition: 'width .4s ease',
          }} />
        </div>

        <div className="panel" style={{ padding: '48px 40px', textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Step {step + 1} of {STEPS.length}</p>
          <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: 8 }}>
            {current.question}
          </h1>
          <p className="subtle" style={{ marginBottom: 36 }}>{current.subtitle}</p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 36,
          }}>
            {current.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => pickOption(opt.value)}
                style={{
                  padding: '22px 12px',
                  borderRadius: 18,
                  border: selected === opt.value ? '2.5px solid var(--accent)' : '1.5px solid var(--border)',
                  background: selected === opt.value ? 'var(--accent-light)' : 'var(--surface-2)',
                  cursor: 'pointer',
                  transition: 'all .18s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  transform: selected === opt.value ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: selected === opt.value ? 'var(--shadow-accent)' : 'none',
                }}
              >
                <span style={{ fontSize: '2rem' }}>{opt.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{opt.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {step > 0 && (
              <button
                className="pill btn-ghost"
                onClick={() => { setStep(s => s - 1); setSelected(answers[STEPS[step - 1].id] || ''); }}
              >
                ← Back
              </button>
            )}
            <button
              className="pill btn-primary"
              onClick={next}
              disabled={!selected}
              style={{ minWidth: 160, justifyContent: 'center' }}
            >
              {isLast ? '💅 Show my matches' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
