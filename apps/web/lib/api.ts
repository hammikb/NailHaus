import { AdminOrder, AdminProduct, AdminStats, AdminUser, AdminVendorRow, AuthResponse, ImportResult, Order, PayoutSummary, Product, User, VendorDashboard, VendorDetail, VendorSummary, VerificationRequest } from './types';

const TOKEN_KEY = 'nh_tok';
const USER_KEY = 'nh_usr';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';

  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return 'http://localhost:3000';
}

const API_URL = `${getBaseUrl()}/api`;

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data as T;
}

export const authStorage = {
  readUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  save(auth: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const api = {
  getProducts(query?: Record<string, string | number | boolean | undefined>) {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<Product[]>(`/products${suffix}`);
  },
  getProduct(id: string) {
    return request<Product>(`/products/${id}`);
  },
  getVendors() {
    return request<VendorSummary[]>('/vendors');
  },
  getVendor(id: string) {
    return request<VendorDetail>(`/vendors/${id}`);
  },
  login(payload: { email: string; password: string }) {
    return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  },
  register(payload: { name: string; email: string; password: string }) {
    return request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },
  me() {
    return request<User>('/auth/me');
  },
  updateProfile(data: { name: string }) {
    return request<User>('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
  },
  logout() {
    return request<{ success: true }>('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  },
  vendorDashboard() {
    return request<VendorDashboard>('/vendors/me/dashboard');
  },
  createProduct(data: Record<string, unknown>) {
    return request<Product>('/products', { method: 'POST', body: JSON.stringify(data) });
  },
  updateProduct(id: string, data: Record<string, unknown>) {
    return request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteProduct(id: string) {
    return request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' });
  },
  importProducts(products: Record<string, unknown>[]) {
    return request<ImportResult>('/products/import', { method: 'POST', body: JSON.stringify({ products }) });
  },
  getPayouts() {
    return request<PayoutSummary>('/vendors/me/payouts');
  },
  getRevenueTrend() {
    return request<Array<{ label: string; rev: number }>>('/vendors/me/revenue-trend');
  },
  getAnalytics() {
    return request<Array<{ productId: string; name: string; emoji: string; bgColor: string; imageUrl: string | null; orders: number; units: number; revenue: number }>>('/vendors/me/analytics');
  },
  updateVendorProfile(data: Record<string, unknown>) {
    return request<VendorDetail>('/vendors/me', { method: 'PUT', body: JSON.stringify(data) });
  },
  // Reviews
  submitReview(data: { productId: string; rating: number; title?: string; body: string }) {
    return request<{ id: string }>('/reviews', { method: 'POST', body: JSON.stringify(data) });
  },
  // Wishlist
  getWishlist() {
    return request<{ productId: string }[]>('/wishlist');
  },
  addToWishlist(productId: string) {
    return request<{ productId: string }>('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
  },
  removeFromWishlist(productId: string) {
    return request<{ success: boolean }>(`/wishlist/${productId}`, { method: 'DELETE' });
  },
  // Orders
  getMyOrders() {
    return request<Order[]>('/orders/my');
  },
  checkout(items: { productId: string; qty: number; size?: string }[], shippingAddress: Record<string, string> = {}) {
    return request<Order>('/orders', { method: 'POST', body: JSON.stringify({ items, shippingAddress }) });
  },
  createStripeSession(items: { productId: string; qty: number; size?: string }[]) {
    return request<{ url: string }>('/checkout/stripe', { method: 'POST', body: JSON.stringify({ items }) });
  },
  // Admin
  getAdminStats() {
    return request<AdminStats>('/admin/stats');
  },
  getAdminUsers(search = '', role = '') {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<AdminUser[]>(`/admin/users${suffix}`);
  },
  toggleUserDisabled(id: string, disabled: boolean) {
    return request<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ disabled }) });
  },
  getVerificationRequests(status: 'pending' | 'all' = 'pending') {
    return request<VerificationRequest[]>(`/admin/verification-requests?status=${status}`);
  },
  reviewVerification(id: string, status: 'approved' | 'rejected', adminNote = '') {
    return request<VerificationRequest>(`/admin/verification-requests/${id}`, { method: 'PUT', body: JSON.stringify({ status, adminNote }) });
  },
  getAdminProducts(search = '', hidden = '') {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (hidden) params.set('hidden', hidden);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<AdminProduct[]>(`/admin/products${suffix}`);
  },
  toggleProductHidden(id: string, hidden: boolean) {
    return request<{ success: boolean }>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify({ hidden }) });
  },
  adminDeleteProduct(id: string) {
    return request<{ success: boolean }>(`/admin/products/${id}`, { method: 'DELETE' });
  },
  getAdminOrders(status = '') {
    const suffix = status ? `?status=${status}` : '';
    return request<AdminOrder[]>(`/admin/orders${suffix}`);
  },
  getAdminVendors(search = '', verified = '') {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (verified) params.set('verified', verified);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<AdminVendorRow[]>(`/admin/vendors${suffix}`);
  },
  toggleVendorVerified(id: string, verified: boolean) {
    return request<{ success: boolean }>(`/admin/vendors/${id}`, { method: 'PUT', body: JSON.stringify({ verified }) });
  },
};
