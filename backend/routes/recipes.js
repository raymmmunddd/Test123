// recipes.js

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

// Get all recipes with their ingredients
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get all recipes
    const [recipes] = await db.query(`
      SELECT id, recipe_name as name
      FROM recipes
      ORDER BY recipe_name ASC
    `);

    // For each recipe, get its ingredients with stock status
    for (let recipe of recipes) {
      const [ingredients] = await db.query(`
        SELECT 
          ri.item_id,
          i.item_name,
          ri.quantity_required as quantity,
          u.name as unit,
          i.current_stock,
          CASE 
            WHEN i.current_stock <= i.minimum_stock THEN 'low'
            ELSE 'in_stock'
          END as status
        FROM recipe_ingredients ri
        JOIN items i ON ri.item_id = i.id
        JOIN units u ON i.unit_id = u.id
        WHERE ri.recipe_id = ?
        ORDER BY i.item_name ASC
      `, [recipe.id]);

      recipe.ingredients = ingredients;
    }

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Server error fetching recipes' });
  }
});

module.exports = router;