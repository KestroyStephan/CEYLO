/**
 * Form validation shared by the sign-in, sign-up and partner registration screens.
 * Each check returns an error message, or null when the value is fine.
 */

// Practical email check: one @, a dot in the domain, no spaces, a 2+ letter ending
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function emailError(value) {
  const v = String(value || '').trim();
  if (!v) return 'Enter your email address.';
  if (v.length > 254) return 'This email address is too long.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email, like name@example.com.';
  if (/\.\.|@\./.test(v)) return 'Enter a valid email, like name@example.com.';
  return null;
}

/** Sign in only needs a password to be present. */
export function loginPasswordError(value) {
  if (!value) return 'Enter your password.';
  if (value.length < 6) return 'Passwords are at least 6 characters.';
  return null;
}

/** The rules a new password must meet, with whether each one passes. */
export function passwordRules(value) {
  const v = String(value || '');
  return [
    { key: 'length', label: 'At least 8 characters', ok: v.length >= 8 },
    { key: 'upper', label: 'An uppercase letter (A-Z)', ok: /[A-Z]/.test(v) },
    { key: 'lower', label: 'A lowercase letter (a-z)', ok: /[a-z]/.test(v) },
    { key: 'number', label: 'A number (0-9)', ok: /\d/.test(v) },
    { key: 'symbol', label: 'A symbol (! @ # $ …)', ok: /[^A-Za-z0-9]/.test(v) },
  ];
}

export function newPasswordError(value) {
  if (!value) return 'Create a password.';
  if (/\s/.test(value)) return 'Passwords cannot contain spaces.';
  const missing = passwordRules(value).filter(r => !r.ok);
  return missing.length ? `Password needs: ${missing.map(r => r.label.toLowerCase()).join(', ')}.` : null;
}

/** 0 (empty) to 4 (strong), with a label and colour for the strength bar. */
export function passwordStrength(value) {
  const v = String(value || '');
  if (!v) return { score: 0, label: '', color: '#D5DDD8' };
  const passed = passwordRules(v).filter(r => r.ok).length;
  const score = v.length < 8 ? 1 : passed <= 3 ? 2 : passed === 4 ? 3 : 4;
  return [
    { score: 0, label: '', color: '#D5DDD8' },
    { score: 1, label: 'Too short', color: '#C62828' },
    { score: 2, label: 'Weak', color: '#E65100' },
    { score: 3, label: 'Good', color: '#C79A00' },
    { score: 4, label: 'Strong', color: '#1B8A4B' },
  ][score];
}

export function confirmPasswordError(password, confirm) {
  if (!confirm) return 'Type the password again.';
  return password === confirm ? null : 'The passwords do not match.';
}

export function nameError(value, label = 'name') {
  const v = String(value || '').trim();
  if (!v) return `Enter your ${label}.`;
  if (v.length < 2) return `Your ${label} is too short.`;
  if (v.length > 60) return `Your ${label} is too long.`;
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(v)) return `Use letters only in your ${label}.`;
  return null;
}

/** Sri Lankan mobile numbers: 07XXXXXXXX or +947XXXXXXXX (spaces and dashes allowed). */
export function phoneError(value, { required = false } = {}) {
  const v = String(value || '').replace(/[\s-]/g, '');
  if (!v) return required ? 'Enter your mobile number.' : null;
  if (!/^(?:\+94|0094|94|0)7\d{8}$/.test(v)) return 'Enter a Sri Lankan mobile number, like 077 123 4567.';
  return null;
}

/** Friendly text for Firebase Auth error codes. */
export function authErrorMessage(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-email': 'That email address is not valid.',
    'auth/missing-password': 'Enter your password.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/user-not-found': 'No account uses this email. Create an account first.',
    'auth/email-already-in-use': 'An account already uses this email. Log in instead, or reset the password.',
    'auth/weak-password': 'Choose a stronger password (8+ characters with letters, a number and a symbol).',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Check your connection and try again.',
    'auth/user-disabled': 'This account has been disabled. Contact support@ceylo.lk.',
  };
  return map[code] || error?.message || 'Something went wrong. Please try again.';
}
