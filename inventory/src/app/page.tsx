'use client'

import { useState } from 'react'
import { BarChart3, Users, Coffee } from 'lucide-react'
import './page.css'

type UserRole = 'manager' | 'barista'
type FormMode = 'signin' | 'signup'

interface FormData {
  username: string
  password: string
}

export default function CafeStockLogin() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager')
  const [formMode, setFormMode] = useState<FormMode>('signin')
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleModeChange = (mode: FormMode) => {
    setFormMode(mode)
    setFormData({
      username: '',
      password: ''
    })
    setError('')

    // force role = barista
    if (mode === 'signup') {
      setSelectedRole('barista')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const endpoint = formMode === 'signin' ? '/signin' : '/signup'
      const response = await fetch(`http://localhost:3001/api/auth${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: selectedRole
        })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('cafestock_token', data.token)
        localStorage.setItem('cafestock_user', JSON.stringify(data.user))

        // Redirect based on role and action
        if (formMode === 'signup') {
          window.location.href = '/'
          alert('Account created successfully! Please sign in.')
        } else {
          if (data.user.role === 'barista') {
            window.location.href = '/barista/dashboard'
          } else if (data.user.role === 'manager') {
            window.location.href = '/manager/dashboard'
          }
        }
        
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      console.error('Request error:', err)
      setError('Unable to connect to server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="cafe-stock-container">
      <div className="branding-section">
        <div className="branding-content">
          <div className="logo-container">
            <div className="logo-icon logo-icon-primary">
              <Coffee size={36} />
            </div>
            <h1 className="brand-title">CafeStock</h1>
          </div>

          <h2 className="tagline">
            Smart Inventory Management for Modern Cafes
          </h2>
          <p className="description">
            Track ingredients, manage stock levels, and streamline your cafe operations with real-time updates and intelligent alerts.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-header">
                <div className="feature-icon feature-icon-primary">
                  <BarChart3 size={24} />
                </div>
                <h3 className="feature-title">Smart Tracking</h3>
              </div>
              <p className="feature-description">
                Real-time inventory updates
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-header">
                <div className="feature-icon feature-icon-secondary">
                  <Users size={24} />
                </div>
                <h3 className="feature-title">Team Management</h3>
              </div>
              <p className="feature-description">
                Role-based access control
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-card">
          <h2 className="form-title">
            {formMode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="form-subtitle">
            {formMode === 'signin' 
              ? 'Sign in to access your cafe inventory dashboard'
              : 'Create your barista account to get started'
            }
          </p>

          <div className="mode-toggle">
            <button
              onClick={() => handleModeChange('signin')}
              className={`mode-button ${formMode === 'signin' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeChange('signup')}
              className={`mode-button ${formMode === 'signup' ? 'active' : ''}`}
            >
              Sign Up
            </button>
          </div>

          {formMode === 'signin' && (
            <div className="role-section">
              <p className="role-label">Select role to sign in</p>
              <div className="role-buttons">
                <button
                  onClick={() => handleRoleChange('manager')}
                  className={`role-button ${selectedRole === 'manager' ? 'active' : ''}`}
                >
                  <div>Manager</div>
                  <div className="role-subtitle">Full Access</div>
                </button>
                <button
                  onClick={() => handleRoleChange('barista')}
                  className={`role-button ${selectedRole === 'barista' ? 'active' : ''}`}
                >
                  <div>Barista</div>
                  <div className="role-subtitle">Usage Tracking</div>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c33',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter your username"
                className="form-input"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
                className="form-input"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}  
            >
              {isLoading ? 'Please wait...' : 
                formMode === 'signin' 
                  ? `Sign In as ${selectedRole === 'manager' ? 'Manager' : 'Barista'}`
                  : 'Create Barista Account'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}