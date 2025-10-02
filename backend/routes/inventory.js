// inventory.js

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

// Get all inventory items with new status logic
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT 
        i.id,
        i.item_name as name,
        c.name as category,
        u.name as unit,
        i.current_stock as current_quantity,
        i.minimum_stock as min_threshold,
        i.maximum_stock as max_threshold,
        i.description,
        i.created_at,
        i.updated_at,
        CASE 
          WHEN i.current_stock = 0 THEN 'out'
          WHEN i.current_stock <= i.minimum_stock THEN 'low'
          WHEN i.current_stock <= (i.minimum_stock + (i.maximum_stock - i.minimum_stock) * 0.5) THEN 'medium'
          ELSE 'healthy'
        END as status
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN units u ON i.unit_id = u.id
      ORDER BY i.item_name ASC
    `);

    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error fetching inventory' });
  }
});

// Get recent activity for current user 
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const [transactions] = await db.query(`
      SELECT 
        t.id,
        i.item_name,
        un.name AS unit_name,  
        t.transaction_type,
        t.quantity,
        t.notes,
        t.created_at
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      LEFT JOIN units un ON i.unit_id = un.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 3;
    `, [req.user.id, req.params.itemId]);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Server error fetching activity' });
  }
});

// Get recent activity for all users (manager only) 
router.get('/recent-activity-all', authenticateToken, async (req, res) => {
  try {
    const [transactions] = await db.query(`
      SELECT 
        t.id,
        i.item_name,
        un.name AS unit_name,  
        t.transaction_type,
        t.quantity,
        t.notes,
        t.created_at,
        u.username
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      LEFT JOIN units un ON i.unit_id = un.id
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 3;
    `, [req.user.id, req.params.itemId]);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Server error fetching activity' });
  }
});

// Get single inventory item by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT 
        i.id,
        i.item_name as name,
        c.name as category,
        u.name as unit,
        i.current_stock as current_quantity,
        i.minimum_stock as min_threshold,
        i.maximum_stock as max_threshold,
        i.description,
        i.created_at,
        i.updated_at,
        CASE 
          WHEN i.current_stock = 0 THEN 'out'
          WHEN i.current_stock <= i.minimum_stock THEN 'low'
          WHEN i.current_stock <= (i.minimum_stock + (i.maximum_stock - i.minimum_stock) * 0.5) THEN 'medium'
          ELSE 'healthy'
        END as status
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(items[0]);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Server error fetching item' });
  }
});

// Log recipe usage - deduct ingredients based on servings
router.post('/log-recipe-usage', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { recipe_id, servings } = req.body;

    // Validation
    if (!recipe_id || !servings || servings <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Recipe ID and positive servings count required' 
      });
    }

    // Get recipe ingredients
    const [ingredients] = await connection.query(`
      SELECT 
        ri.item_id,
        ri.quantity_required,
        i.item_name,
        i.current_stock,
        u.name as unit
      FROM recipe_ingredients ri
      JOIN items i ON ri.item_id = i.id
      JOIN units u ON i.unit_id = u.id
      WHERE ri.recipe_id = ?
    `, [recipe_id]);

    if (ingredients.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Recipe not found or has no ingredients' });
    }

    // Check if enough stock for all ingredients
    const insufficientStock = [];
    for (const ing of ingredients) {
      const requiredQuantity = ing.quantity_required * servings;
      if (ing.current_stock < requiredQuantity) {
        insufficientStock.push({
          item: ing.item_name,
          required: requiredQuantity,
          available: ing.current_stock,
          unit: ing.unit
        });
      }
    }

    if (insufficientStock.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Insufficient stock',
        details: insufficientStock
      });
    }

    // Deduct stock for each ingredient
    for (const ing of ingredients) {
      const quantityToDeduct = ing.quantity_required * servings;
      await connection.query(`
        UPDATE items 
        SET current_stock = current_stock - ?
        WHERE id = ?
      `, [quantityToDeduct, ing.item_id]);

      // Log the transaction
      await connection.query(`
        INSERT INTO transactions 
          (item_id, transaction_type, quantity, user_id, notes)
        VALUES (?, 'usage', ?, ?, ?)
      `, [
        ing.item_id,
        quantityToDeduct,
        req.user.id,
        `Recipe usage: ${servings} serving(s)`
      ]);
    }

    await connection.commit();
    res.json({ 
      message: 'Usage logged successfully',
      servings: servings,
      items_updated: ingredients.length
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error logging recipe usage:', error);
    res.status(500).json({ error: 'Server error logging usage' });
  } finally {
    connection.release();
  }
});

// Log manual usage - deduct custom quantities
router.post('/log-manual-usage', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { items } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Items array required with at least one item' 
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.item_id || !item.quantity || item.quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Each item must have item_id and positive quantity' 
        });
      }
    }

    // Check stock availability
    const insufficientStock = [];
    for (const item of items) {
      const [stockCheck] = await connection.query(`
        SELECT item_name, current_stock, u.name as unit
        FROM items i
        JOIN units u ON i.unit_id = u.id
        WHERE i.id = ?
      `, [item.item_id]);

      if (stockCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: `Item with ID ${item.item_id} not found` });
      }

      if (stockCheck[0].current_stock < item.quantity) {
        insufficientStock.push({
          item: stockCheck[0].item_name,
          required: item.quantity,
          available: stockCheck[0].current_stock,
          unit: stockCheck[0].unit
        });
      }
    }

    if (insufficientStock.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Insufficient stock',
        details: insufficientStock
      });
    }

    // Deduct stock and log transactions
    for (const item of items) {
      await connection.query(`
        UPDATE items 
        SET current_stock = current_stock - ?
        WHERE id = ?
      `, [item.quantity, item.item_id]);

      await connection.query(`
        INSERT INTO transactions 
          (item_id, transaction_type, quantity, user_id, notes)
        VALUES (?, 'usage', ?, ?, 'Manual usage entry')
      `, [item.item_id, item.quantity, req.user.id]);
    }

    await connection.commit();
    res.json({ 
      message: 'Manual usage logged successfully',
      items_updated: items.length
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error logging manual usage:', error);
    res.status(500).json({ error: 'Server error logging usage' });
  } finally {
    connection.release();
  }
});

// Create new inventory item (manager only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    const { item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description } = req.body;

    // Validation
    if (!item_name || !category_id || current_stock === undefined || !unit_id || 
        minimum_stock === undefined || maximum_stock === undefined) {
      return res.status(400).json({ 
        error: 'All required fields must be provided (item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock)' 
      });
    }

    const [result] = await db.query(`
      INSERT INTO items 
        (item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description || null]);

    res.status(201).json({
      message: 'Item created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: 'Server error creating item' });
  }
});

// Update entire inventory item (manager only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    const { item_name, category_id, unit_id, current_stock, minimum_stock, maximum_stock, description } = req.body;

    if (!item_name || current_stock === undefined || 
        minimum_stock === undefined || maximum_stock === undefined) {
      return res.status(400).json({ 
        error: 'All required fields must be provided' 
      });
    }

    // Fetch old item before update
    const [oldItems] = await db.query(`SELECT * FROM items WHERE id = ?`, [req.params.id]);
    if (oldItems.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const oldItem = oldItems[0];

    // Update the item
    const [result] = await db.query(`
      UPDATE items 
      SET item_name = ?, current_stock = ?, 
          minimum_stock = ?, maximum_stock = ?, description = ?
      WHERE id = ?
    `, [item_name, current_stock, minimum_stock, maximum_stock, description || null, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Log a transaction for the update
    await db.query(`
      INSERT INTO transactions (item_id, transaction_type, quantity, user_id, notes)
      VALUES (?, 'update', ?, ?, ?)
    `, [
      req.params.id,
      current_stock, 
      req.user.id,
      `Item updated. Old stock: ${oldItem.current_stock}, New stock: ${current_stock}`
    ]);

    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Server error updating item' });
  }
});

// Delete inventory item (manager only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    // Fetch item before delete
    const [items] = await db.query(`SELECT * FROM items WHERE id = ?`, [req.params.id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = items[0];

    // Delete item
    const [result] = await db.query('DELETE FROM items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: 'Server error deleting item' });
  }
});

module.exports = router;