// log-usage.tsx

'use client'

import { useState, useEffect } from 'react'
import { Coffee, Plus, Minus, Save } from 'lucide-react'
import { Sidebar } from '../sidebar'
import './log.css'

interface Recipe {
  id: number
  name: string
  ingredients: {
    item_id: number
    item_name: string
    quantity: number
    unit: string
    current_stock: number
    status: 'low' | 'in_stock'
  }[]
}

interface InventoryItem {
  id: number
  name: string
  current_quantity: number
  unit: string
}

interface ManualUsageItem {
  item_id: number
  quantity: number
  available_stock: number
}

export default function LogUsage() {
  const [activeView, setActiveView] = useState<'recipes' | 'manual'>('recipes')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({})
  const [activeTab, setActiveTab] = useState('log-usage')
  
  // Manual entry state
  const [manualItems, setManualItems] = useState<ManualUsageItem[]>([])

  useEffect(() => {
    if (activeView === 'recipes') {
      fetchRecipes()
    } else {
      fetchInventoryItems()
    }
  }, [activeView])

  const formatNumber = (value: number) => {
    return value % 1 === 0 ? Math.floor(value) : value
  }

  const fetchRecipes = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('http://localhost:3001/api/recipes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecipes(data)
        // Initialize quantities to 0 for all recipes
        const initialQuantities: { [key: number]: number } = {}
        data.forEach((recipe: Recipe) => {
          initialQuantities[recipe.id] = 0
        })
        setQuantities(initialQuantities)
      } else {
        setError('Failed to load recipes')
      }
    } catch (err) {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchInventoryItems = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInventoryItems(data)
      } else {
        setError('Failed to load inventory')
      }
    } catch (err) {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (recipeId: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [recipeId]: Math.max(0, (prev[recipeId] || 0) + delta)
    }))
  }

  const handleLogUsage = async (recipeId: number) => {
    const quantity = quantities[recipeId]
    if (quantity <= 0) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('http://localhost:3001/api/inventory/log-recipe-usage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe_id: recipeId,
          servings: quantity
        })
      })

      if (response.ok) {
        // Reset quantity and refresh recipes
        setQuantities(prev => ({ ...prev, [recipeId]: 0 }))
        fetchRecipes()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to log usage')
      }
    } catch (err) {
      setError('Unable to connect to server')
    }
  }

  const addManualItem = () => {
    setManualItems(prev => [...prev, { item_id: 0, quantity: 0, available_stock: 0 }])
  }

  const removeManualItem = (index: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateManualItem = (index: number, field: string, value: any) => {
    setManualItems(prev => {
      const newItems = [...prev]
      if (field === 'item_id') {
        const item = inventoryItems.find(i => i.id === parseInt(value))
        newItems[index] = {
          ...newItems[index],
          item_id: parseInt(value),
          available_stock: item?.current_quantity || 0
        }
      } else {
        newItems[index] = { ...newItems[index], [field]: parseFloat(value) || 0 }
      }
      return newItems
    })
  }

  const handleLogManualUsage = async () => {
    const validItems = manualItems.filter(item => item.item_id > 0 && item.quantity > 0)
    if (validItems.length === 0) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('http://localhost:3001/api/inventory/log-manual-usage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: validItems })
      })

      if (response.ok) {
        setManualItems([])
        fetchInventoryItems()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to log usage')
      }
    } catch (err) {
      setError('Unable to connect to server')
    }
  }

  if (loading) {
    return (
      <div className="loading-message">
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="log-usage-content">
        {/* Header */}
        <div className="log-usage-header">
          <div>
            <h1 className="log-usage-title">Log Usage</h1>
            <p className="log-usage-subtitle">
              Track ingredient usage from recipes or manual entries
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="view-tabs">
          <button
            onClick={() => setActiveView('recipes')}
            className={`tab-button ${activeView === 'recipes' ? 'active' : ''}`}
          >
            <Coffee size={20} />
            Recipes
          </button>
          <button
            onClick={() => setActiveView('manual')}
            className={`tab-button ${activeView === 'manual' ? 'active' : ''}`}
          >
            <Plus size={20} />
            Manual Entry
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Recipe View */}
        {activeView === 'recipes' && (
          <>
            <h2 className="section-title">Recipe Usage</h2>
            <div className="recipe-grid">
              {recipes.map(recipe => (
                <div key={recipe.id} className="recipe-card">
                  <div className="recipe-header">
                    <div>
                      <h3 className="recipe-title">{recipe.name}</h3>
                    </div>
                  </div>

                  <div className="ingredients-section">
                    <p className="ingredients-label">Ingredients per serving:</p>
                    <p className='ingredient-name'>Auto-deducts ingredients</p>
                    <div className="ingredients-list">
                      {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="ingredient-item">
                          <div className="ingredient-info">
                            <span className="ingredient-name">{ing.item_name}:</span>
                            <span className="ingredient-quantity">
                              {formatNumber(ing.quantity)}{ing.unit}
                            </span>
                          </div>
                          <span className={`ingredient-status ${ing.status === 'low' ? 'status-low' : 'status-in-stock'}`}>
                            {ing.status === 'low' ? 'Low Stock' : 'In Stock'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="quantity-controls">
                    <button
                      onClick={() => handleQuantityChange(recipe.id, -1)}
                      className="quantity-button"
                      disabled={quantities[recipe.id] <= 0}
                    >
                      <Minus size={20} />
                    </button>
                    <input
                      type="number"
                      value={quantities[recipe.id] || 0}
                      onChange={(e) => setQuantities(prev => ({
                        ...prev,
                        [recipe.id]: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                      className="quantity-input"
                    />
                    <button
                      onClick={() => handleQuantityChange(recipe.id, 1)}
                      className="quantity-button"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleLogUsage(recipe.id)}
                    className="log-button"
                    disabled={quantities[recipe.id] <= 0}
                  >
                    Log Usage
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Manual Entry View */}
        {activeView === 'manual' && (
          <>
            <div className="manual-header">
              <h2 className="section-title">Manual Usage Entry</h2>
              <button onClick={addManualItem} className="add-item-button">
                <Plus size={20} />
                Add Item
              </button>
            </div>

            {manualItems.length === 0 ? (
              <div className="empty-state">
                <Plus size={48} className="empty-icon" />
                <p className="empty-title">No items added</p>
                <p className="empty-subtitle">Add items to log manual usage</p>
                <button onClick={addManualItem} className="empty-button">
                  <Plus size={20} />
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="manual-entry-container">
                <div className="usage-items-card">
                  <h3 className="usage-items-title">Usage Items</h3>
                  <p className="usage-items-subtitle">
                    Select items and quantities to deduct from inventory
                  </p>

                  <div className="table-container">
                    <table className="usage-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Available Stock</th>
                          <th>Quantity to Use</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualItems.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <select
                                value={item.item_id}
                                onChange={(e) => updateManualItem(index, 'item_id', e.target.value)}
                                className="table-select"
                              >
                                <option value="0">Select item...</option>
                                {inventoryItems.map(invItem => (
                                  <option key={invItem.id} value={invItem.id}>
                                    {invItem.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span className="stock-value">{formatNumber(item.available_stock)}</span>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateManualItem(index, 'quantity', e.target.value)}
                                className="table-input"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td>
                              <button
                                onClick={() => removeManualItem(index)}
                                className="remove-button"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="action-buttons">
                    <button
                      onClick={handleLogManualUsage}
                      className="log-all-button"
                      disabled={manualItems.filter(i => i.item_id > 0 && i.quantity > 0).length === 0}
                    >
                      <Save size={20} />
                      Log All Usage
                    </button>
                    <button
                      onClick={addManualItem}
                      className="add-another-button"
                    >
                      <Plus size={20} />
                      Add Another Item
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}