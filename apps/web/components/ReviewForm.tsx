'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';

interface Props {
  productId: string;
}

export function ReviewForm({ productId }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;
  if (submitted) {
    return (
      <div className="panel" style={{ padding: 28, textAlign: 'center', marginTop: 32 }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎉</div>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Review submitted!</div>
        <div className="muted" style={{ fontSize: '.88rem' }}>Thank you for your feedback.</div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError('Please select a star rating'); return; }
    if (!body.trim()) { setError('Please write a review'); return; }

    setSubmitting(true);
    setError('');
    try {
      await api.submitReview({ productId, rating, title, body });
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit review';
      setError(msg.includes('403') || msg.toLowerCase().includes('buyer')
        ? 'Only verified buyers can review. Purchase this product first.'
        : msg.includes('already')
          ? 'You have already reviewed this product.'
          : msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section" style={{ marginTop: 32 }}>
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Share your experience</p>
          <h2 className="section-title">Leave a <em>review</em></h2>
        </div>
      </div>

      <div className="panel" style={{ padding: 28, maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {/* Star picker */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 10 }}>
              Rating *
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(star)}
                  style={{
                    fontSize: '2rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: star <= (hover || rating) ? '#f59e0b' : '#d1d5db',
                    transition: 'color .1s, transform .1s',
                    transform: star <= (hover || rating) ? 'scale(1.15)' : 'scale(1)',
                    padding: 2,
                    lineHeight: 1,
                  }}
                  aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 4 }}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Title (optional)
            </label>
            <input
              style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fafafa', fontSize: '.9rem', boxSizing: 'border-box' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Summarise your experience..."
              maxLength={120}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Review *
            </label>
            <textarea
              style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fafafa', fontSize: '.9rem', boxSizing: 'border-box', minHeight: 110, resize: 'vertical' }}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="How were the quality, fit, design?"
              maxLength={2000}
            />
            <div style={{ fontSize: '.73rem', color: 'var(--muted)', textAlign: 'right', marginTop: 3 }}>{body.length}/2000</div>
          </div>

          {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

          <button
            className="pill btn-primary"
            type="submit"
            disabled={submitting}
            style={{ minWidth: 160 }}
          >
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </form>
      </div>
    </section>
  );
}
