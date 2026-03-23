'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { AdminOrder, AdminProduct, AdminStats, AdminUser, AdminVendorRow, UserRole, VerificationRequest } from '@/lib/types';

type Tab = 'overview' | 'verifications' | 'users' | 'vendors' | 'products' | 'orders';
type StatusFilter = '' | 'active' | 'disabled';

const TABS: Tab[] = ['overview', 'verifications', 'users', 'vendors', 'products', 'orders'];

function roleLabel(role: string) {
  return role === 'buyer' ? 'Normal User' : role === 'vendor' ? 'Vendor' : 'Admin';
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function AdminDashboardClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vendors, setVendors] = useState<AdminVendorRow[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const [verifFilter, setVerifFilter] = useState<'pending' | 'all'>('pending');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<StatusFilter>('');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorVerifiedFilter, setVendorVerifiedFilter] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productHiddenFilter, setProductHiddenFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3200);
  }, []);

  const loadStats = useCallback(() => {
    api.getAdminStats().then(setStats).catch(() => {});
  }, []);

  const loadUsers = useCallback(() => {
    api.getAdminUsers(userSearch, userRoleFilter, userStatusFilter).then((rows) => {
      setUsers(rows);
      setRoleDrafts(Object.fromEntries(rows.map((row) => [row.id, row.role as UserRole])));
    }).catch(() => setUsers([]));
  }, [userSearch, userRoleFilter, userStatusFilter]);

  const refreshCurrentTab = useCallback(() => {
    if (tab === 'verifications') api.getVerificationRequests(verifFilter).then(setVerifications).catch(() => setVerifications([]));
    if (tab === 'users') loadUsers();
    if (tab === 'vendors') api.getAdminVendors(vendorSearch, vendorVerifiedFilter).then(setVendors).catch(() => setVendors([]));
    if (tab === 'products') api.getAdminProducts(productSearch, productHiddenFilter).then(setProducts).catch(() => setProducts([]));
    if (tab === 'orders') api.getAdminOrders(orderStatusFilter).then(setOrders).catch(() => setOrders([]));
  }, [tab, verifFilter, loadUsers, vendorSearch, vendorVerifiedFilter, productSearch, productHiddenFilter, orderStatusFilter]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { refreshCurrentTab(); }, [refreshCurrentTab]);

  const pendingRoleChanges = useMemo(
    () => users.filter((account) => roleDrafts[account.id] && roleDrafts[account.id] !== account.role),
    [users, roleDrafts]
  );

  async function updateUserRole(account: AdminUser) {
    const role = roleDrafts[account.id];
    if (!role || role === account.role) return;
    setBusy(true);
    try {
      const updated = await api.updateAdminUser(account.id, { role });
      setUsers((current) => current.map((row) => row.id === updated.id ? updated : row));
      setRoleDrafts((current) => ({ ...current, [updated.id]: updated.role as UserRole }));
      showToast(role === 'vendor' ? `${updated.name} promoted to vendor.` : role === 'buyer' ? `${updated.name} changed to normal user.` : `${updated.name} promoted to admin.`);
      loadStats();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update role.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleUserDisabled(account: AdminUser) {
    setBusy(true);
    try {
      const updated = await api.updateAdminUser(account.id, { disabled: !account.disabled });
      setUsers((current) => current.map((row) => row.id === updated.id ? updated : row));
      showToast(updated.disabled ? `${updated.name} disabled.` : `${updated.name} re-enabled.`);
      loadStats();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update user.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <main className="page-shell">
      <div className="container">
        {toast ? <div className="alert alert-success" style={{ marginBottom: 16 }}>{toast}</div> : null}

        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="section-title">Platform <em>dashboard</em></h1>
          </div>
          <span className="chip">{user.name} · {user.email}</span>
        </div>

        <div className="tab-nav">
          {TABS.map((item) => <button key={item} className={`tab-btn${tab === item ? ' active' : ''}`} onClick={() => setTab(item)}>{item === 'verifications' && stats?.pendingVerifications ? `Verifications (${stats.pendingVerifications})` : item.charAt(0).toUpperCase() + item.slice(1)}</button>)}
        </div>

        {tab === 'overview' && stats && (
          <>
            <div className="grid" style={{ gridTemplateColumns: '1.2fr .9fr', gap: 18, marginBottom: 18 }}>
              <div className="panel" style={{ padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 8 }}>Admin profile</div>
                <p className="muted" style={{ marginTop: 0 }}>This dashboard now supports real user role management, vendor promotion, and richer marketplace reporting.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
                  <div className="panel" style={{ padding: 16, boxShadow: 'none' }}><div className="muted" style={{ fontSize: '.74rem', fontWeight: 800 }}>Role</div><div style={{ fontWeight: 800 }}>Admin</div></div>
                  <div className="panel" style={{ padding: 16, boxShadow: 'none' }}><div className="muted" style={{ fontSize: '.74rem', fontWeight: 800 }}>Pending vendor reviews</div><div style={{ fontWeight: 800 }}>{stats.pendingVerifications}</div></div>
                  <div className="panel" style={{ padding: 16, boxShadow: 'none' }}><div className="muted" style={{ fontSize: '.74rem', fontWeight: 800 }}>Disabled accounts</div><div style={{ fontWeight: 800 }}>{stats.disabledUsers}</div></div>
                </div>
              </div>
              <div className="panel" style={{ padding: 24 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 10 }}>Quick actions</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="pill btn-sm btn-ghost" onClick={() => setTab('users')}>Manage users</button>
                  <button className="pill btn-sm btn-ghost" onClick={() => setTab('vendors')}>Manage vendors</button>
                  <button className="pill btn-sm btn-ghost" onClick={() => setTab('verifications')}>Review verifications</button>
                </div>
              </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: 18 }}>
              <div className="panel kpi kpi-accent"><strong>{money(stats.totalRevenue)}</strong><span className="kpi-label">Revenue</span></div>
              <div className="panel kpi"><strong>{stats.totalOrders}</strong><span className="kpi-label">Orders</span></div>
              <div className="panel kpi"><strong>{stats.totalProducts}</strong><span className="kpi-label">Products</span></div>
              <div className="panel kpi"><strong>{stats.totalVendors}</strong><span className="kpi-label">Vendors</span></div>
              <div className="panel kpi"><strong>{stats.totalNormalUsers}</strong><span className="kpi-label">Normal users</span></div>
              <div className="panel kpi"><strong>{stats.totalAdmins}</strong><span className="kpi-label">Admins</span></div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div className="panel" style={{ padding: 22 }}>
                <div className="between" style={{ marginBottom: 12 }}><strong>Recent signups</strong><button className="pill btn-sm btn-ghost" onClick={() => setTab('users')}>Open users</button></div>
                {stats.recentUsers.map((account) => <div key={account.id} className="list-item"><div className="between"><strong>{account.name}</strong><span className="chip">{roleLabel(account.role)}</span></div><div className="muted" style={{ fontSize: '.8rem', marginTop: 4 }}>{shortDate(account.createdAt)}</div></div>)}
              </div>
              <div className="panel" style={{ padding: 22 }}>
                <div className="between" style={{ marginBottom: 12 }}><strong>Recent orders</strong><button className="pill btn-sm btn-ghost" onClick={() => setTab('orders')}>Open orders</button></div>
                {stats.recentOrders.map((order) => <div key={order.id} className="list-item"><div className="between"><strong>{order.buyerName}</strong><span style={{ fontWeight: 800 }}>{money(order.total)}</span></div><div className="muted" style={{ fontSize: '.8rem', marginTop: 4 }}>{order.status} · {shortDate(order.createdAt)}</div></div>)}
              </div>
            </div>
          </>
        )}

        {tab === 'verifications' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}><button className={`filter-pill${verifFilter === 'pending' ? ' active' : ''}`} onClick={() => setVerifFilter('pending')}>Pending</button><button className={`filter-pill${verifFilter === 'all' ? ' active' : ''}`} onClick={() => setVerifFilter('all')}>All</button></div>
            {!verifications.length ? <div className="panel empty-state"><p>No verification requests found.</p></div> : verifications.map((request) => <div key={request.id} className="panel list-item" style={{ padding: 24 }}><div className="between"><div><strong>{request.vendors?.name || 'Unknown vendor'}</strong><div className="muted" style={{ fontSize: '.82rem', marginTop: 4 }}>Submitted by {request.profiles?.name || 'Unknown'} · {shortDate(request.created_at)}</div></div>{request.status === 'pending' ? <div style={{ display: 'flex', gap: 8 }}><button className="pill btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: '#86efac' }} disabled={busy} onClick={async () => { setBusy(true); try { await api.reviewVerification(request.id, 'approved'); showToast('Vendor approved.'); refreshCurrentTab(); loadStats(); } finally { setBusy(false); } }}>Approve</button><button className="pill btn-sm btn-danger" disabled={busy} onClick={async () => { setBusy(true); try { await api.reviewVerification(request.id, 'rejected'); showToast('Request rejected.'); refreshCurrentTab(); loadStats(); } finally { setBusy(false); } }}>Reject</button></div> : <span className="chip">{request.status}</span>}</div>{request.message ? <p className="subtle" style={{ marginBottom: 0 }}>{request.message}</p> : null}</div>)}
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div className="panel kpi"><strong>{stats?.totalNormalUsers ?? 0}</strong><span className="kpi-label">Normal users</span></div>
              <div className="panel kpi"><strong>{stats?.totalVendors ?? 0}</strong><span className="kpi-label">Vendors</span></div>
              <div className="panel kpi"><strong>{stats?.totalAdmins ?? 0}</strong><span className="kpi-label">Admins</span></div>
              <div className="panel kpi"><strong>{stats?.disabledUsers ?? 0}</strong><span className="kpi-label">Disabled</span></div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div className="filter-search-wrap" style={{ flex: 1, minWidth: 240 }}><span className="filter-search-icon">?</span><input className="filter-search" placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
              {[['', 'All'], ['buyer', 'Normal'], ['vendor', 'Vendors'], ['admin', 'Admins']].map(([value, label]) => <button key={value} className={`filter-pill${userRoleFilter === value ? ' active' : ''}`} onClick={() => setUserRoleFilter(value)}>{label}</button>)}
              {[['', 'Any'], ['active', 'Active'], ['disabled', 'Disabled']].map(([value, label]) => <button key={value} className={`filter-pill${userStatusFilter === value ? ' active' : ''}`} onClick={() => setUserStatusFilter(value as StatusFilter)}>{label}</button>)}
            </div>

            {pendingRoleChanges.length ? <div className="alert alert-warn" style={{ marginBottom: 16 }}>{pendingRoleChanges.length} unsaved role change{pendingRoleChanges.length !== 1 ? 's' : ''} in this view.</div> : null}
            {!users.length ? <div className="panel empty-state"><p>No users found.</p></div> : (
              <div className="panel" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead><tr><th>User</th><th>Category</th><th>Vendor profile</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map((account) => {
                      const isSelf = account.id === user.id;
                      const draftRole = roleDrafts[account.id] || (account.role as UserRole);
                      return (
                        <tr key={account.id}>
                          <td><div style={{ fontWeight: 700 }}>{account.name}</div><div className="muted" style={{ fontSize: '.8rem' }}>{account.email || 'No email available'}</div></td>
                          <td><div style={{ display: 'grid', gap: 8 }}><span className="chip">{roleLabel(account.role)}</span><select className="field-input" style={{ minWidth: 150, padding: '8px 10px' }} value={draftRole} disabled={busy || isSelf} onChange={(e) => setRoleDrafts((current) => ({ ...current, [account.id]: e.target.value as UserRole }))}><option value="buyer">Normal User</option><option value="vendor">Vendor</option><option value="admin">Admin</option></select></div></td>
                          <td>{account.hasVendorProfile ? <div><div style={{ fontWeight: 700 }}>{account.vendorName || 'Vendor profile'}</div><div className="muted" style={{ fontSize: '.8rem' }}>{account.vendorVerified ? 'Verified' : 'Unverified'} · {account.totalProducts} products · {account.totalSales} sales</div></div> : <span className="muted" style={{ fontSize: '.85rem' }}>No vendor profile</span>}</td>
                          <td className="muted" style={{ fontSize: '.82rem' }}>{shortDate(account.created_at)}</td>
                          <td><span className="chip" style={{ background: account.disabled ? 'var(--danger-bg)' : 'var(--success-bg)', color: account.disabled ? 'var(--danger)' : 'var(--success)' }}>{account.disabled ? 'Disabled' : 'Active'}</span></td>
                          <td><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className={`pill btn-sm ${account.disabled ? '' : 'btn-danger'}`} style={account.disabled ? { background: 'var(--success-bg)', color: 'var(--success)', borderColor: '#86efac' } : {}} disabled={busy || isSelf} onClick={() => toggleUserDisabled(account)}>{account.disabled ? 'Re-enable' : 'Disable'}</button><button className="pill btn-sm btn-ghost" disabled={busy || isSelf || draftRole === account.role} onClick={() => updateUserRole(account)}>Save role</button></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'vendors' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div className="filter-search-wrap" style={{ flex: 1, minWidth: 240 }}><span className="filter-search-icon">?</span><input className="filter-search" placeholder="Search vendors..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} /></div>
              {[['', 'All'], ['true', 'Verified'], ['false', 'Unverified']].map(([value, label]) => <button key={value} className={`filter-pill${vendorVerifiedFilter === value ? ' active' : ''}`} onClick={() => setVendorVerifiedFilter(value)}>{label}</button>)}
            </div>
            {!vendors.length ? <div className="panel empty-state"><p>No vendors found.</p></div> : <div className="panel" style={{ overflow: 'hidden' }}><table className="data-table"><thead><tr><th>Vendor</th><th>Products</th><th>Sales</th><th>Rating</th><th>Status</th><th>Action</th></tr></thead><tbody>{vendors.map((vendor) => <tr key={vendor.id}><td><strong>{vendor.name}</strong></td><td>{vendor.totalProducts ?? 0}</td><td>{vendor.totalSales ?? 0}</td><td>{vendor.rating ? Number(vendor.rating).toFixed(1) : '-'}</td><td><span className="chip">{vendor.verified ? 'Verified' : 'Unverified'}</span></td><td><button className="pill btn-sm btn-ghost" disabled={busy} onClick={async () => { setBusy(true); try { await api.toggleVendorVerified(vendor.id, !vendor.verified); showToast(vendor.verified ? 'Vendor verification removed.' : 'Vendor verified.'); refreshCurrentTab(); loadStats(); } finally { setBusy(false); } }}>{vendor.verified ? 'Remove verified' : 'Verify vendor'}</button></td></tr>)}</tbody></table></div>}
          </>
        )}

        {tab === 'products' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div className="filter-search-wrap" style={{ flex: 1, minWidth: 240 }}><span className="filter-search-icon">?</span><input className="filter-search" placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>
              {[['', 'All'], ['false', 'Visible'], ['true', 'Hidden']].map(([value, label]) => <button key={value} className={`filter-pill${productHiddenFilter === value ? ' active' : ''}`} onClick={() => setProductHiddenFilter(value)}>{label}</button>)}
            </div>
            {!products.length ? <div className="panel empty-state"><p>No products found.</p></div> : <div className="panel" style={{ overflow: 'hidden' }}><table className="data-table"><thead><tr><th>Product</th><th>Vendor</th><th>Price</th><th>Reviews</th><th>Status</th><th>Action</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} style={{ opacity: product.hidden ? 0.55 : 1 }}><td><strong>{product.name}</strong></td><td>{product.vendorName ?? '-'}</td><td>${Number(product.price).toFixed(2)}</td><td>{product.reviewCount ?? 0}</td><td><span className="chip">{product.hidden ? 'Hidden' : 'Visible'}</span></td><td><button className="pill btn-sm btn-ghost" disabled={busy} onClick={async () => { setBusy(true); try { await api.toggleProductHidden(product.id, !product.hidden); showToast(product.hidden ? 'Product is now visible.' : 'Product hidden from shop.'); refreshCurrentTab(); loadStats(); } finally { setBusy(false); } }}>{product.hidden ? 'Show' : 'Hide'}</button></td></tr>)}</tbody></table></div>}
          </>
        )}

        {tab === 'orders' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>{[['', 'All'], ['confirmed', 'Confirmed'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']].map(([value, label]) => <button key={value} className={`filter-pill${orderStatusFilter === value ? ' active' : ''}`} onClick={() => setOrderStatusFilter(value)}>{label}</button>)}</div>
            {!orders.length ? <div className="panel empty-state"><p>No orders found.</p></div> : <div className="panel" style={{ overflow: 'hidden' }}><div className="between" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}><span className="chip">{orders.length} orders</span><strong style={{ color: 'var(--accent)' }}>${orders.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2)} total</strong></div><table className="data-table"><thead><tr><th>Order ID</th><th>Buyer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{order.id.slice(0, 8).toUpperCase()}</td><td>{order.buyerName}</td><td>${Number(order.total).toFixed(2)}</td><td><span className="chip">{order.status}</span></td><td>{shortDate(order.createdAt)}</td></tr>)}</tbody></table></div>}
          </>
        )}
      </div>
    </main>
  );
}
