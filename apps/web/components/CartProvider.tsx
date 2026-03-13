'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  emoji: string;
  bgColor: string;
  vendorId: string;
  vendorName?: string;
  size?: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQty: (productId: string, qty: number, size?: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_KEY = 'nh_cart';

function itemKey(productId: string, size?: string) {
  return `${productId}|${size || ''}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems(prev => {
      const key = itemKey(item.productId, item.size);
      const existing = prev.find(i => itemKey(i.productId, i.size) === key);
      const next = existing
        ? prev.map(i => itemKey(i.productId, i.size) === key ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { ...item, qty: 1 }];
      try { localStorage.setItem(CART_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, size?: string) => {
    setItems(prev => {
      const key = itemKey(productId, size);
      const next = prev.filter(i => itemKey(i.productId, i.size) !== key);
      try { localStorage.setItem(CART_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number, size?: string) => {
    if (qty < 1) return;
    setItems(prev => {
      const key = itemKey(productId, size);
      const next = prev.map(i => itemKey(i.productId, i.size) === key ? { ...i, qty } : i);
      try { localStorage.setItem(CART_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(CART_KEY); } catch {}
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.price * i.qty, 0),
    addItem,
    removeItem,
    updateQty,
    clear,
    open,
    setOpen,
  }), [items, addItem, removeItem, updateQty, clear, open]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
