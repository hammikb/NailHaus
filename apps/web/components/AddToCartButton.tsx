'use client';

import { useCart } from './CartProvider';

interface Props {
  productId: string;
  name: string;
  price: number;
  emoji: string;
  bgColor: string;
  vendorId: string;
  vendorName?: string;
  disabled?: boolean;
}

export function AddToCartButton({ productId, name, price, emoji, bgColor, vendorId, vendorName, disabled }: Props) {
  const { addItem } = useCart();

  return (
    <button
      className="pill btn-primary"
      style={{ flex: 1, justifyContent: 'center', fontSize: '1rem', padding: '13px 24px' }}
      disabled={disabled}
      onClick={() => addItem({ productId, name, price, emoji, bgColor, vendorId, vendorName })}
    >
      {disabled ? 'Out of stock' : '🛒 Add to cart'}
    </button>
  );
}
