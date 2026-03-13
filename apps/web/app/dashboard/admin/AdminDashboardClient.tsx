'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { AdminStats, AdminUser, VerificationRequest } from '@/lib/types';

type Tab = 'overview' | 'verifications' | 'users';

export function AdminDashboardClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [verifFilter, setVerifFilter] = useState<'pending' | 'all'>('pending');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/');
  }, [user, loading, router]);

  const loadStats = useCallback(() => {
    api.getAdminStats().then(setStats).catch(() => {});
  }, []);

  const loadVerifications = useCallback((filter: 'pending' | 'all') => {
    api.getVerificationRequests(filter).then(setVerifications).catch(() => setVerifications([]));
  }, []);

  const loadUsers = useCallback((search: string, role: string) => {
    api.getAdminUsers(search, role).then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (tab === 'verifications') loadVerifications(verifFilter);
    if (tab === 'users') loadUsers(userSearch, userRoleFilter);
  }, [tab, verifFilter, userSearch, userRoleFilter, loadVerifications, loadUsers]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleVerification(id: string, status: 'approved' | 'rejected', note = '') {
    setBusy(true);
    try {
      await api.reviewVerification(id, status, note);
      showToast(status === 'approved' ? '✓ Vendor approved and verified!' : 'Request rejected.');
      loadVerifications(verifFilter);
      loadStats();
    } catch {
      showToast('Action failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleUser(u: AdminUser) {
    setBusy(true);
    try {
      await api.toggleUserDisabled(u.id, !u.disabled);
      showToast(u.disabled ? `${u.name} re-enabled.` : `${u.name} disabled.`);
      loadUsers(userSearch, userRoleFilter);
    } catch {
      showToast('Failed to update user.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;
  if (user.role !== 'admin') return null;

  return (
    <main className="page-shell">
      <div className="container">
        {/* Toast */}
        {toast && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div>
        )}

        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow">Admin</p>
          <h1 className="section-title">Platform <em>dashboard</em></h1>
        </div>

        {/* Tab nav */}
        <div className="tab-nav">
          {(['overview', 'verifications', 'users'] as Tab[]).map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? '📊 Overview' : t === 'verifications' ? `✓ Verifications${stats?.pendingVerifications ? ` (${stats.pendingVerifications})` : ''}` : '👥 Users'}
            </button>
          ))}
        </div>

        {/* ─── Overview ─── */}
        {tab === 'overview' && (
          <>
            {stats ? (
              <div className="dashboard-grid">
                <div className="panel kpi kpi-accent">
                  <span className="kpi-icon">💰</span>
                  <strong>${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
                  <span className="kpi-label">Total revenue</span>
                </div>
                <div className="panel kpi">
                  <span className="kpi-icon">📦</span>
                  <strong>{stats.totalOrders.toLocaleString()}</strong>
                  <span className="kpi-label">Total orders</span>
                </div>
                <div className="panel kpi">
                  <span className="kpi-icon">🛍️</span>
                  <strong>{stats.totalProducts.toLocaleString()}</strong>
                  <span className="kpi-label">Active listings</span>
                </div>
                <div className="panel kpi">
                  <span className="kpi-icon">🎨</span>
                  <strong>{stats.totalVendors.toLocaleString()}</strong>
                  <span className="kpi-label">Vendors</span>
                </div>
                <div className="panel kpi">
                  <span className="kpi-icon">👤</span>
                  <strong>{stats.totalUsers.toLocaleString()}</strong>
                  <span className="kpi-label">Users</span>
                </div>
                {stats.pendingVerifications > 0 && (
                  <div className="panel kpi" style={{ border: '1.5px solid #fcd34d', background: 'var(--warning-bg)' }}>
                    <span className="kpi-icon">⏳</span>
                    <strong>{stats.pendingVerifications}</strong>
                    <span className="kpi-label" style={{ color: 'var(--warning)' }}>Pending verif.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="dashboard-grid">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="panel kpi">
                    <div className="shimmer" style={{ height: 36, marginBottom: 8 }} />
                    <div className="shimmer" style={{ height: 12, width: '60%' }} />
                  </div>
                ))}
              </div>
            )}

            {stats?.pendingVerifications ? (
              <div className="alert alert-warn" style={{ marginTop: 8 }}>
                ⚠️ <strong>{stats.pendingVerifications}</strong> vendor verification request{stats.pendingVerifications > 1 ? 's' : ''} awaiting review.
                <button className="pill btn-sm" style={{ marginLeft: 16, background: 'white' }} onClick={() => setTab('verifications')}>Review now →</button>
              </div>
            ) : null}
          </>
        )}

        {/* ─── Verifications ─── */}
        {tab === 'verifications' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['pending', 'all'] as const).map(f => (
                <button key={f} className={`filter-pill${verifFilter === f ? ' active' : ''}`} onClick={() => setVerifFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {verifications.length === 0 ? (
              <div className="panel empty-state">
                <span className="empty-icon">✓</span>
                <p>{verifFilter === 'pending' ? 'No pending verification requests.' : 'No verification requests found.'}</p>
              </div>
            ) : (
              <div className="list">
                {verifications.map(req => (
                  <div key={req.id} className="panel list-item" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center',
                        fontSize: '1.6rem', background: req.vendors?.bg_color || '#fde8e8', flexShrink: 0,
                      }}>
                        {req.vendors?.emoji || '💅'}
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{req.vendors?.name || 'Unknown vendor'}</div>
                        <div className="muted" style={{ fontSize: '.82rem', marginBottom: 8 }}>
                          From: {req.profiles?.name || 'Unknown'} · {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {req.message && <p className="subtle" style={{ margin: '0 0 10px', fontSize: '.88rem', lineHeight: 1.6 }}>{req.message}</p>}
                        {req.links && req.links.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {req.links.map((link, i) => (
                              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="social-link" style={{ fontSize: '.78rem', padding: '4px 12px' }}>
                                🔗 Link {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                        {req.admin_note && (
                          <div className="muted" style={{ fontSize: '.8rem', marginTop: 8, fontStyle: 'italic' }}>Admin note: {req.admin_note}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        {req.status === 'pending' ? (
                          <>
                            <button
                              className="pill btn-sm"
                              style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: '#86efac' }}
                              disabled={busy}
                              onClick={() => handleVerification(req.id, 'approved')}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="pill btn-danger btn-sm"
                              disabled={busy}
                              onClick={() => handleVerification(req.id, 'rejected')}
                            >
                              ✕ Reject
                            </button>
                          </>
                        ) : (
                          <span className={`chip ${req.status === 'approved' ? 'chip-success' : 'chip-danger'}`}>
                            {req.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Users ─── */}
        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div className="filter-search-wrap" style={{ flex: 1, minWidth: 200 }}>
                <span className="filter-search-icon">🔍</span>
                <input
                  className="filter-search"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['', 'buyer', 'vendor', 'admin'].map(r => (
                  <button key={r} className={`filter-pill${userRoleFilter === r ? ' active' : ''}`} onClick={() => setUserRoleFilter(r)}>
                    {r || 'All'}
                  </button>
                ))}
              </div>
            </div>

            {users.length === 0 ? (
              <div className="panel empty-state">
                <span className="empty-icon">👤</span>
                <p>No users found.</p>
              </div>
            ) : (
              <div className="panel" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>
                          <span className="chip" style={{
                            background: u.role === 'admin' ? 'var(--accent-light)' : u.role === 'vendor' ? 'var(--info-bg)' : 'var(--surface-2)',
                            color: u.role === 'admin' ? 'var(--accent)' : u.role === 'vendor' ? 'var(--info)' : 'var(--muted)',
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td className="muted" style={{ fontSize: '.82rem' }}>
                          {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          {u.disabled ? (
                            <span className="chip" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>Disabled</span>
                          ) : (
                            <span className="chip" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Active</span>
                          )}
                        </td>
                        <td>
                          {u.id !== user.id && (
                            <button
                              className={`pill btn-sm ${u.disabled ? '' : 'btn-danger'}`}
                              style={u.disabled ? { background: 'var(--success-bg)', color: 'var(--success)', borderColor: '#86efac' } : {}}
                              disabled={busy}
                              onClick={() => handleToggleUser(u)}
                            >
                              {u.disabled ? 'Re-enable' : 'Disable'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
