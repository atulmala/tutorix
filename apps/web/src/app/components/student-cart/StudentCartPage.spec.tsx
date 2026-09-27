import { fireEvent, render, screen } from '@testing-library/react';
import { MY_CART } from '@tutorix/shared-graphql';
import { StudentCartPage } from './StudentCartPage';

const mockUseQuery = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('@tutorix/shared-graphql', () => ({
  MY_CART: { kind: 'cart' },
  UPDATE_CART_ITEM: { kind: 'update' },
  REMOVE_FROM_CART: { kind: 'remove' },
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (mutation: { kind?: string }) => {
    if (mutation.kind === 'update') {
      return [mockUpdate, { loading: false }];
    }
    return [mockRemove, { loading: false }];
  },
}));

describe('StudentCartPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUpdate.mockReset();
    mockRemove.mockReset();
  });

  it('groups lines by tutor and checks out', () => {
    mockUseQuery.mockImplementation((query: { kind?: string }) => {
      if (query === MY_CART) {
        return {
          loading: false,
          data: {
            myCart: {
              itemCount: 3,
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
    render(<StudentCartPage onCheckout={onCheckout} onKeepShopping={jest.fn()} />);

    expect(screen.getByText('Anita Sharma')).toBeTruthy();
    expect(screen.getByText('Rahul Verma')).toBeTruthy();
    expect(screen.getByText('₹1,500')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });
});
