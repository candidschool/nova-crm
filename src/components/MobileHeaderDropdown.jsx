// MobileHeaderDropdown.jsx - Fixed version
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreVertical, X } from 'lucide-react';
import FilterDropdown from './FilterDropdown';

const MobileHeaderDropdown = ({
  searchTerm,
  onSearchChange,
  showFilter,
  setShowFilter,
  counsellorFilters,
  stageFilters,
  statusFilters,
  alertFilter, // ← Added missing prop
  setCounsellorFilters,
  setStageFilters,
  setStatusFilters,
  setAlertFilter, // ← Added missing prop
  settingsData,
  getFieldLabel,
  getStageKeyFromName,
  getStageDisplayName,
  onShowImportModal,
  onShowAddForm
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.mobile-header-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen]);

  // Close dropdown when filter is opened
  useEffect(() => {
    if (showFilter && isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  }, [showFilter, isDropdownOpen]);

  const handleFilterToggle = () => {
    setShowFilter(!showFilter);
    setIsDropdownOpen(false); // Close the dropdown when opening filter
  };

  const handleClearAllFilters = () => {
    setCounsellorFilters([]);
    setStageFilters([]);
    setStatusFilters([]);
    setAlertFilter(false);
  };

  // Check if any filters are active
  const hasActiveFilters = counsellorFilters.length > 0 || 
                          stageFilters.length > 0 || 
                          statusFilters.length > 0 || 
                          alertFilter;

  return (
    <div className="mobile-header-dropdown" style={{ position: 'relative' }}>
      {/* Dropdown Toggle Button */}
      <button
        className="mobile-dropdown-toggle"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Mobile dropdown button clicked'); // Debug log
          setIsDropdownOpen(!isDropdownOpen);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          backgroundColor: isDropdownOpen ? '#3b82f6' : '#f8f9fa',
          color: isDropdownOpen ? 'white' : '#374151',
          border: `1px solid ${isDropdownOpen ? '#3b82f6' : '#e5e7eb'}`,
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          zIndex: 1002,
          position: 'relative'
        }}
      >
        {isDropdownOpen ? <X size={20} /> : <MoreVertical size={20} />}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div 
          className="mobile-dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 1001,
            minWidth: '280px',
            marginTop: '8px',
            padding: '16px'
          }}
        >
          {/* Search Section */}
          <div className="dropdown-section" style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#374151'
            }}>
              Search Leads
            </label>
            <div className="search-container" style={{ position: 'relative' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={onSearchChange}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Filter Section */}
          <div className="dropdown-section" style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#374151'
            }}>
              Filters
              {/* Show active filter count */}
              {hasActiveFilters && (
                <span style={{
                  marginLeft: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {counsellorFilters.length + stageFilters.length + statusFilters.length + (alertFilter ? 1 : 0)}
                </span>
              )}
            </label>
            
            <button
              onClick={handleFilterToggle}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: showFilter ? '#eff6ff' : '#f9fafb',
                border: showFilter ? '1px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: showFilter ? '#1d4ed8' : '#374151',
                transition: 'all 0.2s'
              }}
            >
              <Filter size={16} />
              {showFilter ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Actions Section */}
          <div className="dropdown-section">
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#374151'
            }}>
              Actions
            </label>
            
            {/* Import Leads Button */}
            <button
              onClick={() => {
                onShowImportModal();
                setIsDropdownOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #10b981',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: '#059669',
                marginBottom: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#d1fae5';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ecfdf5';
              }}
            >
              <Plus size={16} />
              Import Leads
            </button>

            {/* Add Lead Button */}
            <button
              onClick={() => {
                onShowAddForm();
                setIsDropdownOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: 'white',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#3b82f6';
              }}
            >
              <Plus size={16} />
              Add Lead
            </button>
          </div>
        </div>
      )}

      {/* Filter Dropdown - Rendered separately, positioned relative to the dropdown container */}
      {showFilter && (
        <div style={{ 
          position: 'absolute',
          top: '100%',
          right: 0,
          zIndex: 1003,
          marginTop: '8px'
        }}>
          <FilterDropdown
            isOpen={showFilter}
            onClose={() => setShowFilter(false)}
            counsellorFilters={counsellorFilters}
            stageFilters={stageFilters}
            statusFilters={statusFilters}
            alertFilter={alertFilter}
            setCounsellorFilters={setCounsellorFilters}
            setStageFilters={setStageFilters}
            setStatusFilters={setStatusFilters}
            setAlertFilter={setAlertFilter}
            onClearAll={handleClearAllFilters}
            settingsData={settingsData}
            getFieldLabel={getFieldLabel}
            getStageKeyFromName={getStageKeyFromName}
            getStageDisplayName={getStageDisplayName}
          />
        </div>
      )}
    </div>
  );
};

export default MobileHeaderDropdown;