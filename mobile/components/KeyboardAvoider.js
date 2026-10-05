/**
 * KeyboardAvoider.js
 * Drop-in replacement for KeyboardAvoidingView that also works on Android with edge-to-edge
 * (app.json edgeToEdgeEnabled), where the window no longer resizes for the keyboard.
 * iOS: the built-in KeyboardAvoidingView with "padding".
 * Android: measures how far the keyboard overlaps this view and pads the bottom by that amount.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { KeyboardAvoidingView, Keyboard, Platform, View, StatusBar } from 'react-native';

export default function KeyboardAvoider({ children, style, behavior, keyboardVerticalOffset = 0, onLayout, ...rest }) {
  const ref = useRef(null);
  const keyboardTop = useRef(null);
  const [inset, setInset] = useState(0);

  // Overlap = bottom edge of this view (in screen coordinates) minus the keyboard's top edge
  const measure = useCallback(() => {
    if (keyboardTop.current == null || !ref.current) {
      setInset(0);
      return;
    }
    ref.current.measureInWindow((x, y, width, height) => {
      // measureInWindow is offset by the status bar on Android; the keyboard's screenY is not
      const bottom = y + height + (StatusBar.currentHeight || 0);
      setInset(Math.max(0, Math.round(bottom - keyboardTop.current)));
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [measure]);

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={keyboardVerticalOffset} style={style} onLayout={onLayout} {...rest}>
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View
      ref={ref}
      style={[style, { paddingBottom: inset }]}
      onLayout={(e) => {
        // The tab bar hides while typing, which changes this view's size; re-measure
        if (keyboardTop.current != null) measure();
        onLayout?.(e);
      }}
      {...rest}
    >
      {children}
    </View>
  );
}
