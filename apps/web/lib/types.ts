export type UserRole = 'buyer' | 'vendor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface VendorSummary {
  id: string;
  name: string;
  emoji: string;
  bgColor: string;
  tagline?: string;
  verified?: boolean;
  rating?: number;
  totalProducts?: number;
  totalSales?: number;
  createdAt?: string;
  bannerUrl?: string | null;
}

export interface PayoutWeek {
  weekOf: string;
  gross: number;
  fee: number;
  net: number;
}

export interface PayoutSummary {
  pendingGross: number;
  pendingNet: number;
  lifetimeNet: number;
  nextPayoutDate: string;
  feeRate: number;
  history: PayoutWeek[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; name: string; error: string }>;
  importedIds: string[];
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
  user?: { name: string };
  product?: { id: string; name: string } | null;
}

export interface Product {
  id: string;
  vendorId: string;
  vendor?: VendorSummary | null;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  emoji: string;
  bgColor: string;
  imageUrl?: string | null;
  images?: string[];
  shape: string;
  style: string;
  badge?: string | null;
  stock: number;
  tags?: string[];
  availability?: 'in_stock' | 'made_to_order';
  productionDays?: number | null;
  occasions?: string[];
  reviewCount: number;
  rating: number;
  createdAt: string;
  nailCount?: number | null;
  sizes?: string;
  sizeInventory?: Record<string, number>;
  finish?: string;
  glueIncluded?: boolean | null;
  reusable?: boolean | null;
  wearTime?: string;
  reviews?: Review[];
}

export interface ShippingRate {
  rateId: string;
  carrier: string;
  service: string;
  carrierCost: number;
  price: number;
  deliveryDays: number | null;
  deliveryDate: string | null;
}

export interface VendorDetail extends VendorSummary {
  description?: string;
  socialLinks?: Record<string, string>;
  announcement?: string;
  collections?: { id: string; name: string; description?: string }[];
  products?: Product[];
  reviews?: Review[];
  shipFromAddress?: { name?: string; street1?: string; street2?: string; city?: string; state?: string; zip?: string; country?: string } | null;
}

export interface VendorDashboard {
  vendor: VendorDetail;
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalReviews: number;
    avgRating: string;
    openShipments: number;
    labelsPurchased: number;
    shipped: number;
    delivered: number;
  };
  products: Product[];
  recentReviews: Review[];
  recentOrders: Array<{ id: string; createdAt: string; status: string; total: number }>;
  fulfillmentQueue: Array<{ id: string; createdAt: string; items: Array<{ qty: number; product?: { name: string } | null }> }>;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OrderItem {
  id: string;
  productId: string;
  vendorId: string;
  qty: number;
  price: number;
  products?: { id: string; name: string; emoji: string; bg_color: string } | null;
  vendors?: { id: string; name: string; emoji: string; bg_color: string } | null;
}

export interface Order {
  id: string;
  userId: string;
  total: number;
  originalTotal?: number;
  status: string;
  shippingAddress: Record<string, string>;
  createdAt: string;
  order_items?: OrderItem[];
}

export interface AdminStats {
  totalVendors: number;
  verifiedVendors: number;
  unverifiedVendors: number;
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalNormalUsers: number;
  totalAdmins: number;
  disabledUsers: number;
  pendingVerifications: number;
  totalRevenue: number;
  recentUsers: Array<{ id: string; name: string; role: string; createdAt: string }>;
  recentOrders: Array<{ id: string; buyerName: string; total: number; status: string; createdAt: string }>;
  recentAdminActions: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    note: string;
    createdAt: string;
  }>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  created_at: string;
  vendorId: string | null;
  vendorName: string | null;
  vendorVerified: boolean;
  totalProducts: number;
  totalSales: number;
  hasVendorProfile: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  emoji: string;
  bgColor: string;
  price: number;
  hidden: boolean;
  availability: string;
  reviewCount: number;
  rating: number;
  createdAt: string;
  vendorId: string;
  vendorName: string | null;
}

export interface AdminOrder {
  id: string;
  userId: string;
  buyerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface AdminVendorRow {
  id: string;
  name: string;
  emoji: string;
  bgColor: string;
  verified: boolean;
  totalSales: number;
  totalProducts: number;
  rating: number;
  createdAt: string;
  userId: string;
}

export interface VerificationRequest {
  id: string;
  vendor_id: string;
  user_id: string;
  message: string;
  links: string[];
  status: string;
  admin_note: string;
  created_at: string;
  updated_at: string;
  vendors?: { id: string; name: string; emoji: string; bg_color: string } | null;
  profiles?: { name: string } | null;
}
