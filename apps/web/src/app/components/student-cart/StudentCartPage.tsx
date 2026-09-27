import React from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  MY_CART,
  REMOVE_FROM_CART,
  UPDATE_CART_ITEM,
} from '@tutorix/shared-graphql';
import { formatInr } from '@tutorix/shared-utils';

export type StudentCartLine = {
  id: number;
  tutorId: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: 'online' | 'offline';
  quantity: number;
  unitRateInr: number;
  lineTotalInr: number;
};

type StudentCartPageProps = {
  onCheckout: () => void;
  onKeepShopping: () => void;
};

export const StudentCartPage: React.FC<StudentCartPageProps> = ({
  onCheckout,
  onKeepShopping,
}) => {
  const { data, loading, error } = useQuery(MY_CART, {
    fetchPolicy: 'network-only',
  });
  const [updateItem, { loading: updating }] = useMutation(UPDATE_CART_ITEM, {
    refetchQueries: [{ query: MY_CART }],
  });
  const [removeItem, { loading: removing }] = useMutation(REMOVE_FROM_CART, {
    refetchQueries: [{ query: MY_CART }],
  });
  const cart = data?.myCart;
  const items = (cart?.items ?? []) as StudentCartLine[];
  const busy = updating || removing;

  if (loading) {
    return <p className="text-sm text-muted">Loading cart…</p>;
  }
  if (error) {
    return <p className="text-sm text-danger">Could not load your cart.</p>;
  }
  if (items.length === 0) {
    return (
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-[26px] font-extrabold text-[#143055]">Cart</h1>
        <p className="text-sm text-slate-500">
          Your cart is empty. Add classes from a tutor preview to check out later.
        </p>
        <button
          type="button"
          onClick={onKeepShopping}
          className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Find a tutor
        </button>
      </div>
    );
  }

  const groups = new Map<number, StudentCartLine[]>();
  for (const item of items) {
    const rows = groups.get(item.tutorId) ?? [];
    rows.push(item);
    groups.set(item.tutorId, rows);
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Cart</h1>
      {[...groups.entries()].map(([tutorId, rows]) => (
        <section key={tutorId} className="rounded-[20px] bg-white p-5">
          <h2 className="text-base font-extrabold text-[#143055]">{rows[0].tutorName}</h2>
          <ul className="mt-3 space-y-3">
            {rows.map((item) => (
              <li key={item.id} className="rounded-2xl bg-sky-50 px-4 py-3">
                <p className="text-sm font-extrabold text-[#143055]">{item.offeringLabel}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {item.deliveryMode === 'online' ? 'Online' : 'Offline'} ·{' '}
                  {formatInr(item.unitRateInr)} / class
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || item.quantity <= 1}
                      aria-label={`Decrease ${item.offeringLabel}`}
                      onClick={() =>
                        void updateItem({
                          variables: { itemId: String(item.id), quantity: item.quantity - 1 },
                        })
                      }
                      className="h-8 w-8 rounded-lg bg-white text-sm font-bold text-[#143055] disabled:text-slate-300"
                    >
                      −
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-extrabold text-[#143055]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Increase ${item.offeringLabel}`}
                      onClick={() =>
                        void updateItem({
                          variables: { itemId: String(item.id), quantity: item.quantity + 1 },
                        })
                      }
                      className="h-8 w-8 rounded-lg bg-white text-sm font-bold text-[#143055]"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-[#143055]">
                      {formatInr(item.lineTotalInr)}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void removeItem({ variables: { itemId: String(item.id) } })
                      }
                      className="text-sm font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="flex items-center justify-between rounded-[20px] bg-white px-5 py-4">
        <span className="text-sm font-semibold text-slate-500">Total</span>
        <span className="text-lg font-extrabold text-[#143055]">
          {formatInr(cart?.totalInr ?? 0)}
        </span>
      </div>
      <button
        type="button"
        onClick={onCheckout}
        className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
      >
        Checkout
      </button>
    </div>
  );
};
