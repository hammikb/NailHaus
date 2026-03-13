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

export interface VendorDetail extends VendorSummary {
  description?: string;
  socialLinks?: Record<string, string>;
  announcement?: string;
  collections?: { id: string; name: string; description?: string }[];
  products?: Product[];
  reviews?: Review[];
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
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  pendingVerifications: number;
  totalRevenue: number;
}

export interface AdminUser {
  id: string;
  name: string;
  role: string;
  disabled: boolean;
  created_at: string;
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
