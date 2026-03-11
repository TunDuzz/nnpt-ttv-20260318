var express = require('express');
var router = express.Router();
const { query } = require('../utils/db');

router.get('/', function (req, res, next) {
    query(
        `SELECT id, name, description, createdAt, updatedAt
         FROM roles
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
        `SELECT id, name, description, createdAt, updatedAt
         FROM roles
         WHERE id = ? AND isDeleted = 0
         LIMIT 1`,
        [id]
    )
        .then(rows => {
            if (rows.length) return res.send(rows[0]);
            return res.status(404).send({ message: "Role NOT FOUND" });
        })
        .catch(next);
});

router.get('/:id/users', function (req, res, next) {
    let id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).send({ message: "Invalid id" });

    query(
        `SELECT id FROM roles WHERE id = ? AND isDeleted = 0 LIMIT 1`,
        [id]
    )
        .then(rows => {
            if (!rows.length) return res.status(404).send({ message: "Role NOT FOUND" });
            return query(
                `SELECT id, username, email, fullName, avatarUrl, status, roleId, loginCount, createdAt, updatedAt
                 FROM users
                 WHERE roleId = ? AND isDeleted = 0
                 ORDER BY id DESC`,
                [id]
            );
        })
        .then(rows => {
            if (Array.isArray(rows)) return res.send(rows);
        })
        .catch(next);
});

router.post('/', function (req, res, next) {
    const { name, description = "" } = req.body || {};
    if (!name) return res.status(400).send({ message: "name is required" });

    query(
        `INSERT INTO roles (name, description, isDeleted) VALUES (?, ?, 0)`,
        [name, description]
    )
        .then(result =>
            query(
                `SELECT id, name, description, createdAt, updatedAt
                 FROM roles
                 WHERE id = ?`,
                [result.insertId]
            )
        )
        .then(rows => res.status(201).send(rows[0]))
        .catch(err => {
            if (err && err.code === 'ER_DUP_ENTRY') {
                return res.status(409).send({ message: "Role name already exists" });
            }
            return next(err);
        });
});

router.put('/:id', function (req, res, next) {
    let id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).send({ message: "Invalid id" });

    const allowed = ['name', 'description'];
    const patch = {};
    for (const k of allowed) {
        if (req.body && req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (Object.keys(patch).length === 0) {
        return res.status(400).send({ message: "No updatable fields" });
    }

    const sets = Object.keys(patch).map(k => `${k} = ?`).join(', ');
    const values = Object.keys(patch).map(k => patch[k]);

    query(`UPDATE roles SET ${sets} WHERE id = ? AND isDeleted = 0`, [...values, id])
        .then(r => {
            if (!r.affectedRows) return res.status(404).send({ message: "Role NOT FOUND" });
            return query(
                `SELECT id, name, description, createdAt, updatedAt
                 FROM roles
                 WHERE id = ?`,
                [id]
            );
        })
        .then(rows => {
            if (Array.isArray(rows)) return res.send(rows[0]);
        })
        .catch(err => {
            if (err && err.code === 'ER_DUP_ENTRY') {
                return res.status(409).send({ message: "Role name already exists" });
            }
            return next(err);
        });
});

router.delete('/:id', function (req, res, next) {
    let id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).send({ message: "Invalid id" });

    query(`UPDATE roles SET isDeleted = 1 WHERE id = ? AND isDeleted = 0`, [id])
        .then(r => {
            if (!r.affectedRows) return res.status(404).send({ message: "Role NOT FOUND" });
            return res.send({ message: "Deleted (soft)", id });
        })
        .catch(next);
});

module.exports = router;
