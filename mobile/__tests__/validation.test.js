import {
  emailError, loginPasswordError, newPasswordError, passwordStrength, confirmPasswordError, nameError, phoneError, authErrorMessage,
} from '../utils/validation';
import { sizedUri } from '../utils/images';

describe('form validation', () => {
  test('email', () => {
    expect(emailError('')).toMatch(/Enter your email/);
    expect(emailError('name@')).toMatch(/valid email/);
    expect(emailError('name@site')).toMatch(/valid email/);
    expect(emailError('na me@site.com')).toMatch(/valid email/);
    expect(emailError('name@site..com')).toMatch(/valid email/);
    expect(emailError('  stephan@ceylo.lk ')).toBeNull();
  });

  test('sign-in password only needs to be present', () => {
    expect(loginPasswordError('')).toMatch(/Enter your password/);
    expect(loginPasswordError('abc')).toMatch(/at least 6/);
    expect(loginPasswordError('ceylo-test-123')).toBeNull();
  });

  test('new password rules and strength', () => {
    expect(newPasswordError('')).toMatch(/Create a password/);
    expect(newPasswordError('short')).toMatch(/8 characters/);
    expect(newPasswordError('alllowercase1!')).toMatch(/uppercase/);
    expect(newPasswordError('Has Space1!')).toMatch(/spaces/);
    expect(newPasswordError('Ceylo@2026')).toBeNull();
    expect(passwordStrength('abc').label).toBe('Too short');
    expect(passwordStrength('abcdefgh').label).toBe('Weak');
    expect(passwordStrength('Ceylo2026').label).toBe('Good');
    expect(passwordStrength('Ceylo@2026').label).toBe('Strong');
  });

  test('confirm password, name and Sri Lankan phone numbers', () => {
    expect(confirmPasswordError('Ceylo@2026', 'Ceylo@2025')).toMatch(/do not match/);
    expect(confirmPasswordError('Ceylo@2026', 'Ceylo@2026')).toBeNull();
    expect(nameError('A')).toMatch(/too short/);
    expect(nameError('Arjuna Perera')).toBeNull();
    expect(nameError('R2D2')).toMatch(/letters/);
    expect(phoneError('077 123 4567')).toBeNull();
    expect(phoneError('+94771234567')).toBeNull();
    expect(phoneError('12345')).toMatch(/Sri Lankan/);
    expect(phoneError('', { required: true })).toMatch(/Enter your mobile/);
  });

  test('friendly Firebase messages', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toMatch(/already uses this email/);
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toMatch(/incorrect/);
  });
});

describe('image sizing', () => {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Sigiriya.jpg/960px-Sigiriya.jpg';
  test('cards ask Wikimedia for a 500 px thumbnail', () => {
    expect(sizedUri(url)).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Sigiriya.jpg/500px-Sigiriya.jpg');
  });
  test('heroes keep 960 px and other hosts are untouched', () => {
    expect(sizedUri(url, 960)).toBe(url);
    expect(sizedUri('https://firebasestorage.googleapis.com/x.jpg')).toBe('https://firebasestorage.googleapis.com/x.jpg');
  });
});
