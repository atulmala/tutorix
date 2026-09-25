import React from 'react';
import { useQuery } from '@apollo/client';
import { MY_CART } from '@tutorix/shared-graphql';

type CartChipProps = {
  onOpenCart?: () => void;
};

export const CartChip: React.FC<CartChipProps> = ({ onOpenCart }) => {
  const { data } = useQuery(MY_CART, {
    fetchPolicy: 'cache-and-network',
  });
  const itemCount = data?.myCart?.itemCount ?? 0;

  return (
    <button
      type="button"
      onClick={onOpenCart}
      className="relative inline-flex items-center rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-bold text-[#2563eb]"
      aria-label={itemCount ? `Cart, ${itemCount} classes` : 'Cart'}
    >
      Cart
      {itemCount > 0 ? (
        <span className="ml-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] text-white">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
};
