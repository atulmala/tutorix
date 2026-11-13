import { AppState, type AppStateStatus } from 'react-native';
import { getMobileGraphQLEndpoint } from '@tutorix/shared-graphql/client/mobile/apollo-client';
import { getAuthToken } from '@tutorix/shared-graphql/client/mobile/token-storage';
import type { ConfirmPaymentInput, PaymentOrderSession } from '@tutorix/shared-utils';

// Required lazily so the native module is only touched when a Cashfree session is opened.
// Both packages must resolve from apps/mobile/node_modules (never from libs/ or the workspace root).
type CashfreeSdk = typeof import('react-native-cashfree-pg-sdk');
type CashfreeContract = typeof import('cashfree-pg-api-contract');

const CAPTURE_POLL_INTERVAL_MS = 2000;
const CAPTURE_POLL_INITIAL_DELAY_MS = 3000;
const CAPTURE_POLL_TIMEOUT_MS = 120_000;

export const CASHFREE_DEV_PRODUCTION_BLOCKED_MESSAGE =
  'Live Cashfree payments are blocked in development builds. Use Cashfree sandbox keys.';

type CashfreeSessionPayload = {
  paymentSessionId: string;
  orderId: string;
  environment: 'sandbox' | 'production';
};

export function parseCashfreeSession(session: PaymentOrderSession): CashfreeSessionPayload {
  const payload = session.checkoutPayloadJson
    ? (JSON.parse(session.checkoutPayloadJson) as Record<string, unknown>)
    : {};
  const paymentSessionId = String(payload.paymentSessionId ?? '');
  const orderId = String(payload.orderId ?? session.orderId ?? '');
  if (!paymentSessionId || !orderId) {
    throw new Error('Cashfree checkout session is incomplete');
  }
  return {
    paymentSessionId,
    orderId,
    environment: payload.environment === 'production' ? 'production' : 'sandbox',
  };
}

/** Dev clients must never open a live Cashfree session. Release builds pass isDev=false. */
export function assertMobileCashfreeEnvironmentAllowed(
  environment: CashfreeSessionPayload['environment'],
  isDev: boolean,
): void {
  if (isDev && environment === 'production') {
    throw new Error(CASHFREE_DEV_PRODUCTION_BLOCKED_MESSAGE);
  }
}

function fetchFromGatewayResult(orderId: string): ConfirmPaymentInput {
  return {
    provider: 'cashfree',
    orderId,
    paymentId: '',
    signature: '',
    fetchFromGateway: true,
  };
}

async function queryCaptureStatus(orderId: string): Promise<boolean> {
  const token = await getAuthToken();
  const response = await fetch(getMobileGraphQLEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query:
        'query CashfreeOrderCaptureStatus($orderId: String!) { cashfreeOrderCaptureStatus(orderId: $orderId) { captured paymentId } }',
      variables: { orderId },
    }),
  });
  const json = (await response.json()) as {
    data?: { cashfreeOrderCaptureStatus?: { captured: boolean } | null };
    errors?: Array<{ message?: string }>;
  };
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Capture status unavailable');
  }
  return Boolean(json.data?.cashfreeOrderCaptureStatus?.captured);
}

/**
 * Native SDK callbacks are not guaranteed to reach JS, so the checkout also
 * resolves from a server-side poll. The poll only covers platform-fee orders;
 * for other orders, returning to the app hands verification to the API.
 */
function waitForServerConfirmation(
  orderId: string,
  isSettled: () => boolean,
): { promise: Promise<ConfirmPaymentInput>; stop: () => void } {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let initialTimer: ReturnType<typeof setTimeout> | null = null;
  let appStateSubscription: { remove: () => void } | null = null;

  const stop = () => {
    if (intervalId != null) clearInterval(intervalId);
    if (initialTimer != null) clearTimeout(initialTimer);
    appStateSubscription?.remove();
    intervalId = null;
    initialTimer = null;
    appStateSubscription = null;
  };

  const promise = new Promise<ConfirmPaymentInput>((resolve, reject) => {
    const startedAt = Date.now();
    let pollUnsupported = false;
    let sawBackground = AppState.currentState !== 'active';

    const poll = async (fromAppReturn: boolean) => {
      if (isSettled()) {
        stop();
        return;
      }
      if (Date.now() - startedAt > CAPTURE_POLL_TIMEOUT_MS) {
        stop();
        reject(new Error('Payment confirmation timed out. Please try again.'));
        return;
      }
      if (pollUnsupported) {
        if (fromAppReturn) {
          stop();
          resolve(fetchFromGatewayResult(orderId));
        }
        return;
      }
      try {
        if (await queryCaptureStatus(orderId)) {
          stop();
          resolve(fetchFromGatewayResult(orderId));
        }
      } catch {
        pollUnsupported = true;
        if (fromAppReturn) {
          stop();
          resolve(fetchFromGatewayResult(orderId));
        }
      }
    };

    appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        sawBackground = true;
      } else if (state === 'active' && sawBackground) {
        void poll(true);
      }
    });

    initialTimer = setTimeout(() => {
      void poll(false);
      intervalId = setInterval(() => void poll(false), CAPTURE_POLL_INTERVAL_MS);
    }, CAPTURE_POLL_INITIAL_DELAY_MS);
  });

  return { promise, stop };
}

export async function openCashfreeMobileCheckout(
  session: PaymentOrderSession,
): Promise<ConfirmPaymentInput> {
  const { paymentSessionId, orderId, environment } = parseCashfreeSession(session);
  assertMobileCashfreeEnvironmentAllowed(environment, __DEV__);

  const sdk = require('react-native-cashfree-pg-sdk') as CashfreeSdk;
  const contract = require('cashfree-pg-api-contract') as CashfreeContract;
  const { CFPaymentGatewayService } = sdk;

  let settled = false;
  const server = waitForServerConfirmation(orderId, () => settled);

  const sdkResult = new Promise<ConfirmPaymentInput>((resolve, reject) => {
    CFPaymentGatewayService.setCallback({
      onVerify: (verifiedOrderId: string) => {
        resolve(fetchFromGatewayResult(verifiedOrderId || orderId));
      },
      onError: (error, failedOrderId: string) => {
        const message = error?.getMessage?.() || 'Payment failed';
        const code = error?.getCode?.() ?? '';
        if (/cancel/i.test(code) || /cancel/i.test(message)) {
          reject(new Error('Payment cancelled'));
          return;
        }
        reject(new Error(message || `Payment failed for order ${failedOrderId || orderId}`));
      },
    });
  });

  try {
    const cfSession = new contract.CFSession(
      paymentSessionId,
      orderId,
      environment === 'production'
        ? contract.CFEnvironment.PRODUCTION
        : contract.CFEnvironment.SANDBOX,
    );
    CFPaymentGatewayService.doWebPayment(cfSession);
    return await Promise.race([sdkResult, server.promise]);
  } finally {
    settled = true;
    server.stop();
    CFPaymentGatewayService.removeCallback();
  }
}
