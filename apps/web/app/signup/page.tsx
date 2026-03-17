import Link from 'next/link';
import { SignupForm } from './SignupForm';

export default function SignupPage() {
  return (
    <main className="auth-page">
      <div className="auth-split">
        {/* Decorative panel */}
        <div className="auth-deco">
          <div className="auth-deco-content">
            <div className="auth-deco-logo">Nail<em>Haus</em></div>
            <p className="auth-deco-tagline">Join thousands of nail lovers and independent artists.</p>
            <div className="auth-tiles">
              <div className="auth-tile" style={{ background: '#fce4ec' }}>💅</div>
              <div className="auth-tile" style={{ background: '#e8f5e9' }}>🌸</div>
              <div className="auth-tile" style={{ background: '#e3f2fd' }}>✨</div>
              <div className="auth-tile" style={{ background: '#fff9c4' }}>🎀</div>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="auth-trust-row"><span>🎨</span> Support indie nail artists directly</div>
              <div className="auth-trust-row"><span>💌</span> Early access to new drops</div>
              <div className="auth-trust-row"><span>💌</span> Exclusive drops &amp; early access</div>
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Free forever for buyers</p>
            <h1 className="auth-title">Join <em>NailHaus</em></h1>
            <p className="subtle" style={{ marginBottom: 28 }}>Create your account in seconds. No credit card needed.</p>
            <SignupForm />
            <p className="muted" style={{ marginTop: 20, fontSize: '.88rem', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
