import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import type { ApolloClient } from '@apollo/client';
import {
  REGISTER_DEVICE_TOKEN,
  UNREGISTER_DEVICE_TOKEN,
} from '@tutorix/shared-graphql/mutations';

let currentToken: string | null = null;
let unsubscribeRefresh: (() => void) | null = null;

function platform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

async function sendToken(client: ApolloClient<object>, token: string): Promise<void> {
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
    await messaging().requestPermission();
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
