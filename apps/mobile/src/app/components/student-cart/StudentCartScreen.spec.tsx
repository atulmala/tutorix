import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MY_CART } from '@tutorix/shared-graphql/queries';
import { StudentCartScreen } from './StudentCartScreen';

const mockUseQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/queries', () => ({
  MY_CART: { kind: 'cart' },
}));

jest.mock('@tutorix/shared-graphql/mutations', () => ({
  UPDATE_CART_ITEM: { kind: 'update' },
  REMOVE_FROM_CART: { kind: 'remove' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [jest.fn(), { loading: false }],
}));

describe('StudentCartScreen', () => {
  it('groups lines by tutor and checks out', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === MY_CART) {
        return {
          loading: false,
          data: {
            myCart: {
              totalInr: 1500,
              items: [
                {
                  id: 1,
                  tutorId: 3,
                  tutorName: 'Anita Sharma',
                  offeringLabel: 'Mathematics',
                  deliveryMode: 'offline',
                  quantity: 2,
                  unitRateInr: 500,
                  lineTotalInr: 1000,
                },
                {
                  id: 2,
                  tutorId: 4,
                  tutorName: 'Rahul Verma',
                  offeringLabel: 'Physics',
                  deliveryMode: 'online',
                  quantity: 1,
                  unitRateInr: 500,
                  lineTotalInr: 500,
                },
              ],
            },
          },
        };
      }
      return { loading: false, data: null };
    });

    const onCheckout = jest.fn();
    const { getByText } = render(
      <StudentCartScreen onCheckout={onCheckout} onKeepShopping={jest.fn()} />,
    );

    expect(getByText('Anita Sharma')).toBeTruthy();
    expect(getByText('Rahul Verma')).toBeTruthy();
    fireEvent.press(getByText('Checkout'));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });
});
