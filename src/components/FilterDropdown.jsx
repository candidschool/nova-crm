// FilterDropdown.jsx - Reusable Component with Two-Level Dropdown
import React, { useState } from 'react';
import { X, Filter, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

const FilterDropdown = ({ 
  isOpen, 
  onClose, 
  counsellorFilters, 
  stageFilters, 
  statusFilters = [], // Status filter
  alertFilter = false, // NEW: Alert filter
  setCounsellorFilters, 
  setStageFilters, 
  setStatusFilters, // Status filter setter
  setAlertFilter, // NEW: Alert filter setter
  onClearAll,
  settingsData, // Receive settings data
  getFieldLabel, // NEW: Receive getFieldLabel function
  getStageKeyFromName, // NEW: Stage conversion function
  getStageDisplayName // NEW: Stage conversion function
}) => {
  const [expandedSection, setExpandedSection] = useState(null);

  // Get dynamic counsellors from settings
  const counsellors = settingsData?.counsellors?.map(counsellor => counsellor.name) || ['Assign Counsellor'];

  // Get dynamic stages from settings (display names for UI)
  const stages = settingsData?.stages?.map(stage => stage.name) || ['New Lead'];

  // Get dynamic statuses from settings (unique stage statuses)
  const statuses = [...new Set(settingsData?.stages?.map(stage => stage.status).filter(Boolean))] || ['New'];

  const handleCounsellorChange = (counsellor) => {
    if (counsellorFilters.includes(counsellor)) {
      setCounsellorFilters(counsellorFilters.filter(c => c !== counsellor));
    } else {
      setCounsellorFilters([...counsellorFilters, counsellor]);
    }
  };

  // Handle stage filtering with stage_key conversion
  const handleStageChange = (stageName) => {
    if (stageFilters.includes(stageName)) {
      setStageFilters(stageFilters.filter(s => s !== stageName));
    } else {
      setStageFilters([...stageFilters, stageName]);
    }
  };

  const handleStatusChange = (status) => {
    if (statusFilters.includes(status)) {
      setStatusFilters(statusFilters.filter(s => s !== status));
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  // NEW: Handle alert filter change
  const handleAlertChange = () => {
    setAlertFilter(!alertFilter);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getFilterCount = (type) => {
    switch(type) {
      case 'counsellor': return counsellorFilters.length;
      case 'stage': return stageFilters.length;
      case 'status': return statusFilters.length;
      case 'alert': return alertFilter ? 1 : 0; // NEW: Alert filter count
      default: return 0;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="filter-backdrop" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999
        }}
      ></div>

      {/* Filter Dropdown */}
      <div 
        className="filter-dropdown"
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          width: '320px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h6 style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>Filter Leads</h6>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Content */}
        <div style={{ padding: '16px' }}>
          
          {/* Counsellor Filter Section with dynamic label */}
          <div style={{ marginBottom: '12px' }}>
            <div 
              onClick={() => toggleSection('counsellor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '8px 0',
                borderBottom: '1px solid #f3f4f6'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {getFieldLabel ? getFieldLabel('counsellor') : 'Counsellor'}
                </span>
                {getFilterCount('counsellor') > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {getFilterCount('counsellor')}
                  </span>
                )}
              </div>
              {expandedSection === 'counsellor' ? 
                <ChevronDown size={16} /> : 
                <ChevronRight size={16} />
              }
            </div>
            
            {expandedSection === 'counsellor' && (
              <div style={{ paddingTop: '12px' }}>
                {counsellors.map(counsellor => (
                  <label 
                    key={counsellor}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={counsellorFilters.includes(counsellor)}
                      onChange={() => handleCounsellorChange(counsellor)}
                      style={{ marginRight: '8px' }}
                    />
                    {counsellor}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Stage Filter Section with dynamic label */}
          <div style={{ marginBottom: '12px' }}>
            <div 
              onClick={() => toggleSection('stage')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '8px 0',
                borderBottom: '1px solid #f3f4f6'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {getFieldLabel ? getFieldLabel('stage') : 'Stage'}
                </span>
                {getFilterCount('stage') > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {getFilterCount('stage')}
                  </span>
                )}
              </div>
              {expandedSection === 'stage' ? 
                <ChevronDown size={16} /> : 
                <ChevronRight size={16} />
              }
            </div>
            
            {expandedSection === 'stage' && (
              <div style={{ paddingTop: '12px' }}>
                {stages.map(stageName => (
                  <label 
                    key={stageName}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={stageFilters.includes(stageName)}
                      onChange={() => handleStageChange(stageName)}
                      style={{ marginRight: '8px' }}
                    />
                    {stageName}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Section */}
          <div style={{ marginBottom: '12px' }}>
            <div 
              onClick={() => toggleSection('status')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                padding: '8px 0',
                borderBottom: '1px solid #f3f4f6'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Status</span>
                {getFilterCount('status') > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {getFilterCount('status')}
                  </span>
                )}
              </div>
              {expandedSection === 'status' ? 
                <ChevronDown size={16} /> : 
                <ChevronRight size={16} />
              }
            </div>
            
            {expandedSection === 'status' && (
              <div style={{ paddingTop: '12px' }}>
                {statuses.map(status => (
                  <label 
                    key={status}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={statusFilters.includes(status)}
                      onChange={() => handleStatusChange(status)}
                      style={{ marginRight: '8px' }}
                    />
                    {status}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* NEW: Alert Filter Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '8px 0',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Alert</span>
                {getFilterCount('alert') > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    ON
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ paddingTop: '12px' }}>
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '8px 12px',
                  backgroundColor: alertFilter ? '#fef2f2' : 'transparent',
                  borderRadius: '6px',
                  border: alertFilter ? '1px solid #fecaca' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={alertFilter}
                  onChange={handleAlertChange}
                  style={{ marginRight: '8px' }}
                />
                <AlertCircle size={16} style={{ marginRight: '8px', color: '#ef4444' }} />
                <span>Show only leads with alerts (3+ days)</span>
              </label>
              {alertFilter && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  paddingLeft: '12px'
                }}>
                  Sorted by highest alert days first
                </div>
              )}
            </div>
          </div>

          {/* Clear All Button */}
          <button
            onClick={onClearAll}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
            }}
          >
            Clear All Filters
          </button>

          {/* Active Filters Count */}
          {(counsellorFilters.length > 0 || stageFilters.length > 0 || statusFilters.length > 0 || alertFilter) && (
            <div style={{ 
              marginTop: '12px', 
              fontSize: '12px', 
              color: '#6b7280',
              textAlign: 'center'
            }}>
              {counsellorFilters.length + stageFilters.length + statusFilters.length + (alertFilter ? 1 : 0)} filter(s) active
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// UPDATED: Filter logic utility function with alert filter support
export const applyFilters = (leads, counsellorFilters, stageFilters, statusFilters = [], alertFilter = false, getStageDisplayName, getStageKeyFromName, getDaysSinceLastActivity) => {
  let filteredLeads = leads.filter(lead => {
    // If no filters selected, show all leads
    if (counsellorFilters.length === 0 && stageFilters.length === 0 && statusFilters.length === 0 && !alertFilter) {
      return true;
    }

    // Check counsellor filter (field_key aware)
    const counsellorMatch = counsellorFilters.length === 0 || 
                           counsellorFilters.includes(lead.counsellor);

    // Check stage filter with stage_key conversion
    let stageMatch = false;
    if (stageFilters.length === 0) {
      stageMatch = true;
    } else {
      // Lead stage could be stage_key or stage name, filters are stage names
      let leadStageName;
      
      if (getStageDisplayName) {
        // Try to get display name (in case lead.stage is stage_key)
        leadStageName = getStageDisplayName(lead.stage) || lead.stage;
      } else {
        // Fallback to direct comparison
        leadStageName = lead.stage;
      }
      
      stageMatch = stageFilters.includes(leadStageName);
    }

    // Check status filter
    const statusMatch = statusFilters.length === 0 ||
                       statusFilters.includes(lead.category);

    // NEW: Check alert filter
    let alertMatch = true;
    if (alertFilter && getDaysSinceLastActivity) {
      const daysSince = getDaysSinceLastActivity(lead.id);
      alertMatch = daysSince >= 3; // Only show leads with 3+ days since last activity
    }

    // Lead must match all filters (AND logic)
    return counsellorMatch && stageMatch && statusMatch && alertMatch;
  });

  // NEW: If alert filter is active, sort by days since last activity (descending)
  if (alertFilter && getDaysSinceLastActivity) {
    filteredLeads = filteredLeads.sort((a, b) => {
      const aDays = getDaysSinceLastActivity(a.id);
      const bDays = getDaysSinceLastActivity(b.id);
      return bDays - aDays; // Descending order (highest days first)
    });
  }

  return filteredLeads;
};

// UPDATED: FilterButton component with alert filter support
export const FilterButton = ({ 
  showFilter, 
  setShowFilter, 
  counsellorFilters, 
  stageFilters, 
  statusFilters = [],
  alertFilter = false, // NEW: Alert filter
  setCounsellorFilters, 
  setStageFilters,
  setStatusFilters,
  setAlertFilter, // NEW: Alert filter setter
  settingsData, // Receive settings data
  getFieldLabel, // NEW: Receive getFieldLabel function
  getStageKeyFromName, // NEW: Stage conversion function
  getStageDisplayName // NEW: Stage conversion function
}) => (
  <div style={{ position: 'relative' }}>
    <button 
      className="filter-btn"
      onClick={() => setShowFilter(!showFilter)}
      style={{ position: 'relative' }}
    >
      <Filter size={16} />
      Filter
      {/* Active indicator */}
      {(counsellorFilters.length > 0 || stageFilters.length > 0 || statusFilters.length > 0 || alertFilter) && (
        <span style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '8px',
          height: '8px',
          backgroundColor: '#ef4444',
          borderRadius: '50%'
        }}></span>
      )}
    </button>

    <FilterDropdown
      isOpen={showFilter}
      onClose={() => setShowFilter(false)}
      counsellorFilters={counsellorFilters}
      stageFilters={stageFilters}
      statusFilters={statusFilters}
      alertFilter={alertFilter} // NEW: Pass alert filter
      setCounsellorFilters={setCounsellorFilters}
      setStageFilters={setStageFilters}
      setStatusFilters={setStatusFilters}
      setAlertFilter={setAlertFilter} // NEW: Pass alert filter setter
      settingsData={settingsData}
      getFieldLabel={getFieldLabel} // NEW: Pass getFieldLabel
      getStageKeyFromName={getStageKeyFromName} // NEW: Pass stage conversion
      getStageDisplayName={getStageDisplayName} // NEW: Pass stage conversion
      onClearAll={() => {
        setCounsellorFilters([]);
        setStageFilters([]);
        setStatusFilters([]);
        setAlertFilter(false); // NEW: Clear alert filter
      }}
    />
  </div>
);

// Export FilterDropdown as both default and named export
export { FilterDropdown };
export default FilterDropdown;