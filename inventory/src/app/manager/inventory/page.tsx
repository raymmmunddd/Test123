'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Grid3x3, List, AlertCircle, CheckCircle, Package2, Edit2, Trash2, X } from 'lucide-react'
import { Sidebar } from '../sidebar';
import './inventory.css'

interface InventoryItem {
  id: number
  name: string
  category: string
  current_quantity: number
  unit: string
  min_threshold: number
  max_threshold: number
  status: 'healthy' | 'medium' | 'low' | 'out'
  category_id?: number
  unit_id?: number
  description?: string
}

export default function CafeInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('inventory')
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setItems(data)
      } else {
        setError('Failed to load inventory')
      }
    } catch (err) {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (value: number) => {
    return value % 1 === 0 ? Math.floor(value) : value
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = ['All', ...Array.from(new Set(items.map(item => item.category)))]

  const getStatusBadge = (item: InventoryItem) => {
    const badges = {
      healthy: { color: '#16a34a', label: 'Healthy', icon: CheckCircle },
      medium: { color: '#e1bc42', label: 'Medium', icon: AlertCircle },
      low: { color: '#eb912c', label: 'Low Stock', icon: AlertCircle },
      out: { color: '#dc2626', label: 'Out of Stock', icon: AlertCircle }
    };
    
    const badge = badges[item.status] || badges.healthy;
    const Icon = badge.icon;
    
    return (
      <span className="status-badge" style={{ color: badge.color, backgroundColor: `${badge.color}15` }}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  }

  const getProgressPercentage = (item: InventoryItem) => {
    return Math.min((item.current_quantity / item.max_threshold) * 100, 100)
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setShowEditModal(true)
  }

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch(`http://localhost:3001/api/inventory/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setShowDeleteModal(false)
        setItemToDelete(null)
        fetchInventory()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete item')
      }
    } catch (err) {
      alert('Unable to delete item')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch(`http://localhost:3001/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_name: editingItem.name,
          category_id: editingItem.category_id,
          unit_id: editingItem.unit_id,
          current_stock: editingItem.current_quantity,
          minimum_stock: editingItem.min_threshold,
          maximum_stock: editingItem.max_threshold,
          description: editingItem.description
        })
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingItem(null)
        fetchInventory()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update item')
      }
    } catch (err) {
      alert('Unable to update item')
    }
  }

  if (loading) {
    return (
      <div className="loading-message">
        Loading inventory...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />  

      <div className="inventory-content" style={{ flex: 1 }}>
        <div className="inventory-header">
          <div>
            <h1 className="inventory-title">Inventory</h1>
            <p className="inventory-subtitle">
              Manage your cafe's stock levels and track usage
            </p>
          </div>
          
          <div className="status-legend">
            <div className="legend-item-healthy">
              <span className="dot"></span> Healthy
            </div>
            <div className="legend-item-medium">
              <span className="dot"></span> Medium   
            </div>
            <div className="legend-item-low">
              <span className="dot"></span> Low
            </div>
            <div className="legend-item-out">
              <span className="dot"></span> Out of Stock
            </div>
          </div>
        </div>

        <div className="search-filters-container">
          <div className="search-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search inventory items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-container">
            <Filter size={20} style={{ color: '#6b7280' }} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <Grid3x3 size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        <div className="item-count">
          <span><Package2 size={16} /></span>
          <span>Showing {filteredItems.length} of {items.length} items</span>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="grid-view">
            {filteredItems.map(item => (
              <div key={item.id} className="inventory-card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{item.name}</h3>
                    <p className="card-category">{item.category}</p>
                  </div>
                  {getStatusBadge(item)}
                </div>

                <div className="card-quantity">
                  <div className="quantity-value">{formatNumber(item.current_quantity)}</div>
                  <div className="quantity-unit">{item.unit}</div>
                </div>

                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar progress-bar-${item.status}`}
                    style={{ width: `${getProgressPercentage(item)}%` }}
                  />
                </div>

                <div className="threshold-info">
                  <span>Min: {formatNumber(item.min_threshold)}</span>
                  <span>Max: {formatNumber(item.max_threshold)}</span>
                </div>

                <div className="card-actions">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(item)
                    }}
                    className="action-button edit-button"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(item)
                    }}
                    className="action-button delete-button"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="list-view">
            <div className="list-header">
              <div>Item</div>
              <div>Category</div>
              <div>Stock</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {filteredItems.map(item => (
              <div key={item.id} className="list-row">
                <div>
                  <div className="list-item-name">{item.name}</div>
                  <div className="list-item-unit">{item.unit}</div>
                </div>

                <div>
                  <span className="list-category-badge">{item.category}</span>
                </div>

                <div>
                  <div className="list-stock-value">
                    {formatNumber(item.current_quantity)} {item.unit}
                  </div>
                  <div className="list-threshold">
                    Min: {formatNumber(item.min_threshold)} | Max: {formatNumber(item.max_threshold)}
                  </div>
                </div>

                <div>
                  {getStatusBadge(item)}
                </div>

                <div className="list-actions">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="action-icon-button edit-icon-button"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(item)}
                    className="action-icon-button delete-icon-button"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="empty-state">
            <p>No items found matching your search.</p>
          </div>
        )}

        {showEditModal && editingItem && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Item</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="modal-close-button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input
                    type="number"
                    value={editingItem.current_quantity}
                    onChange={(e) => setEditingItem({...editingItem, current_quantity: Number(e.target.value)})}
                    className="form-input"
                    min="0"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Minimum Stock</label>
                    <input
                      type="number"
                      value={editingItem.min_threshold}
                      onChange={(e) => setEditingItem({...editingItem, min_threshold: Number(e.target.value)})}
                      className="form-input"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Maximum Stock</label>
                    <input
                      type="number"
                      value={editingItem.max_threshold}
                      onChange={(e) => setEditingItem({...editingItem, max_threshold: Number(e.target.value)})}
                      className="form-input"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    className="form-textarea"
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="modal-button save-button"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && itemToDelete && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Delete Item</h2>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="modal-close-button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <p className="delete-warning">
                  Are you sure you want to delete <strong>{itemToDelete.name}</strong>?
                </p>
                <p className="delete-subtext">
                  This action cannot be undone.
                </p>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="modal-button delete-confirm-button"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}