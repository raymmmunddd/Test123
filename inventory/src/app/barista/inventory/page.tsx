// barista inventory.tsx

'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Grid3x3, List, AlertCircle, CheckCircle, Package2 } from 'lucide-react'
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
}

export default function CafeInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('inventory')

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
            </div>

            {filteredItems.map(item => (
              <div key={item.id} className="list-row">
                <div>
                  <div className="list-item-name">{item.name}</div>
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
              </div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="empty-state">
            <p>No items found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}