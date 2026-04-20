import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: {
    fontFamily: 'Outfit-Bold',
    fontSize: 57,
  },
  displayMedium: {
    fontFamily: 'Outfit-Bold',
    fontSize: 45,
  },
  displaySmall: {
    fontFamily: 'Outfit-Bold',
    fontSize: 36,
  },
  headlineLarge: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 32,
  },
  headlineMedium: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 28,
  },
  headlineSmall: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 24,
  },
  titleLarge: {
    fontFamily: 'Outfit-Medium',
    fontSize: 22,
  },
  titleMedium: {
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
  },
  titleSmall: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
  labelLarge: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
  },
  labelMedium: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
  },
  labelSmall: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
  },
  bodyLarge: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
  },
  bodyMedium: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
  },
  bodySmall: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
  },
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00695C', // Teal
    secondary: '#558B2F', // Eco-Green
    tertiary: '#004D40',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    error: '#B00020',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#212121',
    onSurface: '#212121',
    outline: '#00695C',
  },
  roundness: 12,
};
