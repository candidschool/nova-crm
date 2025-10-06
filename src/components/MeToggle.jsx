import React from 'react';

const MeToggle = ({ 
  showMyLeads, 
  setShowMyLeads, 
  user, 
  leadsData = [] 
}) => {
  const myLeadsCount = leadsData.filter(lead => lead.counsellor === user?.full_name).length;

  return (
    <button 
      className={`me-toggle-btn ${showMyLeads ? 'active' : ''}`}
      onClick={() => setShowMyLeads(!showMyLeads)}
      style={{
        marginLeft: '16px',
        padding: '8px 16px',
        background: showMyLeads ? '#3b82f6' : 'transparent',
        color: showMyLeads ? 'white' : '#64748b',
        border: showMyLeads ? '1px solid #3b82f6' : '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        fontFamily: 'Inter, sans-serif'
      }}
      onMouseEnter={(e) => {
        if (!showMyLeads) {
          e.target.style.borderColor = '#cbd5e1';
          e.target.style.color = '#475569';
        }
      }}
      onMouseLeave={(e) => {
        if (!showMyLeads) {
          e.target.style.borderColor = '#e2e8f0';
          e.target.style.color = '#64748b';
        }
      }}
      title={showMyLeads ? `Hide my leads (${myLeadsCount})` : `Show my leads (${myLeadsCount})`}
    >
      {showMyLeads ? '✓' : ''} Me
      {showMyLeads && myLeadsCount > 0 && (
        <span style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '2px 6px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {myLeadsCount}
        </span>
      )}
    </button>
  );
};

export default MeToggle;