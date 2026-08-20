import { NativeModules, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import type { ApolloClient } from '@apollo/client';
import {
  REGISTER_DEVICE_TOKEN,
  UNREGISTER_DEVICE_TOKEN,
} from '@tutorix/shared-graphql/mutations';

export const ANDROID_NOTIFICATION_CHANNEL_ID = 'tutorix_default';

function isMessagingNativeReady(): boolean {
  return Boolean((NativeModules as Record<string, unknown>).RNFBMessagingModule);
}

export type PushPayload = {
  title: string;
  body: string;
  event: string;
  entityType: string;
  entityId: string;
};

let currentToken: string | null = null;
let unsubscribeRefresh: (() => void) | null = null;

function platform(): 'IOS' | 'ANDROID' {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

function dataString(
  value: string | object | undefined,
): string {
  return typeof value === 'string' ? value : '';
}

export function parsePushMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
): PushPayload {
  return {
    title: message.notification?.title ?? '',
    body: message.notification?.body ?? '',
    event: dataString(message.data?.event),
    entityType: dataString(message.data?.entityType),
    entityId: dataString(message.data?.entityId),
  };
}

async function sendToken(
  client: ApolloClient<object>,
  token: string,
): Promise<void> {
  currentToken = token;
  await client.mutate({
    mutation: REGISTER_DEVICE_TOKEN,
    variables: { input: { token, platform: platform() } },
  });
}

export async function registerPushNotifications(
  client: ApolloClient<object>,
): Promise<void> {
  try {
    if (!isMessagingNativeReady()) {
      return;
    }
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL ||
      authStatus === messaging.AuthorizationStatus.EPHEMERAL;
    if (!enabled && Platform.OS === 'ios') {
      return;
    }
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
    const token = await messaging().getToken();
    if (token) {
      await sendToken(client, token);
    }
    unsubscribeRefresh?.();
    unsubscribeRefresh = messaging().onTokenRefresh((newToken) => {
      void sendToken(client, newToken);
    });
  } catch (error) {
    console.warn('[push] Failed to register device token', error);
  }
}

export async function unregisterPushNotifications(
  client: ApolloClient<object>,
): Promise<void> {
  try {
    unsubscribeRefresh?.();
    unsubscribeRefresh = null;
    if (currentToken) {
      await client.mutate({
        mutation: UNREGISTER_DEVICE_TOKEN,
        variables: { input: { token: currentToken } },
      });
    }
  } catch (error) {
    console.warn('[push] Failed to unregister device token', error);
  } finally {
    currentToken = null;
  }
}

export function subscribeForegroundPush(
  onMessage: (payload: PushPayload) => void,
): () => void {
  if (!isMessagingNativeReady()) {
    return () => undefined;
  }
  try {
    return messaging().onMessage((remoteMessage) => {
      onMessage(parsePushMessage(remoteMessage));
    });
  } catch (error) {
    console.warn('[push] Failed to subscribe to foreground messages', error);
    return () => undefined;
  }
}

export function subscribeNotificationOpened(
  onOpen: (payload: PushPayload) => void,
): () => void {
  if (!isMessagingNativeReady()) {
    return () => undefined;
  }
  try {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
      onOpen(parsePushMessage(remoteMessage));
    });
  } catch (error) {
    console.warn('[push] Failed to subscribe to notification opens', error);
    return () => undefined;
  }
}

export async function consumeInitialNotification(
  onOpen: (payload: PushPayload) => void,
): Promise<void> {
  if (!isMessagingNativeReady()) {
    return;
  }
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      onOpen(parsePushMessage(remoteMessage));
    }
  } catch (error) {
    console.warn('[push] Failed to consume initial notification', error);
  }
}

export function shouldOpenWallet(payload: PushPayload): boolean {
  return payload.event === 'WALLET_TOP_UP';
}
