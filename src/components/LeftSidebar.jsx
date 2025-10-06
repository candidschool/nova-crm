import novalogo from '../NovaLogo.png';
import React, { useState } from 'react';
import { ChevronRight, Menu, X } from 'lucide-react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Settings, 
  LogOut, 
  User,
  Flame,
  Star,
  Snowflake,
  CheckCircle,
  Play,
  ChevronDown
} from 'lucide-react';

const LeftSidebar = ({ 
  activeNavItem = "", 
  activeSubmenuItem = "",
  onLogout,  
  user       
}) => {
  // State for mobile sidebar toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  console.log("activeNavItem:", activeNavItem);
  
  const handleLogout = async (e) => {
    e.preventDefault();
    
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        console.log('Logout initiated from sidebar');
        await onLogout();
        // Close mobile menu after logout
        setIsMobileMenuOpen(false);
      } catch (error) {
        console.error('Logout failed:', error);
        alert('Logout failed. Please try again.');
      }
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger Menu Button */}
      <button 
        className="mobile-hamburger"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`nova-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Mobile Close Button (inside sidebar) */}
        <button 
          className="mobile-close-btn"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="nova-logo">
          <a href="/" style={{ textDecoration: 'none' }} onClick={closeMobileMenu}>
            <img 
              src={novalogo} 
              alt="NOVA International School" 
              className="logo-image"
              style={{
                width: '100%',
                maxWidth: '140px',
                height: 'auto',
                marginBottom: '20px',
                marginLeft:'20px',
                cursor: 'pointer'
              }}
            />
          </a>
        </div>

        {/* User Info */}
        {user && (
          <div className="nova-user-info" style={{
            padding: '10px 15px',
            marginBottom: '20px',
            backgroundColor: isAdmin ? '#fee2e2' : '#dbeafe',
            borderRadius: '8px',
            border: `1px solid ${isAdmin ? '#fecaca' : '#bfdbfe'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} style={{ color: isAdmin ? '#dc2626' : '#2563eb' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                  {user.full_name || user.email}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: isAdmin ? '#dc2626' : '#2563eb', 
                  textTransform: 'capitalize',
                  fontWeight: '500'
                }}>
                  {user.role}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="nova-nav">
          <a 
            href="/dashboard" 
            className={`nova-nav-item ${activeNavItem === "dashboard" ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            <BarChart3 size={18} className="nav-icon" />
            Dashboard
          </a>
          
          
            <a 
              href="/counsellor-performance" 
              className={`nova-nav-item ${activeNavItem === "counsellor" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <TrendingUp size={18} className="nav-icon" />
              Counsellor Performance
            </a>

             <a 
              href="/followup" 
              className={`nova-nav-item ${activeNavItem === "followup" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <TrendingUp size={18} className="nav-icon" />
              Follow Up
            </a>
          
          
          
          
        </nav>
        


        {/* All Leads Section */}
        <div className="nova-all-leads">
          <div className={`all-leads-header ${activeNavItem === "leads" ? "active" : ""}`}>
            <Users size={18} className="nav-icon" />
            Leads
          </div>
          <div className="all-leads-submenu">
            <a 
              href="/all-leads" 
              className={`submenu-item ${activeSubmenuItem === "all" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <Users size={14} className="submenu-icon" />
              All Leads
            </a>
            <a 
              href="/warm" 
              className={`submenu-item ${activeSubmenuItem === "warm" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <Flame size={14} className="submenu-icon" />
              Warm
            </a>
            <a 
              href="/hot" 
              className={`submenu-item ${activeSubmenuItem === "hot" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <Star size={14} className="submenu-icon" />
              Hot
            </a>
            <a 
              href="/cold" 
              className={`submenu-item ${activeSubmenuItem === "cold" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <Snowflake size={14} className="submenu-icon" />
              Cold
            </a>
            <a 
              href="/enrolled" 
              className={`submenu-item ${activeSubmenuItem === "enrolled" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <CheckCircle size={14} className="submenu-icon" />
              Enrolled
            </a>
          </div>
        </div>

        {/* Settings & Logout */}
        <div className="nova-settings">
          {/* ADMIN ONLY: Settings */}
          {isAdmin && (
            <a 
              href="/settings" 
              className={`nova-nav-item ${activeNavItem === "settings" ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <Settings size={18} className="nav-icon" />
              Settings
            </a>
          )}
          
          {/* Logout - available to all users */}
          <button 
            onClick={handleLogout}
            className={`nova-nav-item ${activeNavItem === "logout" ? "active" : ""}`}
            style={{
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit'
            }}
          >
            <LogOut size={18} className="nav-icon" />
            Log out
          </button>
        </div>

        {/* Submenu behavior styles */}
        <style jsx>{`
          /* Ensure submenu only shows when parent is active */
          .nova-all-leads .all-leads-submenu {
            opacity: 1;
            max-height: 300px;
            transition: all 0.3s ease;
          }

          /* Mobile Hamburger Button */
          .mobile-hamburger {
            display: none;
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1001;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
          }

          .mobile-hamburger:hover {
            background: #f9fafb;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
          }

          /* Mobile Overlay */
          .mobile-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
          }

          /* Mobile Close Button */
          .mobile-close-btn {
            display: none;
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            cursor: pointer;
            color: #6b7280;
            z-index: 1002;
          }

          .mobile-close-btn:hover {
            color: #374151;
          }

          /* Mobile Styles */
          @media (max-width: 768px) {
            .mobile-hamburger {
              display: block;
            }

            .mobile-overlay {
              display: block;
            }

            .mobile-close-btn {
              display: block;
            }

            .nova-sidebar {
              position: fixed;
              top: 0;
              left: -100%;
              width: 280px;
              height: 100vh;
              background: #fff;
              z-index: 1000;
              transition: left 0.3s ease;
              overflow-y: auto;
              box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
              padding: 50px 20px 20px 20px;
            }

            .nova-sidebar.mobile-open {
              left: 0;
            }

            /* Adjust logo margin on mobile */
            .nova-sidebar .nova-logo {
              margin-bottom: 30px;
            }

            /* Ensure body doesn't scroll when menu is open */
            
          }

          /* Desktop Styles - Default sidebar behavior */
          @media (min-width: 769px) {
            .nova-sidebar {
    position: relative;
    transform: none;
    box-shadow: none;
  }
          }
        `}</style>
      </div>
    </>
  );
};

export default LeftSidebar;