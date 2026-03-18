const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load RSA key pair
const privateKey = fs.readFileSync(path.join(__dirname, '..', 'private.pem'), 'utf8');
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public.pem'), 'utf8');

/**
 * Ký JWT bằng private key RS256
 * @param {object} payload - Dữ liệu gắn vào token
 * @returns {string} JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1d',
  });
}

/**
 * Xác minh JWT bằng public key RS256
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
}

/**
 * Express middleware – yêu cầu token hợp lệ
 * Gắn req.user = decoded payload nếu hợp lệ
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Access token is required' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { signToken, verifyToken, requireAuth };
