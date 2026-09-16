import type { RefObject } from 'react';
import { ScrollView, TextInput, type NativeMethods } from 'react-native';

function measureInWindow(
  component: NativeMethods,
  callback: (x: number, y: number, width: number, height: number) => void,
) {
  component.measureInWindow(callback);
}

export function scrollFocusedInputIntoView(
  scrollRef: RefObject<ScrollView | null>,
  scrollOffsetY: number,
) {
  const input = TextInput.State.currentlyFocusedInput?.();
  const scroll = scrollRef.current;
  if (!input || !scroll) {
    return;
  }

  measureInWindow(input, (_fx, fy, _fw, fh) => {
    measureInWindow(scroll as unknown as NativeMethods, (_sx, sy, _sw, sh) => {
      const inputBottom = fy + fh;
      const visibleBottom = sy + sh - 24;
      if (inputBottom <= visibleBottom) {
        return;
      }
      scroll.scrollTo({
        y: Math.max(0, scrollOffsetY + (inputBottom - visibleBottom)),
        animated: true,
      });
    });
  });
}

/** Pin the focused field near the top of the scroll view so content below it stays visible. */
export function scrollFocusedInputToTop(
  scrollRef: RefObject<ScrollView | null>,
  scrollOffsetY: number,
  topGap = 12,
) {
  const input = TextInput.State.currentlyFocusedInput?.();
  const scroll = scrollRef.current;
  if (!input || !scroll) {
    return;
  }

  measureInWindow(input, (_fx, fy) => {
    measureInWindow(scroll as unknown as NativeMethods, (_sx, sy) => {
      const delta = fy - sy - topGap;
      if (Math.abs(delta) < 6) {
        return;
      }
      scroll.scrollTo({
        y: Math.max(0, scrollOffsetY + delta),
        animated: true,
      });
    });
  });
}
