"use client"

import React, { useState, useEffect } from 'react';
import { Home, Package, Plus, Settings, Coffee, LogOut, Menu, History, Users, Download, X } from 'lucide-react';
import './sidebar.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface User {
  id: number;
  username: string;
  role: 'manager' | 'barista';
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get user data 
    const userStr = localStorage.getItem('cafestock_user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('cafestock_token');
    localStorage.removeItem('cafestock_user');
    window.location.href = '/';
  };

  const handleNavigation = (itemId: string) => {
    setActiveTab(itemId);
    
    // Navigate to the corresponding page
    if (!user) return;
    
    const basePath = `/${user.role}`;
    
    switch(itemId) {
      case 'dashboard':
        window.location.href = `${basePath}/dashboard/`;
        break;
      case 'inventory':
        window.location.href = `${basePath}/inventory/`;
        break;
      case 'add-item':
        window.location.href = `${basePath}/add-item/`;
        break;
      case 'history':
        window.location.href = `${basePath}/history/`;
        break;
      case 'team':
        window.location.href = `${basePath}/team/`;
        break;
      case 'export':
        window.location.href = `${basePath}/export/`;
        break;
        default:
        break;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'add-item', label: 'Add Item', icon: Plus },
    { id: 'history', label: 'History', icon: History },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'export', label: 'Export', icon: Download },
  ];

  if (!user) {
    return (
      <div className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <Coffee className="logo-icon" />
            </div>
            {!isCollapsed && (
              <div className="brand-info">
                <h1 className="brand-name">CafeStock</h1>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <Coffee className="logo-icon" />
          </div>
          {!isCollapsed && (
            <div className="brand-info">
              <h1 className="brand-name">CafeStock</h1>
              <div className="brand-meta">
                <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
                <span className="meta-dot"></span>
                <span>{user.username}</span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="collapse-button"
        >
          {isCollapsed ? <Menu className="collapse-icon" /> : <X className="collapse-icon" />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {!isCollapsed && (
          <p className="nav-label">Navigation</p>
        )}
        <div className="nav-items">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''} ${isCollapsed ? 'nav-item-collapsed' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="nav-icon" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button 
          onClick={handleSignOut}
          className={`signout-button ${isCollapsed ? 'signout-button-collapsed' : ''}`}
          title={isCollapsed ? 'Sign Out' : ''}
        >
          <LogOut className="signout-icon" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};