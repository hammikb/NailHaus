import Link from 'next/link';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-split">
        {/* Decorative panel */}
        <div className="auth-deco">
          <div className="auth-deco-content">
            <div className="auth-deco-logo">Nail<em>Haus</em></div>
            <p className="auth-deco-tagline">The home of independent press-on nail artists.</p>
            <div className="auth-tiles">
              <div className="auth-tile" style={{ background: '#fce4ec' }}>💅</div>
              <div className="auth-tile" style={{ background: '#e8f5e9' }}>🌸</div>
              <div className="auth-tile" style={{ background: '#e3f2fd' }}>✨</div>
              <div className="auth-tile" style={{ background: '#fff9c4' }}>🎀</div>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="auth-trust-row"><span>📦</span> Fast &amp; tracked shipping</div>
              <div className="auth-trust-row"><span>⭐</span> Verified independent artists</div>
              <div className="auth-trust-row"><span>✉️</span> Real-time shipment tracking</div>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Welcome back</p>
            <h1 className="auth-title">Sign in to <em>NailHaus</em></h1>
            <p className="subtle" style={{ marginBottom: 28 }}>Good to see you again. Enter your details below.</p>
            <LoginForm />
            <p className="muted" style={{ marginTop: 20, fontSize: '.88rem', textAlign: 'center' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
