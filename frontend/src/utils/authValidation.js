export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Please enter a valid email address.';
  }
  return '';
}

export function getPasswordRules(password = '') {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'upper', label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'At least one number (0-9)', met: /[0-9]/.test(password) },
    { id: 'special', label: 'At least one special character (!@#$...)', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  const rules = getPasswordRules(password);
  const failed = rules.find((r) => !r.met);
  return failed ? `Password requirement missing: ${failed.label}.` : '';
}
