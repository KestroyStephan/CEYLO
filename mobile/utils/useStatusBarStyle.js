/**
 * useStatusBarStyle.js
 * Sets the status bar icon colour whenever a screen gains focus. Screens stay mounted in tab and
 * stack navigators, so a style set by a previous screen would otherwise stick (white icons on a
 * light screen). 'dark-content' for light backgrounds, 'light-content' for dark headers.
 */
import { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function useStatusBarStyle(style) {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(style, true);
    }, [style]),
  );
}
