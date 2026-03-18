/**
 * Validate mật khẩu mới.
 * Yêu cầu:
 *  - Tối thiểu 8 ký tự
 *  - Ít nhất 1 chữ hoa (A-Z)
 *  - Ít nhất 1 chữ thường (a-z)
 *  - Ít nhất 1 chữ số (0-9)
 *  - Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)
 *
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one digit' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

module.exports = { validatePassword };
