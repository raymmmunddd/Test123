// dashboard.tsx
"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../sidebar';
import { Package, Plus, AlertTriangle, Clock } from 'lucide-react';
import './dashboard.css';

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  current_quantity: number;
  unit: string;
  min_threshold: number;
  max_threshold: number;
  status: 'healthy' | 'medium' | 'low' | 'out';
}

interface Transaction {
  id: number;
  item_name: string;
  transaction_type: 'usage' | 'restock' | 'adjustment';
  quantity: number;
  unit_name: string;
  notes: string;
  created_at: string;
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<Transaction[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('cafestock_token');
    const userStr = localStorage.getItem('cafestock_user');

    if (!token || !userStr) {
      window.location.href = '/';
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      if (userData.role !== 'barista') {
        window.location.href = `/${userData.role}/dashboard/`;
        return;
      }

      fetchInventoryData(token);
      fetchRecentActivity(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/';
      return;
    }
  }, []);

  const fetchInventoryData = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: InventoryItem[] = await response.json();
        setTotalItems(data.length);
        
        const alertItems = data.filter(item => 
          item.status === 'low' || item.status === 'out'
        );
        setLowStockItems(alertItems);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivity = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/inventory/recent-activity', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: Transaction[] = await response.json();
        setRecentActivity(data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const getAlertColor = () => {
    const alertCount = lowStockItems.length;
    if (alertCount === 0) return '#170d03';
    if (alertCount < 3) return '#e1bc42';
    return '#dc2626';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      healthy: { color: '#16a34a', label: 'Healthy' },
      medium: { color: '#e1bc42', label: 'Medium' },
      low: { color: '#eb912c', label: 'Low Stock' },
      out: { color: '#dc2626', label: 'Out of Stock' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges.healthy;
    
    return (
      <span className="status-badge" style={{ color: badge.color, backgroundColor: `${badge.color}15` }}>
        <AlertTriangle className="badge-icon" />
        {badge.label}
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getTransactionText = (transaction: Transaction) => {
    const type = transaction.transaction_type;
    const qty = transaction.quantity;
    const item = transaction.item_name;
    const unit = transaction.unit_name;
    
    if (type === 'usage') {
      return `Used ${qty} ${unit}(s) of ${item}`;
    } else if (type === 'restock') {
      return `Restocked ${qty} units of ${item}`;
    } else {
      return `Adjusted ${item} stock by ${qty} units`;
    }
  };

  if (isLoading || !user) {
    return (
      <div className="dashboard-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="dashboard-content">
        <div className="dashboard-inner">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Welcome back, {user.username}!</h1>
              <p className="dashboard-subtitle">Track stock levels and log your usage</p>
            </div>
            <button
              className="log-usage-button"
              onClick={() => (window.location.href = "/barista/log-usage/")}
            >
              <Plus className="button-icon" />
              Log Usage
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <h3 className="stat-label">Total Items</h3>
                <Package className="stat-icon" />
              </div>
              <p className="stat-value">{totalItems}</p>
              <p className="stat-description">Active inventory items</p>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <h3 className="stat-label">Stock Alerts</h3>
                <AlertTriangle className="stat-icon" style={{ color: getAlertColor() }} />
              </div>
              <p className="stat-value" style={{ color: getAlertColor() }}>
                {lowStockItems.length}
              </p>
              <p className="stat-description">
                {lowStockItems.length === 0 
                  ? 'All items well stocked' 
                  : lowStockItems.length < 3 
                    ? 'Items need attention' 
                    : 'Items need immediate attention'}
              </p>
            </div>
          </div>

          <div className="content-grid">
            <div className="low-stock-section">
              <div className="section-header">
                <AlertTriangle className="section-icon" style={{ color: getAlertColor() }} />
                <h2 className="section-title">Stock Alerts</h2>
              </div>
              <p className="section-description">Items that need attention</p>
              
              <div className="low-stock-list">
                {lowStockItems.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                    No stock alerts at the moment
                  </p>
                ) : (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="low-stock-item" data-status={item.status}>
                      <div>
                        <h3 className="item-name">{item.name}</h3>
                        <p className="item-remaining">
                          {item.current_quantity} {item.unit} remaining 
                          (Min: {item.min_threshold}, Max: {item.max_threshold})
                        </p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="activity-section">
              <div className="section-header">
                <Clock className="section-icon" />
                <h2 className="section-title">Recent Activity</h2>
              </div>
              <p className="section-description">Your latest inventory updates</p>
              
              <div className="activity-list">
                {recentActivity.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                    No recent activity
                  </p>
                ) : (
                  recentActivity.map((transaction) => (
                    <div key={transaction.id} className="activity-item">
                      <div className="activity-dot"></div>
                      <div className="activity-content">
                        <p className="activity-action">{getTransactionText(transaction)}</p>
                        <div className="activity-meta">
                          <span>{formatTimeAgo(transaction.created_at)}</span>
                          {transaction.notes && (
                            <>
                              <span className="meta-separator"></span>
                              <span>{transaction.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;