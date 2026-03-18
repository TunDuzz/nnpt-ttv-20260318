var express = require('express');
var router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../utils/db');
const { signToken, requireAuth } = require('../utils/authHandler');
const { validatePassword } = require('../utils/validator');

/**
 * POST /api/v1/auth/login
 * Body: { username, password }
 * Trả về JWT token nếu thông tin hợp lệ
 */
router.post('/login', async function (req, res, next) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    // Tìm user theo username
    const rows = await query(
      `SELECT id, username, email, fullName, avatarUrl, status, roleId, loginCount, password
       FROM users
       WHERE username = ? AND isDeleted = 0
       LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];

    // Kiểm tra status
    if (!user.status) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    // So sánh password: hỗ trợ cả bcrypt hash lẫn plain text
    let passwordMatch = false;
    if (user.password.startsWith('$2')) {
      // bcrypt hash
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // plain text (fallback cho dữ liệu cũ)
      passwordMatch = password === user.password;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Tăng loginCount
    await query(
      `UPDATE users SET loginCount = loginCount + 1 WHERE id = ?`,
      [user.id]
    );

    // Tạo JWT payload (không chứa password)
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      roleId: user.roleId,
    };

    const token = signToken(payload);

    return res.json({ token });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Header: Authorization: Bearer <token>
 * Trả về thông tin user hiện tại từ token
 */
router.get('/me', requireAuth, function (req, res) {
  // req.user được gắn bởi middleware requireAuth
  const { iat, exp, ...userInfo } = req.user;
  return res.json(userInfo);
});

/**
 * PUT /api/v1/auth/changepassword
 * Header: Authorization: Bearer <token>
 * Body: { oldPassword, newPassword }
 * Đổi mật khẩu, yêu cầu đăng nhập
 */
router.put('/changepassword', requireAuth, async function (req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'oldPassword and newPassword are required' });
    }

    // Validate newPassword
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    // Lấy password hiện tại từ DB
    const rows = await query(
      `SELECT id, password FROM users WHERE id = ? AND isDeleted = 0 LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    // Xác minh oldPassword
    let oldMatch = false;
    if (user.password.startsWith('$2')) {
      oldMatch = await bcrypt.compare(oldPassword, user.password);
    } else {
      oldMatch = oldPassword === user.password;
    }

    if (!oldMatch) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    // Hash mật khẩu mới
    const hashedNew = await bcrypt.hash(newPassword, 10);

    // Cập nhật DB
    await query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedNew, user.id]
    );

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
