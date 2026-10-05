/**
 * useTabBarStyle.js
 * Bottom tab bar sized for the phone's real navigation-bar inset. With Android edge-to-edge the
 * app draws behind the system navigation bar, so a fixed height cuts off the tab labels.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function useTabBarStyle(extra = {}) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return {
    height: 56 + bottom,
    paddingBottom: bottom,
    paddingTop: 6,
    ...extra,
  };
}
