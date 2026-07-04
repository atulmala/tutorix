import {
  AppState,
  NativeEventEmitter,
  NativeModules,
  Platform,
  type AppStateStatus,
} from 'react-native';
import { getGraphQLEndpoint } from '@tutorix/shared-graphql/client/mobile/endpoint';
import { getAuthToken } from '@tutorix/shared-graphql/client/mobile/token-storage';
import {
  openPaymentCheckout,
  type ConfirmPaymentInput,
  type PaymentOrderSession,
} from '@tutorix/shared-utils';

const CAPTURE_POLL_INTERVAL_MS = 2000;
const CAPTURE_POLL_INITIAL_DELAY_MS = 3000;
const CAPTURE_POLL_TIMEOUT_MS = 120_000;

function waitForCheckoutReturn(gatewayOrderId: string): Promise<ConfirmPaymentInput> {
  return new Promise((resolve) => {
    let sawBackground = AppState.currentState !== 'active';
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        sawBackground = true;
      } else if (state === 'active' && sawBackground) {
        subscription.remove();
        resolve({
          provider: 'razorpay',
          orderId: gatewayOrderId,
          paymentId: '',
          signature: '',
          fetchFromGateway: true,
        });
      }
    });
  });
}

/**
 * Listen for Razorpay native events from the app bundle's React Native instance.
 * On some New Architecture builds, listeners registered via shared-utils never
 * receive events; registering here matches the AppState fallback pattern.
 */
function waitForRazorpayAppBundleEvent(
  gatewayOrderId: string,
): Promise<ConfirmPaymentInput> {
  return new Promise((resolve, reject) => {
    const emitterModule = NativeModules.RazorpayEventEmitter;
    if (!emitterModule) {
      return;
    }

    const events = new NativeEventEmitter(emitterModule);
    let settled = false;

    const successSub = events.addListener(
      'Razorpay::PAYMENT_SUCCESS',
      (data: Record<string, unknown>) => {
        if (settled) return;
        settled = true;
        successSub.remove();
        errorSub.remove();
        resolve({
          provider: 'razorpay',
          orderId: String(data.razorpay_order_id ?? gatewayOrderId),
          paymentId: String(data.razorpay_payment_id ?? ''),
          signature: String(data.razorpay_signature ?? ''),
        });
      },
    );

    const errorSub = events.addListener(
      'Razorpay::PAYMENT_ERROR',
      (data: Record<string, unknown>) => {
        if (settled) return;
        settled = true;
        successSub.remove();
        errorSub.remove();
        const description =
          typeof data.description === 'string'
            ? data.description
            : 'Payment failed';
        reject(new Error(/cancel/i.test(description) ? 'Payment cancelled' : description));
      },
    );
  });
}

/**
 * iOS Razorpay checkout runs as an in-app modal and often never changes
 * AppState or delivers native events to JS. Poll our API (which checks
 * Razorpay server-side) until the order has a captured payment.
 */
function waitForOrderCapturePoll(
  gatewayOrderId: string,
): Promise<ConfirmPaymentInput> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const poll = async () => {
      if (Date.now() - startedAt > CAPTURE_POLL_TIMEOUT_MS) {
        stop();
        reject(new Error('Payment confirmation timed out. Please try again.'));
        return;
      }

      try {
        const token = await getAuthToken();
        const response = await fetch(getGraphQLEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            query:
              'query RazorpayOrderCaptureStatus($orderId: String!) { razorpayOrderCaptureStatus(orderId: $orderId) { captured paymentId } }',
            variables: { orderId: gatewayOrderId },
          }),
        });

        const json = (await response.json()) as {
          data?: {
            razorpayOrderCaptureStatus?: {
              captured: boolean;
              paymentId?: string;
            };
          };
        };

        if (json.data?.razorpayOrderCaptureStatus?.captured) {
          stop();
          resolve({
            provider: 'razorpay',
            orderId: gatewayOrderId,
            paymentId: json.data.razorpayOrderCaptureStatus.paymentId ?? '',
            signature: '',
            fetchFromGateway: true,
          });
        }
      } catch {
        // Keep polling until timeout.
      }
    };

    setTimeout(() => {
      void poll();
      intervalId = setInterval(() => void poll(), CAPTURE_POLL_INTERVAL_MS);
    }, CAPTURE_POLL_INITIAL_DELAY_MS);
  });
}

function resolveGatewayOrderId(session: PaymentOrderSession): string {
  if (session.checkoutPayloadJson) {
    const payload = JSON.parse(session.checkoutPayloadJson) as Record<string, unknown>;
    return String(payload.order_id ?? session.orderId ?? '');
  }
  return String(session.orderId ?? '');
}

/**
 * Opens Razorpay checkout on mobile and resolves when either the native SDK
 * callback fires, the app returns to foreground after checkout, or (on iOS)
 * the API reports a captured payment on the order.
 */
export async function openMobilePaymentCheckout(
  session: PaymentOrderSession,
): Promise<ConfirmPaymentInput> {
  const gatewayOrderId = resolveGatewayOrderId(session);

  const racers: Promise<ConfirmPaymentInput>[] = [
    openPaymentCheckout(session),
    waitForRazorpayAppBundleEvent(gatewayOrderId),
    waitForCheckoutReturn(gatewayOrderId),
  ];

  if (Platform.OS === 'ios') {
    racers.push(waitForOrderCapturePoll(gatewayOrderId));
  }

  return Promise.race(racers);
}
