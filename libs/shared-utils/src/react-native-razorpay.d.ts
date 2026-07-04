declare module 'react-native-razorpay' {
  export default class RazorpayCheckout {
    static open(
      options: Record<string, unknown>,
    ): Promise<import('./razorpay-native.types').RazorpaySuccessResponse>;
    static onExternalWalletSelection(callback: (data: unknown) => void): void;
  }
}
