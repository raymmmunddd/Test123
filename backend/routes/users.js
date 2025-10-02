// routes/users.js

const express = require('express');
const db = require('../config/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ✅ Get total baristas
router.get('/baristas/count', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE role = 'barista'`
    );

    res.json({ total: rows[0].total });
  } catch (error) {
    console.error('Error fetching barista count:', error);
    res.status(500).json({ error: 'Server error fetching barista count' });
  }
});

module.exports = router;
