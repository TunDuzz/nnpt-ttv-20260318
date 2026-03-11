var express = require('express');
var router = express.Router();
const { query } = require('../utils/db');

router.post('/enable', function (req, res, next) {
  const { email, username } = req.body || {};
  if (!email || !username) return res.status(400).send({ message: "email and username are required" });

  query(
    `UPDATE users SET status = 1
     WHERE email = ? AND username = ? AND isDeleted = 0`,
    [email, username]
  )
    .then(r => {
      if (!r.affectedRows) return res.status(404).send({ message: "User NOT FOUND" });
      return res.send({ message: "Enabled" });
    })
    .catch(next);
});

router.post('/disable', function (req, res, next) {
  const { email, username } = req.body || {};
  if (!email || !username) return res.status(400).send({ message: "email and username are required" });

  query(
    `UPDATE users SET status = 0
     WHERE email = ? AND username = ? AND isDeleted = 0`,
    [email, username]
  )
    .then(r => {
      if (!r.affectedRows) return res.status(404).send({ message: "User NOT FOUND" });
      return res.send({ message: "Disabled" });
    })
    .catch(next);
});

router.get('/', function (req, res, next) {
  query(
    `SELECT id, username, email, fullName, avatarUrl, status, roleId, loginCount, createdAt, updatedAt
     FROM users
     WHERE isDeleted = 0
     ORDER BY id DESC`
  )
    .then(rows => res.send(rows))
    .catch(next);
});

router.get('/:id', function (req, res, next) {
  let id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).send({ message: "Invalid id" });

  query(
    `SELECT id, username, email, fullName, avatarUrl, status, roleId, loginCount, createdAt, updatedAt
     FROM users
     WHERE id = ? AND isDeleted = 0
     LIMIT 1`,
    [id]
  )
    .then(rows => {
      if (rows.length) return res.send(rows[0]);
      return res.status(404).send({ message: "User NOT FOUND" });
    })
    .catch(next);
});

router.post('/', function (req, res, next) {
  const {
    username,
    password,
    email,
    fullName = "",
    avatarUrl = "https://i.sstatic.net/l60Hf.png",
    status = false,
    roleId = null,
  } = req.body || {};

  if (!username || !password || !email) {
    return res.status(400).send({ message: "username, password, email are required" });
  }

  query(
    `INSERT INTO users (username, password, email, fullName, avatarUrl, status, roleId, loginCount, isDeleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [username, password, email, fullName, avatarUrl, status ? 1 : 0, roleId]
  )
    .then(result =>
      query(
        `SELECT id, username, email, fullName, avatarUrl, status, roleId, loginCount, createdAt, updatedAt
         FROM users
         WHERE id = ?`,
        [result.insertId]
      )
    )
    .then(rows => res.status(201).send(rows[0]))
    .catch(err => {
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).send({ message: "username/email already exists" });
      }
      return next(err);
    });
});

router.put('/:id', function (req, res, next) {
  let id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).send({ message: "Invalid id" });

  const allowed = ['password', 'email', 'fullName', 'avatarUrl', 'status', 'roleId', 'loginCount'];
  const patch = {};
  for (const k of allowed) {
    if (req.body && req.body[k] !== undefined) patch[k] = req.body[k];
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).send({ message: "No updatable fields" });
  }
  if (patch.loginCount !== undefined && Number(patch.loginCount) < 0) {
    return res.status(400).send({ message: "loginCount must be >= 0" });
  }

  const sets = Object.keys(patch).map(k => `${k} = ?`).join(', ');
  const values = Object.keys(patch).map(k => {
    if (k === 'status') return patch[k] ? 1 : 0;
    return patch[k];
  });

  query(
    `UPDATE users SET ${sets} WHERE id = ? AND isDeleted = 0`,
    [...values, id]
  )
    .then(r => {
      if (!r.affectedRows) return res.status(404).send({ message: "User NOT FOUND" });
      return query(
        `SELECT id, username, email, fullName, avatarUrl, status, roleId, loginCount, createdAt, updatedAt
         FROM users WHERE id = ?`,
        [id]
      );
    })
    .then(rows => {
      if (Array.isArray(rows)) return res.send(rows[0]);
    })
    .catch(err => {
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).send({ message: "username/email already exists" });
      }
      return next(err);
    });
});

router.delete('/:id', function (req, res, next) {
  let id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).send({ message: "Invalid id" });

  query(`UPDATE users SET isDeleted = 1 WHERE id = ? AND isDeleted = 0`, [id])
    .then(r => {
      if (!r.affectedRows) return res.status(404).send({ message: "User NOT FOUND" });
      return res.send({ message: "Deleted (soft)", id });
    })
    .catch(next);
});

module.exports = router;
