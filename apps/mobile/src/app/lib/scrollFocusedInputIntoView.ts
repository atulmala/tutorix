import type { RefObject } from 'react';
import { ScrollView, TextInput } from 'react-native';

export function scrollFocusedInputIntoView(
  scrollRef: RefObject<ScrollView | null>,
  scrollOffsetY: number,
) {
  const input = TextInput.State.currentlyFocusedInput?.();
  if (!input || !scrollRef.current) {
    return;
  }

  input.measureInWindow((_fx: number, fy: number, _fw: number, fh: number) => {
    scrollRef.current?.measureInWindow((_sx, sy, _sw, sh) => {
      const inputBottom = fy + fh;
      const visibleBottom = sy + sh - 24;
      if (inputBottom <= visibleBottom) {
        return;
      }
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollOffsetY + (inputBottom - visibleBottom)),
        animated: true,
      });
    });
  });
}
